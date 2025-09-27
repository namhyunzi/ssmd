import { NextRequest, NextResponse } from 'next/server'
import { ref, set, get, query, orderByChild, equalTo } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'
import { verifyDelegateJWT } from '@/lib/jwt-utils'

//  뷰어 세션 설정
const VIEWER_CONFIG = {
  default_ttl_hours: 12,
  extendable: true,
  max_extensions: 2
}

// 세션 ID 생성
function generateSessionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `session_${timestamp}_${random}`
}

// 세션 만료 확인
function isExpired(session: any): boolean {
  return new Date() > new Date(session.expiresAt)
}

// 기존 유효한 세션 조회
async function findExistingSession(shopId: string, mallId: string, fields: string[]): Promise<any | null> {
  try {
    const sessionsRef = ref(realtimeDb, 'viewer-sessions')
    const sessionsSnapshot = await get(sessionsRef)
    
    if (!sessionsSnapshot.exists()) {
      return null
    }
    
    const sessions = sessionsSnapshot.val()
    
    // shopId, mallId, requiredFields가 동일한 세션 찾기
    for (const [sessionId, sessionData] of Object.entries(sessions)) {
      const session = sessionData as any
      if (session.shopId === shopId && 
          session.mallId === mallId && 
          JSON.stringify(session.requiredFields.sort()) === JSON.stringify(fields.sort()) &&
          !isExpired(session)) {
        return session
      }
    }
    
    return null
  } catch (error) {
    console.error('기존 세션 조회 오류:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 헤더에서 JWT 추출
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization 헤더가 필요합니다.' },
        { status: 401 }
      )
    }
    
    const jwt = authHeader.substring(7) // "Bearer " 제거
    
    // 2. body에서 데이터 추출
    const { requiredFields, viewerType } = await request.json()
    
    // 3. JWT 검증 (우리가 발급한 delegate JWT인지 확인)
    const publicKey = process.env.SSDM_PUBLIC_KEY
    if (!publicKey) {
      throw new Error('SSDM_PUBLIC_KEY가 설정되지 않았습니다.')
    }
    
    const { shopId, mallId, fields } = await verifyDelegateJWT(jwt, publicKey)
    
    // 4. 요청 필드가 JWT의 fields와 일치하는지 확인
    const jwtFields = fields || []
    const requestedFields = requiredFields || []
    
    // JWT에 명시된 필드만 요청할 수 있는지 확인
    const isValidFields = requestedFields.every((field: string) => jwtFields.includes(field))
    if (!isValidFields) {
      return NextResponse.json(
        { error: '요청한 필드가 허용되지 않았습니다.' },
        { status: 403 }
      )
    }
    
    // 5. 세션 ID 생성 (항상 새로운 세션 생성)
    const sessionId = generateSessionId()
    
    // 6. 만료시간 계산
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + VIEWER_CONFIG.default_ttl_hours)
    
    // 7. Firebase에 세션 저장
    const sessionData = {
      sessionId,
      shopId,
      mallId,
      requiredFields: requestedFields,
      viewerType,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      extensions: 0,
      maxExtensions: VIEWER_CONFIG.max_extensions
    }
    
    const sessionRef = ref(realtimeDb, `viewer-sessions/${sessionId}`)
    await set(sessionRef, sessionData)
    
    // 8. 응답
    return NextResponse.json({
      success: true,
      viewerUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/secure-viewer?sessionId=${sessionId}`,
      sessionId,
      expiresAt: expiresAt.toISOString()
    })
    
  } catch (error) {
    // JWT 만료 오류 구분
    if (error.message && error.message.includes('jwt expired')) {
      return NextResponse.json(
        { error: 'JWT 토큰이 만료되었습니다. 새로운 토큰을 발급받아주세요.' },
        { status: 401 }
      )
    }
    
    // 기타 오류
    return NextResponse.json(
      { error: '뷰어 세션 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

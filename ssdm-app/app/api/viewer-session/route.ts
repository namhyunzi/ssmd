import { NextRequest, NextResponse } from 'next/server'
import { ref, set } from 'firebase/database'
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
    
    // 5. 세션 ID 생성
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
    return NextResponse.json(
      { error: '뷰어 세션 생성 중 오류 발생' },
      { status: 500 }
    )
  }
}

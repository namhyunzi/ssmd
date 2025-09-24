import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { realtimeDb } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

export async function POST(request: NextRequest) {
  try {
    console.log('팝업 응답용 JWT 발급 API 호출됨')
    const body = await request.json()
    const { shopId, mallId } = body

    if (!shopId || !mallId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Firebase에서 동의 상태 확인 
    const mappingsRef = ref(realtimeDb, `userMappings/${mallId}`)
    const mappingsSnapshot = await get(mappingsRef)
    
    if (!mappingsSnapshot.exists()) {
      return NextResponse.json(
        { error: '사용자 매핑 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const mappings = mappingsSnapshot.val()
    let targetMapping = null
    
    for (const [firebaseUid, userMappings] of Object.entries(mappings)) {
      if ((userMappings as any)[shopId]) {
        targetMapping = (userMappings as any)[shopId]
        break
      }
    }
    
    if (!targetMapping) {
      return NextResponse.json(
        { error: '사용자 매핑 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const uid = targetMapping.mappedUid
    
    // 동의 상태 확인
    const consentRef = ref(realtimeDb, `mallServiceConsents/${uid}/${mallId}/${shopId}`)
    const consentSnapshot = await get(consentRef)
    
    if (!consentSnapshot.exists()) {
      return NextResponse.json(
        { error: '쇼핑몰 서비스 동의가 필요합니다.' },
        { status: 403 }
      )
    }

    const consentData = consentSnapshot.val()
    
    // isActive 확인
    const expiresAt = new Date(consentData.expiresAt)
    const now = new Date()
    if ((consentData.isActive === false) || (now > expiresAt)) {
      return NextResponse.json(
        { error: '개인정보 제공 동의가 비활성화되었거나 만료되었습니다.' },
        { status: 403 }
      )
    }

    // JWT 페이로드 구성 (팝업 응답용)
    const jwtPayload = {
      shopId: shopId,
      mallId: mallId,
      consentType: consentData.consentType,
      agreed: true,
      purpose: "popup_response",
      timestamp: new Date().toISOString(),
      exp: Math.floor(Date.now() / 1000) + (15 * 60)
    }

    const apiKey = process.env.PRIVACY_SYSTEM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PRIVACY_SYSTEM_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const token = jwt.sign(jwtPayload, apiKey, { algorithm: 'HS256' })

    console.log('팝업 응답용 JWT 발급 성공:', {
      shopId: shopId,
      mallId: mallId,
      consentType: consentData.consentType,
      tokenLength: token.length
    })

    return NextResponse.json({
      jwt: token,
      expiresIn: '15m',
      consentType: consentData.consentType,
      purpose: "popup_response"
    })

  } catch (error) {
    console.error('팝업 응답용 JWT 발급 실패:', error)
    return NextResponse.json(
      { error: 'JWT 발급 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

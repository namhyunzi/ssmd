import { NextRequest, NextResponse } from 'next/server'
import { realtimeDb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { jwt: jwtToken } = await request.json()
    
    if (!jwtToken) {
      return NextResponse.json(
        { error: 'JWT 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    // 환경변수 API Key로 JWT 검증
    const apiKey = process.env.PRIVACY_SYSTEM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // JWT 검증 및 shopId, mallId 추출
    const decoded = jwt.verify(jwtToken, apiKey, { algorithms: ['HS256'] }) as any
    const { shopId, mallId } = decoded

    // 현재 로그인한 사용자의 uid 사용
    const { auth } = await import('@/lib/firebase')
    const currentUser = auth.currentUser

    if (!currentUser) {
      return NextResponse.json({ status: 'need_connect' })
    }

    const uid = currentUser.uid

    // 바로 동의 상태 확인
    const consentRef = ref(realtimeDb, `mallServiceConsents/${uid}/${mallId}/${shopId}`)
    const consentSnapshot = await get(consentRef)
    
    if (!consentSnapshot.exists()) {
      return NextResponse.json({ status: 'need_connect' })
    }
    
    const consentData = consentSnapshot.val()
    
    // isActive와 expiresAt 확인 (OR 조건)
    const expiresAt = new Date(consentData.expiresAt)
    const now = new Date()
    if ((consentData.isActive === false) || (now > expiresAt)) {
      return NextResponse.json({ status: 'need_connect' })
    }

    // 상황별 응답
    if (consentData.consentType === 'always') {
      // 1번: 항상 허용 + 유효함
      return NextResponse.json({
        status: 'connected',
        consentType: 'always'
      })
    } else if (consentData.consentType === 'once') {
      // 2번: 일회성 동의 + 유효함
      return NextResponse.json({
        status: 'connected',
        consentType: 'once',
        expiresAt: consentData.expiresAt
      })
    } else {
      // 3번: 동의 없음/만료됨
      return NextResponse.json({ status: 'need_connect' })
    }

  } catch (error) {
    console.error('동의 상태 확인 실패:', error)
    return NextResponse.json(
      { error: '동의 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

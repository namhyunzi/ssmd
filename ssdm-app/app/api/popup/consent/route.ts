import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

/**
 * 팝업 연결용 JWT 검증 API
 * POST /api/popup/consent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jwt: token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'JWT 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    try {
      // 환경변수의 API Key로 JWT 검증
      const apiKey = process.env.PRIVACY_SYSTEM_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'PRIVACY_SYSTEM_API_KEY가 설정되지 않았습니다.' },
          { status: 500 }
        )
      }
      console.log('환경변수 API Key 사용:', apiKey ? '존재함' : '없음')
      
      // API Key로 JWT 검증
      const decoded = jwt.verify(token, apiKey, { algorithms: ['HS256'] }) as any
      console.log('JWT 검증 성공:', decoded)
      
      // JWT에서 정보 추출
      const { shopId, mallId } = decoded

      return NextResponse.json({
        valid: true,
        payload: {
          shopId: shopId,
          mallId: mallId
        },
        message: 'JWT 검증이 완료되었습니다.'
      })
      
    } catch (jwtError) {
      return NextResponse.json(
        { error: '유효하지 않은 JWT 토큰입니다.' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('팝업 연결 JWT 검증 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


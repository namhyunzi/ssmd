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
      // JWT에서 공개키 추출 (먼저 디코딩)
      const decodedWithoutVerify = jwt.decode(token) as any
      if (!decodedWithoutVerify || !decodedWithoutVerify.publicKey) {
        return NextResponse.json(
          { error: 'JWT에 공개키가 포함되지 않았습니다.' },
          { status: 400 }
        )
      }
      
      // 공개키 정리 (이스케이프된 개행 문자를 실제 개행 문자로 변환)
      const cleanPublicKey = decodedWithoutVerify.publicKey.replace(/\\n/g, '\n')
      
      // 공개키로 JWT 검증
      const decoded = jwt.verify(token, cleanPublicKey) as any
      
      // JWT에서 정보 추출
      const { shopId, mallId, apiKey } = decoded

      return NextResponse.json({
        valid: true,
        payload: {
          shopId: shopId,
          mallId: mallId,
          apiKey: apiKey
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

/**
 * CORS 처리
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

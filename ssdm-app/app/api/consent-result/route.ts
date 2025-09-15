import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      shopId, 
      mallId, 
      agreed, 
      consentType, 
      jwt, 
      timestamp,
      callbackUrl // 쇼핑몰에서 받을 콜백 URL
    } = body

    if (!shopId || !mallId || !callbackUrl) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다. (shopId, mallId, callbackUrl 필요)' },
        { status: 400 }
      )
    }

    // 쇼핑몰의 콜백 URL로 동의 결과 전달
    const consentResult = {
      shopId,
      mallId,
      agreed,
      consentType,
      jwt,
      timestamp,
      status: 'completed'
    }

    try {
      // 쇼핑몰에 POST 요청으로 결과 전달
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consentResult)
      })

      if (response.ok) {
        return NextResponse.json({ 
          success: true, 
          message: '동의 결과가 쇼핑몰에 전달되었습니다.' 
        })
      } else {
        console.error('쇼핑몰 콜백 실패:', response.status, response.statusText)
        return NextResponse.json({ 
          success: false, 
          error: '쇼핑몰 콜백 실패' 
        }, { status: 500 })
      }
    } catch (error) {
      console.error('쇼핑몰 콜백 에러:', error)
      return NextResponse.json({ 
        success: false, 
        error: '쇼핑몰 콜백 에러' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API 에러:', error)
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    )
  }
}

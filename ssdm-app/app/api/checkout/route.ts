import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // CORS 설정
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    const checkoutData = await request.json()
    
    // 전역 변수에 저장 (또는 데이터베이스에 저장)
    global.checkoutData = checkoutData
    
    console.log('Checkout 데이터 수신:', checkoutData)
    
    return NextResponse.json({
      success: true,
      message: '데이터가 성공적으로 전달되었습니다'
    }, { 
      status: 200,
      headers 
    })

  } catch (error) {
    console.error('Checkout API 오류:', error)
    return NextResponse.json({
      success: false,
      message: '데이터 처리 중 오류가 발생했습니다'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

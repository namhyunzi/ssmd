import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'JWT 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    // JWT 검증
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'JWT_SECRET이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any
      
      // JWT에서 정보 추출
      const { shopId, mallId, exp } = decoded
      
      // 만료시간 확인
      if (exp && exp < Date.now() / 1000) {
        return NextResponse.json(
          { error: 'JWT 토큰이 만료되었습니다.' },
          { status: 401 }
        )
      }
      
      // 필수 필드 확인
      if (!shopId || !mallId) {
        return NextResponse.json(
          { error: 'JWT 토큰에 필수 정보가 누락되었습니다.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json({
        valid: true,
        payload: {
          shopId,
          mallId
        }
      })
      
    } catch (jwtError) {
      console.error('JWT 검증 실패:', jwtError)
      return NextResponse.json(
        { error: '유효하지 않은 JWT 토큰입니다.' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('JWT 검증 실패:', error)
    return NextResponse.json(
      { error: 'JWT 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

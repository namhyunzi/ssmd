import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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

    // JWT 검증
    const apiKey = process.env.PRIVACY_SYSTEM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PRIVACY_SYSTEM_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }
    
    try {
      const decoded = jwt.verify(token, apiKey, { algorithms: ['HS256'] }) as any
      
      // JWT에서 사용자 정보 추출
      const { userId, mallId, apiKey, consentType } = decoded
      
      // Firebase에서 개인정보 조회
      const { getUserProfile } = require('@/lib/data-storage')
      const { auth } = require('@/lib/firebase')
      
      // userId로 사용자 찾기 (Firebase Auth UID 사용)
      const user = { uid: userId } // JWT에서 받은 userId를 사용
      const profileData = await getUserProfile(user)
      
      if (!profileData) {
        return NextResponse.json(
          { error: '개인정보를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      // 필요한 개인정보만 반환
      const personalInfo = {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        detailAddress: profileData.detailAddress,
        zipCode: profileData.zipCode,
        email: profileData.email
      }
      
      return NextResponse.json({
        valid: true,
        personalInfo: personalInfo,
        consentType: consentType,
        userId: userId,
        mallId: mallId
      })
      
    } catch (jwtError) {
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




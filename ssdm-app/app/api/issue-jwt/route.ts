import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopId, mallId } = body

    if (!shopId || !mallId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Firebase에서 "항상 허용" 상태 확인
    const { getDatabase, ref, get } = await import('firebase/database')
    const db = getDatabase()
    
    // shopId로 매핑된 uid 찾기
    const mappingRef = ref(db, `userMappings/${mallId}/${shopId}`)
    const mappingSnapshot = await get(mappingRef)
    
    if (!mappingSnapshot.exists()) {
      return NextResponse.json(
        { error: '사용자 매핑 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const uid = mappingSnapshot.val().uid
    
    // 사용자 동의 상태 확인
    const consentRef = ref(db, `userConsents/${uid}/${mallId}`)
    const consentSnapshot = await get(consentRef)
    
    if (!consentSnapshot.exists()) {
      return NextResponse.json(
        { error: '개인정보 제공 동의가 필요합니다.' },
        { status: 403 }
      )
    }

    const consentData = consentSnapshot.val()
    const isAlwaysAllow = consentData.consentType === 'always'
    
    if (isAlwaysAllow) {
      // 6개월 경과 여부 확인
      const consentDate = new Date(consentData.timestamp)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
      const isExpired = consentDate < sixMonthsAgo
      
      if (isExpired) {
        return NextResponse.json(
          { error: '개인정보 제공 동의가 만료되었습니다. 다시 동의해주세요.' },
          { status: 403 }
        )
      }
    }

    // JWT 발급
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'JWT_SECRET이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }
    const jwtPayload = {
      shopId: shopId,
      mallId: mallId,
      consentType: consentData.consentType,
      timestamp: new Date().toISOString()
    }

    const token = jwt.sign(jwtPayload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    })

    // JWT 발급 기록 저장 (선택사항)
    const jwtRecordRef = ref(db, `jwtRecords/${uid}/${mallId}`)
    await import('firebase/database').then(({ set }) => {
      set(jwtRecordRef, {
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        consentType: consentData.consentType
      })
    })

    return NextResponse.json({
      jwt: token,
      expiresIn: '15m',
      consentType: consentData.consentType
    })

  } catch (error) {
    console.error('JWT 발급 실패:', error)
    return NextResponse.json(
      { error: 'JWT 발급 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
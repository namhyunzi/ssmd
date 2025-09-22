import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { realtimeDb } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

export async function POST(request: NextRequest) {
  try {
    console.log('JWT 발급 API 호출됨')
    const body = await request.json()
    console.log('요청 본문:', body)
    const { shopId, mallId } = body

    if (!shopId || !mallId) {
      console.log('필수 파라미터 누락:', { shopId, mallId })
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Firebase에서 "항상 허용" 상태 확인
    console.log('Firebase 연결 시작')
    console.log('Firebase DB 연결 완료')
    
    // shopId로 매핑된 uid 찾기 (새로운 구조)
    const { auth } = await import('@/lib/firebase')
    if (!auth.currentUser) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const firebaseUid = auth.currentUser.uid
    const mappingRef = ref(realtimeDb, `userMappings/${mallId}/${firebaseUid}/${shopId}`)
    console.log('매핑 참조 경로:', `userMappings/${mallId}/${firebaseUid}/${shopId}`)
    let mappingSnapshot
    try {
      mappingSnapshot = await get(mappingRef)
      console.log('매핑 스냅샷 존재 여부:', mappingSnapshot.exists())
    } catch (mappingError) {
      console.error('매핑 정보 조회 오류:', mappingError)
      throw mappingError
    }
    
    if (!mappingSnapshot.exists()) {
      console.log('사용자 매핑 정보 없음')
      return NextResponse.json(
        { error: '사용자 매핑 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const uid = mappingSnapshot.val().mappedUid
    console.log('찾은 UID:', uid)
    
    // 사용자 동의 상태 확인 (올바른 구조: uid/mallId/shopId)
    const consentRef = ref(realtimeDb, `mallServiceConsents/${uid}/${mallId}/${shopId}`)
    console.log('동의 참조 경로:', `mallServiceConsents/${uid}/${mallId}/${shopId}`)
    console.log('Firebase 연결 상태 확인 중...')
    
    let consentSnapshot
    try {
      console.log('동의 정보 조회 시작...')
      consentSnapshot = await get(consentRef)
      console.log('동의 스냅샷 존재 여부:', consentSnapshot.exists())
      console.log('동의 스냅샷 데이터:', consentSnapshot.val())
    } catch (consentError: any) {
      console.error('동의 정보 조회 오류:', consentError)
      console.error('오류 상세:', consentError.message)
      console.error('오류 코드:', consentError.code)
      throw consentError
    }
    
    if (!consentSnapshot.exists()) {
      console.log('쇼핑몰 서비스 동의 없음')
      return NextResponse.json(
        { error: '쇼핑몰 서비스 동의가 필요합니다.' },
        { status: 403 }
      )
    }

    const consentData = consentSnapshot.val()
    console.log('동의 데이터:', consentData)
    
    // isActive가 true인지 확인
        const expiresAt = new Date(consentData.expiresAt)
        const now = new Date()
        if ((consentData.isActive === false) || (now > expiresAt)) {
          console.log('동의가 비활성화되거나 만료됨')
          return NextResponse.json(
            { error: '개인정보 제공 동의가 비활성화되었거나 만료되었습니다.' },
            { status: 403 }
          )
        }
    
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
    
    // isActive가 true이면 once든 always든 JWT 발급 허용
    console.log('동의 타입:', consentData.consentType, 'isActive:', consentData.isActive, 'JWT 발급 진행')

    // JWT 발급
    console.log('JWT 발급 시작')
    const apiKey = process.env.PRIVACY_SYSTEM_API_KEY
    console.log('API Key 존재 여부:', !!apiKey)
    if (!apiKey) {
      console.log('API Key 없음')
      return NextResponse.json(
        { error: 'PRIVACY_SYSTEM_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }
    const jwtPayload = {
      shopId: shopId,
      mallId: mallId,
      consentType: consentData.consentType,
      purpose: "delivery", // 택배사용 JWT
      timestamp: new Date().toISOString(),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15분 후 만료
    }

    const token = jwt.sign(jwtPayload, apiKey, {
      algorithm: 'HS256'
    })

    console.log('JWT 발급 성공:', {
      shopId,
      mallId,
      uid,
      consentType: consentData.consentType,
      tokenLength: token.length,
      expiresAt: new Date((jwtPayload.exp) * 1000).toISOString()
    })

    // JWT 발급 기록 저장 (선택사항)
    const jwtRecordRef = ref(realtimeDb, `jwtRecords/${uid}/${mallId}`)
    await set(jwtRecordRef, {
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      consentType: consentData.consentType
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
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const mallId = searchParams.get('mallId')

    if (!shopId || !mallId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Firebase에서 "항상 허용" 상태 확인
    const { getDatabase, ref, get } = await import('firebase/database')
    const db = getDatabase()
    
    // 사용자 동의 상태 확인
    const consentRef = ref(db, `userConsents/${shopId}/${mallId}`)
    const consentSnapshot = await get(consentRef)
    
    let isAlwaysAllow = false
    let isExpired = false
    
    if (consentSnapshot.exists()) {
      const consentData = consentSnapshot.val()
      isAlwaysAllow = consentData.consentType === 'always'
      
      if (isAlwaysAllow) {
        // 6개월 경과 여부 확인
        const consentDate = new Date(consentData.timestamp)
        const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
        isExpired = consentDate < sixMonthsAgo
      }
    }

    // 분기 처리
    if (isAlwaysAllow && !isExpired) {
      // "항상 허용" 사용자 → 바로 연결 완료 처리 (화면 없이)
      return NextResponse.json({
        status: 'connected',
        message: '개인정보가 연결되었습니다.',
        consentType: 'always'
      })
    } else {
      // 일반 사용자 또는 만료된 사용자 → 개인정보제공동의 화면으로 리다이렉션
      const consentUrl = `/consent?shopId=${encodeURIComponent(shopId)}&mallId=${encodeURIComponent(mallId)}`
      return NextResponse.redirect(new URL(consentUrl, request.url))
    }

  } catch (error) {
    console.error('개인정보 연결 처리 실패:', error)
    return NextResponse.json(
      { error: '개인정보 연결 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

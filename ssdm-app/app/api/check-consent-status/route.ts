import { NextRequest, NextResponse } from 'next/server'
import { realtimeDb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const jwtToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
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

    // userMappings 전체 조회로 shopId로 매핑 찾기
    const mappingsRef = ref(realtimeDb, `userMappings/${mallId}`)
    console.log('매핑 참조 경로:', `userMappings/${mallId}`)
    
    let mappingsSnapshot
    try {
      mappingsSnapshot = await get(mappingsRef)
      console.log('매핑 스냅샷 존재 여부:', mappingsSnapshot.exists())
    } catch (mappingError) {
      console.error('매핑 정보 조회 오류:', mappingError)
      return NextResponse.json(
        { error: '매핑 정보 조회 중 오류가 발생했습니다.' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }
    
    if (!mappingsSnapshot.exists()) {
      console.log('사용자 매핑 정보 없음 - need_connect 반환')
      return NextResponse.json(
        { status: 'need_connect' },
        {
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }
    
    const mappings = mappingsSnapshot.val()
    let targetMapping = null
    
    // shopId로 매핑 찾기
    for (const [firebaseUid, userMappings] of Object.entries(mappings)) {
      if (userMappings && typeof userMappings === 'object' && shopId in userMappings) {
        targetMapping = (userMappings as any)[shopId]
        break
      }
    }
    
    if (!targetMapping) {
      console.log('사용자 매핑 정보 없음 - need_connect 반환')
      return NextResponse.json(
        { status: 'need_connect' },
        {
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }
    
    const mappedUid = targetMapping.mappedUid
    console.log('찾은 mappedUid:', mappedUid)

    // 바로 동의 상태 확인
    const consentRef = ref(realtimeDb, `mallServiceConsents/${mappedUid}/${mallId}/${shopId}`)
    console.log('동의 참조 경로:', `mallServiceConsents/${mappedUid}/${mallId}/${shopId}`)
    const consentSnapshot = await get(consentRef)
    console.log('동의 스냅샷 존재 여부:', consentSnapshot.exists())
    
    if (!consentSnapshot.exists()) {
      return NextResponse.json(
        { status: 'need_connect' },
        {
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }
    
    const consentData = consentSnapshot.val()
    console.log('동의 데이터:', consentData)
    
    // isActive와 expiresAt 확인 (OR 조건)
    const expiresAt = new Date(consentData.expiresAt)
    const now = new Date()
    console.log('isActive:', consentData.isActive)
    console.log('expiresAt:', consentData.expiresAt)
    console.log('현재 시간:', now.toISOString())
    console.log('만료 시간:', expiresAt.toISOString())
    console.log('현재 > 만료:', now > expiresAt)
    
    if ((consentData.isActive === false) || (now > expiresAt)) {
      console.log('동의 조건 실패 - need_connect 반환')
      return NextResponse.json(
        { status: 'need_connect' },
        {
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }

    // 상황별 응답
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    console.log('consentType:', consentData.consentType)
    
    if (consentData.consentType === 'always') {
      // 1번: 항상 허용 + 유효함
      console.log('항상 허용 - connected 반환')
      return NextResponse.json({
        status: 'connected',
        consentType: 'always',
        isActive: consentData.isActive
      }, { headers: corsHeaders })
    } else if (consentData.consentType === 'once') {
      // 2번: 일회성 동의 - 무조건 need_connect
      console.log('일회성 동의 - need_connect 반환')
      return NextResponse.json(
        { status: 'need_connect' },
        { headers: corsHeaders }
      )
    } else {
      // 3번: 동의 없음/만료됨
      console.log('동의 타입 불일치 - need_connect 반환')
      return NextResponse.json(
        { status: 'need_connect' },
        { headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('동의 상태 확인 실패:', error)
    return NextResponse.json(
      { error: '동의 상태 확인 중 오류가 발생했습니다.' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
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

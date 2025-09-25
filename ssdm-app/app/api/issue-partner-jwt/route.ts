import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { realtimeDb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'
import { generateDelegateJWT } from '@/lib/jwt-utils'

export async function POST(request: NextRequest) {
  try {
    console.log('제휴사용 JWT 발급 API 호출됨')
    const jwtToken = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!jwtToken) {
      return NextResponse.json(
        { error: 'JWT 토큰이 필요합니다.' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }

    // 환경변수 API Key로 JWT 검증
    const apiKey = process.env.PRIVACY_SYSTEM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PRIVACY_SYSTEM_API_KEY가 설정되지 않았습니다.' },
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

    // JWT 검증 및 shopId, mallId 추출
    const decoded = jwt.verify(jwtToken, apiKey, { algorithms: ['HS256'] }) as any
    const { shopId, mallId } = decoded

    // Firebase에서 동의 상태 확인 (기존 issue-jwt와 동일한 로직)
    const mappingsRef = ref(realtimeDb, `userMappings/${mallId}`)
    const mappingsSnapshot = await get(mappingsRef)
    
    if (!mappingsSnapshot.exists()) {
      return NextResponse.json(
        { error: '사용자 매핑 정보를 찾을 수 없습니다.' },
        { 
          status: 404,
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
    
    for (const [firebaseUid, userMappings] of Object.entries(mappings)) {
      if ((userMappings as any)[shopId]) {
        targetMapping = (userMappings as any)[shopId]
        break
      }
    }
    
    if (!targetMapping) {
      return NextResponse.json(
        { error: '사용자 매핑 정보를 찾을 수 없습니다.' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }
    
    const uid = targetMapping.mappedUid
    
    // 동의 상태 확인
    const consentRef = ref(realtimeDb, `mallServiceConsents/${uid}/${mallId}/${shopId}`)
    const consentSnapshot = await get(consentRef)
    
    if (!consentSnapshot.exists()) {
      return NextResponse.json(
        { error: '쇼핑몰 서비스 동의가 필요합니다.' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }

    const consentData = consentSnapshot.val()
    
    // isActive 확인
    const expiresAt = new Date(consentData.expiresAt)
    const now = new Date()
    if ((consentData.isActive === false) || (now > expiresAt)) {
      return NextResponse.json(
        { error: '개인정보 제공 동의가 비활성화되었거나 만료되었습니다.' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }

    // Firebase에서 몰의 허용된 필드 조회
    const mallRef = ref(realtimeDb, `malls/${mallId}`)
    const mallSnapshot = await get(mallRef)
    
    if (!mallSnapshot.exists()) {
      return NextResponse.json(
        { error: '제휴사 정보를 찾을 수 없습니다.' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      )
    }
    
    const mallData = mallSnapshot.val()
    const allowedFields = mallData.allowedFields

    // 1. 권한위임사(탹뱌사용) JWT 생성
    const delegateJWT = generateDelegateJWT(shopId, mallId, allowedFields)

    // 2. 제휴사용(쇼핑몰) JWT 페이로드에 택배사용 JWT 포함
    const jwtPayload = {
      shopId: shopId,
      mallId: mallId,
      purpose: "third_party_access",
      delegateJwt: delegateJWT, // 택배사용 JWT 포함
      timestamp: new Date().toISOString(),
      exp: Math.floor(Date.now() / 1000) + (15 * 60)
    }

    const partnerJWT = jwt.sign(jwtPayload, apiKey, { algorithm: 'HS256' })

    console.log('제휴사용 JWT 발급 성공:', {
      shopId: shopId,
      mallId: mallId,
      consentType: consentData.consentType,
      tokenLength: partnerJWT.length
    })

    return NextResponse.json({}, {
      headers: {
        'Authorization': `Bearer ${partnerJWT}`,
        'Access-Control-Allow-Origin': 'https://morebooks.vercel.app',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'Authorization'
      }
    })

  } catch (error) {
    console.error('제휴사용 JWT 발급 실패:', error)
    return NextResponse.json(
      { error: 'JWT 발급 중 오류가 발생했습니다.' },
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Authorization'
    }
  })
}

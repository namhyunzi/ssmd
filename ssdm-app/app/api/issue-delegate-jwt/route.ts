import { NextRequest, NextResponse } from 'next/server'
import { generateDelegateJWT } from '@/lib/jwt-utils'
import { realtimeDb } from '@/lib/firebase'
import { ref, get } from 'firebase/database'

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

    // Firebase에서 몰의 허용된 필드 조회
    const mallRef = ref(realtimeDb, `malls/${mallId}`)
    const mallSnapshot = await get(mallRef)
    
    if (!mallSnapshot.exists()) {
      return NextResponse.json(
        { error: '회원사 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const mallData = mallSnapshot.val()
    const allowedFields = mallData.allowedFields

    const delegateJWT = generateDelegateJWT(shopId, mallId, allowedFields)

    return NextResponse.json({
      jwt: delegateJWT,
      purpose: 'delivery'
    })

  } catch (error) {
    console.error('택배사용 JWT 발급 실패:', error)
    return NextResponse.json(
      { error: 'JWT 발급 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

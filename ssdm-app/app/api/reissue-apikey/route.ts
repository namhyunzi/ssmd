import { NextRequest, NextResponse } from 'next/server'
import { ref, get, set, remove } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'

interface ReissueRequest {
  mallId: string  // englishId와 동일
  contactEmail?: string
  description?: string
  allowedFields?: string[]
}

// API Key 생성 함수 (영문 식별자 사용)
function generateApiKey(englishId: string): string {
  // Web Crypto API를 사용 (128bit = 16bytes)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const randomString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${englishId}-${randomString}`;
}

/**
 * API Key 재발급 API
 * POST /api/reissue-apikey
 */
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminKey = request.headers.get('X-Admin-Key');
    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'admin_secret_key_12345';
    
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { mallId, contactEmail, description, allowedFields }: ReissueRequest = await request.json();

    // 입력값 검증
    if (!mallId) {
      return NextResponse.json(
        { error: 'mallId는 필수입니다.' },
        { status: 400 }
      );
    }

    // 기존 쇼핑몰 데이터 조회 (mallId가 이제 englishId)
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const mallSnapshot = await get(mallRef);
    
    if (!mallSnapshot.exists()) {
      return NextResponse.json(
        { error: '존재하지 않는 쇼핑몰입니다.' },
        { status: 404 }
      );
    }

    const mallData = mallSnapshot.val();
    
    // 기존 API Key 비활성화 (삭제하지 않고 비활성화)
    if (mallData.apiKey) {
      const oldApiKeyRef = ref(realtimeDb, `apiKeys/${mallData.apiKey}`);
      await set(oldApiKeyRef, {
        mallId,
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        reason: 'reissued'
      });
    }

    // 새 API Key 생성
    const newApiKey = generateApiKey(mallId);
    
    // 새 만료일 설정 (1년 후)
    const newExpiresAt = new Date();
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
    const newExpiresAtISO = newExpiresAt.toISOString();

    // 쇼핑몰 데이터 업데이트 (선택적 필드 포함)
    const updatedMallData = {
      ...mallData,
      apiKey: newApiKey,
      expiresAt: newExpiresAtISO,
      emailSent: false, // 재발급 시 이메일 발송 상태 초기화
      updatedAt: new Date().toISOString(),
      // 선택적 업데이트
      ...(contactEmail !== undefined && { contactEmail }),
      ...(description !== undefined && { description }),
      ...(allowedFields !== undefined && { allowedFields })
    };

    await set(mallRef, updatedMallData);

    // 새 API Key 인덱스 저장
    const newApiKeyRef = ref(realtimeDb, `apiKeys/${newApiKey}`);
    await set(newApiKeyRef, {
      mallId,
      isActive: true,
      createdAt: new Date().toISOString()
    });

    console.log(`API Key 재발급 성공: ${mallId} (${mallData.mallName})`);

    return NextResponse.json({
      apiKey: newApiKey,
      expiresAt: newExpiresAtISO,
      message: 'API Key가 성공적으로 재발급되었습니다.'
    });

  } catch (error) {
    console.error('API Key 재발급 오류:', error);
    return NextResponse.json(
      { 
        error: 'API Key 재발급 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

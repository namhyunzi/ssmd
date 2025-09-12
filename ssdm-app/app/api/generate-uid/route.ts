import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';

interface GenerateUidRequest {
  userId: string; // 쇼핑몰 사용자 ID
}

/**
 * API Key 검증 함수
 */
async function validateApiKey(apiKey: string): Promise<string | null> {
  try {
    // API Key 인덱스에서 확인
    const apiKeyRef = ref(realtimeDb, `apiKeys/${apiKey}`);
    const snapshot = await get(apiKeyRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const apiKeyData = snapshot.val();
    if (!apiKeyData.isActive) {
      return null;
    }
    
    return apiKeyData.mallId; // mallId 반환
  } catch (error) {
    console.error('API Key 검증 오류:', error);
    return null;
  }
}

/**
 * 쇼핑몰 존재 여부 확인
 */
async function validateMall(mallId: string): Promise<boolean> {
  try {
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const snapshot = await get(mallRef);
    
    if (!snapshot.exists()) {
      return false;
    }
    
    return true; // 쇼핑몰이 존재하면 활성화된 것으로 간주
  } catch (error) {
    console.error('쇼핑몰 검증 오류:', error);
    return false;
  }
}

/**
 * 기존 UID 조회
 */
async function getExistingUid(mallId: string, userId: string): Promise<string | null> {
  try {
    const mappingRef = ref(realtimeDb, `userMappings/${mallId}/${userId}`);
    const snapshot = await get(mappingRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const mappingData = snapshot.val();
    if (!mappingData.isActive) {
      return null;
    }
    
    return mappingData.uid;
  } catch (error) {
    console.error('기존 UID 조회 오류:', error);
    return null;
  }
}

/**
 * userId와 UID 매핑 저장
 */
async function saveMapping(mallId: string, userId: string, uid: string): Promise<void> {
  try {
    const mappingRef = ref(realtimeDb, `userMappings/${mallId}/${userId}`);
    await set(mappingRef, {
      uid: uid,
      createdAt: new Date().toISOString(),
      isActive: true
    });
    
    console.log(`사용자 매핑 저장 완료: ${userId} → ${uid}`);
  } catch (error) {
    console.error('사용자 매핑 저장 오류:', error);
    throw error;
  }
}

/**
 * UID 생성 함수
 * 형식: {englishId}-{UUID}
 * 서비스별 사용자 고유 식별자
 */
async function generateUid(englishId: string): Promise<string> {
  // UUID v4 생성 (Web Crypto API 사용)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // UUID v4 형식으로 변환
  array[6] = (array[6] & 0x0f) | 0x40; // version 4
  array[8] = (array[8] & 0x3f) | 0x80; // variant bits
  
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
  
  return `${englishId}-${uuid}`;
}

/**
 * UID 생성 API
 * POST /api/generate-uid
 */
export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 API Key 추출
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization 헤더가 필요합니다.' },
        { status: 401 }
      );
    }

    const apiKey = authorization.replace('Bearer ', '');
    
    // 요청 본문에서 userId 추출
    const { userId }: GenerateUidRequest = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId는 필수입니다.' },
        { status: 400 }
      );
    }

    // API Key 검증 및 mallId 추출
    const mallId = await validateApiKey(apiKey);
    if (!mallId) {
      return NextResponse.json(
        { error: '유효하지 않은 API Key입니다.' },
        { status: 401 }
      );
    }

    // 쇼핑몰 존재 여부 확인
    const mallExists = await validateMall(mallId);
    if (!mallExists) {
      return NextResponse.json(
        { error: '등록되지 않은 쇼핑몰입니다.' },
        { status: 400 }
      );
    }

    // 기존 UID 조회
    let uid = await getExistingUid(mallId, userId);
    let isNew = false;
    
    if (!uid) {
      // 새 UID 생성
      uid = await generateUid(mallId);
      
      // userId와 UID 매핑 저장
      await saveMapping(mallId, userId, uid);
      isNew = true;
      
      console.log(`새 UID 생성 및 매핑 완료: ${userId} → ${uid} (쇼핑몰: ${mallId})`);
    } else {
      console.log(`기존 UID 조회: ${userId} → ${uid} (쇼핑몰: ${mallId})`);
    }

    return NextResponse.json({
      uid,
      isNew
    });

  } catch (error) {
    console.error('UID 생성 API 오류:', error);
    return NextResponse.json(
      { 
        error: 'UID 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * CORS 처리
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

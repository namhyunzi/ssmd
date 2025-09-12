import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { generateEncryptionKey, encryptData, generateHash } from '@/lib/encryption';

interface SetupTestDataRequest {
  userId: string;
  userData: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  };
}

/**
 * 테스트용 암호화된 사용자 데이터 설정 API
 * POST /api/setup-test-data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, userData }: SetupTestDataRequest = await request.json();

    // 입력값 검증
    if (!userId || !userData) {
      return NextResponse.json(
        { error: 'userId와 userData는 필수입니다.' },
        { status: 400 }
      );
    }

    // 1. 암호화 키 생성
    const encryptionKey = generateEncryptionKey(userId, Date.now());
    
    // 2. 데이터 암호화
    const dataString = JSON.stringify(userData);
    const encryptedData = encryptData(dataString, encryptionKey);
    const checksum = generateHash(dataString);

    // 3. 사용자 ID로 암호화 키 암호화
    const encryptedKey = encryptData(encryptionKey, userId);

    // 4. Firebase에 암호화된 데이터 저장
    const encryptedDataRef = ref(realtimeDb, `encryptedUserData/${userId}`);
    await set(encryptedDataRef, {
      encryptedData,
      encryptedKey,
      checksum,
      createdAt: new Date().toISOString()
    });

    // 5. 메타데이터 저장
    const metadataRef = ref(realtimeDb, `userProfileMetadata/${userId}`);
    await set(metadataRef, {
      userId,
      storageLocations: ['firebase'],
      fragments: [{
        totalFragments: 1,
        fragmentOrder: 1,
        storageDevice: 'firebase',
        encryptedKey: encryptedKey,
        checksum: checksum
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`테스트 데이터 설정 완료: ${userId}`);

    return NextResponse.json({
      success: true,
      message: '테스트 데이터가 성공적으로 설정되었습니다.',
      userId
    });

  } catch (error) {
    console.error('테스트 데이터 설정 API 오류:', error);
    return NextResponse.json(
      { 
        error: '테스트 데이터 설정 중 오류가 발생했습니다.',
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}






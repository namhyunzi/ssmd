import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { decryptData, verifyIntegrity } from '@/lib/encryption';

interface GetUserDataRequest {
  sessionId: string;
}

interface ViewerSession {
  sessionId: string;
  uid: string;
  sessionType: 'paper' | 'qr';
  allowedFields: string[];
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

/**
 * 세션 검증
 */
async function validateSession(sessionId: string): Promise<ViewerSession | null> {
  try {
    const sessionRef = ref(realtimeDb, `viewerSessions/${sessionId}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return null;
    }

    const sessionData: ViewerSession = snapshot.val();

    // 세션 만료 확인
    const expiresAt = new Date(sessionData.expiresAt);
    const now = new Date();

    if (now > expiresAt || !sessionData.isActive) {
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('세션 검증 오류:', error);
    return null;
  }
}

/**
 * UID에서 사용자 ID 추출
 */
function extractUserIdFromUid(uid: string): string | null {
  const parts = uid.split('-');
  if (parts.length < 2) {
    return null;
  }
  // UID 형식: {mallId}-{uuid}
  // 사용자 ID는 UUID 부분
  return parts.slice(1).join('-');
}

/**
 * 암호화된 개인정보 복호화
 */
function decryptUserData(encryptedData: string, encryptionKey: string): any {
  try {
    const decryptedString = decryptData(encryptedData, encryptionKey);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('개인정보 복호화 실패:', error);
    return null;
  }
}

/**
 * 사용자 개인정보 조회 API
 * POST /api/get-user-data
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId }: GetUserDataRequest = await request.json();

    // 입력값 검증
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId는 필수입니다.' },
        { status: 400 }
      );
    }

    // 세션 검증
    const session = await validateSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 세션입니다.' },
        { status: 401 }
      );
    }

    // UID에서 사용자 ID 추출
    const userId = extractUserIdFromUid(session.uid);
    if (!userId) {
      return NextResponse.json(
        { error: '올바르지 않은 UID 형식입니다.' },
        { status: 400 }
      );
    }

    // 사용자 메타데이터 조회
    const metadataRef = ref(realtimeDb, `userProfileMetadata/${userId}`);
    const metadataSnapshot = await get(metadataRef);

    if (!metadataSnapshot.exists()) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const metadata = metadataSnapshot.val();

    // 로컬 저장소에서 암호화된 데이터 조회 (실제로는 클라이언트에서 처리)
    // 여기서는 테스트용으로 Firebase에 저장된 암호화된 데이터를 가정
    const userDataRef = ref(realtimeDb, `encryptedUserData/${userId}`);
    const userDataSnapshot = await get(userDataRef);

    if (!userDataSnapshot.exists()) {
      return NextResponse.json(
        { error: '암호화된 사용자 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const encryptedUserData = userDataSnapshot.val();

    // 암호화 키 복호화 (사용자 ID로 암호화된 키)
    const encryptionKey = decryptData(encryptedUserData.encryptedKey, userId);

    // 개인정보 복호화
    const decryptedData = decryptUserData(encryptedUserData.encryptedData, encryptionKey);
    if (!decryptedData) {
      return NextResponse.json(
        { error: '개인정보 복호화에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 무결성 검증
    const isIntegrityValid = verifyIntegrity(JSON.stringify(decryptedData), encryptedUserData.checksum);
    if (!isIntegrityValid) {
      return NextResponse.json(
        { error: '데이터 무결성 검증에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 허용된 필드만 필터링
    const allowedData: any = {};
    session.allowedFields.forEach(field => {
      if (decryptedData[field] !== undefined) {
        allowedData[field] = decryptedData[field];
      }
    });

    console.log(`사용자 데이터 조회 성공: ${userId} (${session.allowedFields.join(',')})`);

    return NextResponse.json({
      success: true,
      userData: allowedData,
      allowedFields: session.allowedFields,
      sessionType: session.sessionType
    });

  } catch (error) {
    console.error('사용자 데이터 조회 API 오류:', error);
    return NextResponse.json(
      { 
        error: '사용자 데이터 조회 중 오류가 발생했습니다.',
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






import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

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

    // Firebase에서 사용자 개인정보 직접 조회
    const userRef = ref(realtimeDb, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const userData = userSnapshot.val();
    
    // 개인정보가 있는지 확인
    if (!userData.profile) {
      return NextResponse.json(
        { error: '개인정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const decryptedData = userData.profile;

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







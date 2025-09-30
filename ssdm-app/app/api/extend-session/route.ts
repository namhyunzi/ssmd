import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';

interface ExtendSessionRequest {
  sessionId: string;
}

interface ViewerSession {
  sessionId: string;
  uid: string;
  sessionType: 'paper' | 'qr';
  allowedFields: string[];
  createdAt: string;
  expiresAt: string;
  extensions: number;
  maxExtensions: number;
}

/**
 * 세션 만료 시간 계산 (연장용)
 */
function getExtendedExpiration(sessionType: 'paper' | 'qr'): string {
  const now = new Date();
  switch (sessionType) {
    case 'paper':
      // 종이송장은 연장 불가
      return now.toISOString();
    case 'qr':
      // QR송장은 12시간 연장
      now.setHours(now.getHours() + 12);
      return now.toISOString();
    default:
      return now.toISOString();
  }
}

/**
 * 세션 연장 API
 * POST /api/extend-session
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId }: ExtendSessionRequest = await request.json();

    // 입력값 검증
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId는 필수입니다.' },
        { status: 400 }
      );
    }

    // 기존 세션 조회
    const sessionRef = ref(realtimeDb, `viewer-sessions/${sessionId}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: '존재하지 않는 세션입니다.' },
        { status: 404 }
      );
    }

    const session: ViewerSession = snapshot.val();



    // 연장 횟수 확인
    if ((session.extensions || 0) >= session.maxExtensions) {
      return NextResponse.json(
        { 
          error: '연장 한도를 초과했습니다.',
          maxExtensions: session.maxExtensions,
          currentExtensions: session.extensions || 0,
          remainingExtensions: 0
        },
        { status: 400 }
      );
    }

    // 현재 시간 기준으로 만료 확인
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    // 이미 만료된 세션은 연장 불가
    if (now > expiresAt) {
      return NextResponse.json(
        { 
          error: '만료된 세션은 연장할 수 없습니다.',
          expiresAt: session.expiresAt,
          currentTime: now.toISOString()
        },
        { status: 400 }
      );
    }

    // 연장 처리 (기존 만료 시간에서 12시간 연장)
    const currentExpiresAt = new Date(session.expiresAt);
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setHours(newExpiresAt.getHours() + 12);
    const updatedSession: ViewerSession = {
      ...session,
      expiresAt: newExpiresAt.toISOString(),
      extensions: (session.extensions || 0) + 1
    };

    // 업데이트된 세션 저장
    await set(sessionRef, updatedSession);

    const remainingExtensions = session.maxExtensions - ((session.extensions || 0) + 1);

    console.log(`세션 연장 성공: ${sessionId} (${(session.extensions || 0) + 1}/${session.maxExtensions})`);

    return NextResponse.json({
      success: true,
      sessionId,
      newExpiresAt,
      extensionCount: updatedSession.extensions,
      remainingExtensions,
      message: `세션이 12시간 연장되었습니다. (${remainingExtensions}번 더 연장 가능)`
    });

  } catch (error) {
    console.error('세션 연장 API 오류:', error);
    return NextResponse.json(
      { 
        error: '세션 연장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}






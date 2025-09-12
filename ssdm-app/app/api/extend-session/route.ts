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
  extensionCount: number;
  maxExtensions: number;
  isActive: boolean;
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
    const sessionRef = ref(realtimeDb, `viewerSessions/${sessionId}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: '존재하지 않는 세션입니다.' },
        { status: 404 }
      );
    }

    const session: ViewerSession = snapshot.val();

    // 세션 활성 상태 확인
    if (!session.isActive) {
      return NextResponse.json(
        { error: '비활성화된 세션입니다.' },
        { status: 400 }
      );
    }

    // 연장 가능 세션 타입 확인 (QR만 가능)
    if (session.sessionType !== 'qr') {
      return NextResponse.json(
        { error: '종이송장 세션은 연장할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 연장 횟수 확인
    if (session.extensionCount >= session.maxExtensions) {
      return NextResponse.json(
        { 
          error: `연장 한도를 초과했습니다. (최대 ${session.maxExtensions}번)`,
          maxExtensions: session.maxExtensions,
          currentExtensions: session.extensionCount
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
        { error: '만료된 세션은 연장할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 연장 처리
    const newExpiresAt = getExtendedExpiration(session.sessionType);
    const updatedSession: ViewerSession = {
      ...session,
      expiresAt: newExpiresAt,
      extensionCount: session.extensionCount + 1
    };

    // 업데이트된 세션 저장
    await set(sessionRef, updatedSession);

    const remainingExtensions = session.maxExtensions - (session.extensionCount + 1);

    console.log(`세션 연장 성공: ${sessionId} (${session.extensionCount + 1}/${session.maxExtensions})`);

    return NextResponse.json({
      success: true,
      sessionId,
      newExpiresAt,
      extensionCount: updatedSession.extensionCount,
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

/**
 * 세션 연장 가능 여부 확인 API
 * GET /api/extend-session?sessionId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 세션 조회
    const sessionRef = ref(realtimeDb, `viewerSessions/${sessionId}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: '존재하지 않는 세션입니다.' },
        { status: 404 }
      );
    }

    const session: ViewerSession = snapshot.val();

    // 연장 가능 여부 확인
    const canExtend = session.sessionType === 'qr' && 
                     session.extensionCount < session.maxExtensions &&
                     session.isActive &&
                     new Date() <= new Date(session.expiresAt);

    const remainingExtensions = Math.max(0, session.maxExtensions - session.extensionCount);

    return NextResponse.json({
      success: true,
      canExtend,
      sessionType: session.sessionType,
      extensionCount: session.extensionCount,
      maxExtensions: session.maxExtensions,
      remainingExtensions,
      expiresAt: session.expiresAt,
      isActive: session.isActive
    });

  } catch (error) {
    console.error('세션 연장 확인 API 오류:', error);
    return NextResponse.json(
      { 
        error: '세션 연장 확인 중 오류가 발생했습니다.',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}




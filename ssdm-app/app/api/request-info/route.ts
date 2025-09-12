import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface RequestInfoRequest {
  jwt: string;
  requiredFields: string[];
  sessionType: 'paper' | 'qr';
}

interface JwtPayload {
  uid: string;
  mallId: string;
  exp: number;
  iat: number;
}

interface ViewerSession {
  sessionId: string;
  uid: string;
  sessionType: 'paper' | 'qr';
  allowedFields: string[]; // 실제 제공할 필드들 (intersectionFields)
  createdAt: string;
  expiresAt: string;
  extensionCount: number;  // 연장 횟수
  maxExtensions: number;   // 최대 연장 가능 횟수
  isActive: boolean;
}

/**
 * JWT 토큰 검증
 */
function verifyJwtToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'ssmd-default-secret-key';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // 만료 시간 확인
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('JWT 검증 오류:', error);
    return null;
  }
}

/**
 * 쇼핑몰의 허용 필드 조회 (mallId가 이제 englishId)
 */
async function getMallAllowedFields(mallId: string): Promise<string[] | null> {
  try {
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const snapshot = await get(mallRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const mallData = snapshot.val();
    return mallData.allowedFields || [];
  } catch (error) {
    console.error('쇼핑몰 정보 조회 오류:', error);
    return null;
  }
}

/**
 * 세션 ID 생성
 */
function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 세션 만료 시간 계산
 */
function getSessionExpiration(sessionType: 'paper' | 'qr'): string {
  const now = new Date();
  switch (sessionType) {
    case 'paper':
      now.setHours(now.getHours() + 1); // 1시간
      break;
    case 'qr':
      now.setHours(now.getHours() + 12); // 12시간
      break;
  }
  return now.toISOString();
}

/**
 * 개인정보 요청 처리 API
 * POST /api/request-info
 */
export async function POST(request: NextRequest) {
  try {
    const { jwt: jwtToken, requiredFields, sessionType }: RequestInfoRequest = await request.json();

    // 입력값 검증
    if (!jwtToken || !requiredFields || !Array.isArray(requiredFields) || !sessionType) {
      return NextResponse.json(
        { error: 'jwt, requiredFields(배열), sessionType은 필수입니다.' },
        { status: 400 }
      );
    }

    // JWT 토큰 검증
    const jwtPayload = verifyJwtToken(jwtToken);
    if (!jwtPayload) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 JWT 토큰입니다.' },
        { status: 401 }
      );
    }

    const { uid, mallId } = jwtPayload;

    // 쇼핑몰의 허용 필드 조회
    const allowedFields = await getMallAllowedFields(mallId);
    if (!allowedFields) {
      return NextResponse.json(
        { error: '등록되지 않은 쇼핑몰입니다.' },
        { status: 400 }
      );
    }

    // 요청된 필드와 허용된 필드의 교집합 계산
    const intersectionFields = requiredFields.filter(field => 
      allowedFields.includes(field)
    );

    if (intersectionFields.length === 0) {
      return NextResponse.json(
        { error: '요청된 필드 중 제공 가능한 정보가 없습니다.' },
        { status: 403 }
      );
    }

    // 보안 뷰어 세션 생성
    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration(sessionType);

    const viewerSession: ViewerSession = {
      sessionId,
      uid,
      sessionType,
      allowedFields: intersectionFields, // 실제 제공할 필드들
      createdAt: new Date().toISOString(),
      expiresAt,
      extensionCount: 0,  // 초기값: 연장 안함
      maxExtensions: sessionType === 'qr' ? 3 : 0,  // QR만 3번 연장 가능
      isActive: true
    };

    // 세션 저장
    const sessionRef = ref(realtimeDb, `viewerSessions/${sessionId}`);
    await set(sessionRef, viewerSession);

    // 보안 뷰어 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const viewerUrl = `${baseUrl}/secure-viewer/${sessionType === 'paper' ? 'delivery-manager' : 'delivery-driver'}?session=${sessionId}`;

    console.log(`보안 뷰어 세션 생성: ${sessionId} (${sessionType}, ${intersectionFields.join(',')})`);

    return NextResponse.json({
      success: true,
      viewerUrl,
      sessionId,
      sessionType,
      allowedFields: intersectionFields,
      expiresAt,
      // 사용 가능한 작업 정보
      capabilities: {
        canPrint: sessionType === 'paper',
        canView: true,
        canCopy: false,
        canSave: false
      }
    });

  } catch (error) {
    console.error('개인정보 요청 처리 API 오류:', error);
    return NextResponse.json(
      { 
        error: '개인정보 요청 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * 세션 상태 확인 API
 * GET /api/request-info?sessionId=xxx
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

    const sessionData: ViewerSession = snapshot.val();

    // 세션 만료 확인
    const expiresAt = new Date(sessionData.expiresAt);
    const now = new Date();

    if (now > expiresAt || !sessionData.isActive) {
      return NextResponse.json(
        { 
          error: '만료되거나 비활성화된 세션입니다.',
          expired: true 
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        sessionType: sessionData.sessionType,
        allowedFields: sessionData.allowedFields,
        expiresAt: sessionData.expiresAt,
        isActive: sessionData.isActive
      }
    });

  } catch (error) {
    console.error('세션 확인 API 오류:', error);
    return NextResponse.json(
      { 
        error: '세션 확인 중 오류가 발생했습니다.',
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

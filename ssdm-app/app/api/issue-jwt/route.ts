import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import jwt from 'jsonwebtoken';

interface IssueJwtRequest {
  uid: string;
}

interface JwtPayload {
  uid: string;
  mallId: string;
  exp: number;
  iat: number;
}

/**
 * API Key 검증 함수
 */
async function validateApiKey(apiKey: string): Promise<string | null> {
  try {
    const apiKeyRef = ref(realtimeDb, `apiKeys/${apiKey}`);
    const snapshot = await get(apiKeyRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const apiKeyData = snapshot.val();
    if (!apiKeyData.isActive) {
      return null;
    }
    
    return apiKeyData.mallId;
  } catch (error) {
    console.error('API Key 검증 오류:', error);
    return null;
  }
}

/**
 * UID에서 mallId 추출
 */
function extractMallIdFromUid(uid: string): string | null {
  const parts = uid.split('-');
  if (parts.length < 2) {
    return null;
  }
  return parts[0];
}

/**
 * JWT 토큰 생성
 */
function createJwtToken(payload: Omit<JwtPayload, 'exp' | 'iat'>, expiresIn: number): string {
  const secret = process.env.JWT_SECRET || 'ssmd-default-secret-key';
  
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  return jwt.sign(jwtPayload, secret, { algorithm: 'HS256' });
}

/**
 * 세션 타입별 만료 시간 반환 (초 단위)
 */
function getExpirationTime(sessionType: 'paper' | 'qr'): number {
  switch (sessionType) {
    case 'paper':
      return 3600; // 1시간
    case 'qr':
      return 43200; // 12시간
    default:
      return 3600;
  }
}

/**
 * JWT 발급 API
 * POST /api/issue-jwt
 */
export async function POST(request: NextRequest) {
  try {
    // 내부 호출 확인 (동의 프로세스에서 호출)
    const internalCall = request.headers.get('X-Internal-Call');
    let apiKey: string | undefined;
    let mallId: string;
    let uid: string;

    // 요청 본문 먼저 파싱
    const body = await request.json();
    uid = body.uid;

    if (!uid) {
      return NextResponse.json(
        { error: 'uid는 필수입니다.' },
        { status: 400 }
      );
    }

    // UID에서 mallId 추출
    mallId = extractMallIdFromUid(uid);
    if (!mallId) {
      return NextResponse.json(
        { error: '올바르지 않은 UID 형식입니다.' },
        { status: 400 }
      );
    }

    if (internalCall === 'generate-jwt') {
      // 내부 호출인 경우 API Key 검증 생략
      console.log('내부 호출 - API Key 검증 생략');
    } else {
      // 외부 API 호출인 경우 기존 방식
      const authorization = request.headers.get('authorization');
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization 헤더가 필요합니다.' },
          { status: 401 }
        );
      }

      apiKey = authorization.replace('Bearer ', '');
      
      // API Key 검증
      const apiKeyMallId = await validateApiKey(apiKey);
      if (!apiKeyMallId) {
        return NextResponse.json(
          { error: '유효하지 않은 API Key입니다.' },
          { status: 401 }
        );
      }

      // API Key의 mallId와 UID의 mallId 일치 확인
      if (apiKeyMallId !== mallId) {
        return NextResponse.json(
          { error: 'API Key와 UID의 쇼핑몰이 일치하지 않습니다.' },
          { status: 403 }
        );
      }
    }

    // 쇼핑몰 존재 여부 확인
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const mallSnapshot = await get(mallRef);
    
    if (!mallSnapshot.exists()) {
      return NextResponse.json(
        { error: '등록되지 않은 쇼핑몰입니다.' },
        { status: 400 }
      );
    }

    // JWT 토큰 생성 (15분)
    const expiresIn = 900; // 15분
    const token = createJwtToken(
      {
        uid,
        mallId
      },
      expiresIn
    );

    console.log(`JWT 발급 성공: ${uid} (${expiresIn}초)`);

    return NextResponse.json({
      jwt: token,
      expiresIn
    });

  } catch (error) {
    console.error('JWT 발급 API 오류:', error);
    return NextResponse.json(
      { 
        error: 'JWT 발급 중 오류가 발생했습니다.',
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

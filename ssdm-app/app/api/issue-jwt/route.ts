import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import jwt from 'jsonwebtoken';

interface IssueJwtRequest {
  userId: string;  // 쇼핑몰의 사용자 ID
  sessionType: 'paper' | 'qr';
}

interface JwtPayload {
  uid: string;
  mallId: string;
  sessionType: 'paper' | 'qr';
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
 * userId로 UID 생성 또는 기존 UID 반환
 */
async function getOrCreateUid(userId: string, mallId: string): Promise<string> {
  // UID 형식: {mallId}_{userId}
  const uid = `${mallId}_${userId}`;
  
  // TODO: Firebase에서 기존 UID 확인 로직
  // const existingUid = await checkExistingUid(userId, mallId);
  // if (existingUid) return existingUid;
  
  // 임시로 항상 새 UID 반환 (실제로는 기존 UID가 있으면 재활용)
  return uid;
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
    // Authorization 헤더에서 API Key 추출
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization 헤더가 필요합니다.' },
        { status: 401 }
      );
    }

    const apiKey = authorization.replace('Bearer ', '');
    
    const { userId, sessionType }: IssueJwtRequest = await request.json();

    // 입력값 검증
    if (!userId || !sessionType) {
      return NextResponse.json(
        { error: 'userId와 sessionType은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!['paper', 'qr'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'sessionType은 "paper" 또는 "qr"이어야 합니다.' },
        { status: 400 }
      );
    }

    // API Key 검증
    const mallId = await validateApiKey(apiKey);
    if (!mallId) {
      return NextResponse.json(
        { error: '유효하지 않은 API Key입니다.' },
        { status: 401 }
      );
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

    // userId로 UID 생성 또는 기존 UID 반환
    const uid = await getOrCreateUid(userId, mallId);

    // JWT 토큰 생성 (UID 기반)
    const expiresIn = getExpirationTime(sessionType);
    const token = createJwtToken(
      {
        uid,
        mallId,
        sessionType
      },
      expiresIn
    );

    console.log(`JWT 발급 성공: ${uid} (${sessionType}, ${expiresIn}초)`);

    return NextResponse.json({
      jwt: token,
      expiresIn,
      sessionType
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
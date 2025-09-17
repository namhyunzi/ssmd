import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, set, get, remove } from 'firebase/database';

interface ConsentData {
  uid: string;
  mallId: string;
  userId: string;
  consentType: 'once' | 'always';
  createdAt: string;
  expiresAt?: string; // 6개월 동의인 경우만
  isActive: boolean;
}

interface SaveConsentRequest {
  uid: string;
  consentType: 'once' | 'always';
  shopId?: string;
}

interface CheckConsentRequest {
  uid: string;
}

/**
 * UID에서 mallId와 userId 추출
 */
function parseUid(uid: string): { mallId: string; userId: string } | null {
  const parts = uid.split('_');
  if (parts.length < 2) {
    return null;
  }
  const mallId = parts[0];
  const userId = parts.slice(1).join('_');
  return { mallId, userId };
}

/**
 * 6개월 후 만료일 계산
 */
function getExpirationDate(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 6);
  return now.toISOString();
}

/**
 * 동의 저장 API
 * POST /api/consent
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, consentType, shopId }: SaveConsentRequest = await request.json();

    // 입력값 검증
    if (!uid || !consentType) {
      return NextResponse.json(
        { error: 'uid, consentType은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!['once', 'always'].includes(consentType)) {
      return NextResponse.json(
        { error: 'consentType은 "once" 또는 "always"이어야 합니다.' },
        { status: 400 }
      );
    }

    // UID 파싱
    const parsed = parseUid(uid);
    if (!parsed) {
      return NextResponse.json(
        { error: '올바르지 않은 UID 형식입니다.' },
        { status: 400 }
      );
    }

    const { mallId, userId } = parsed;

    // "이번만 허용"인 경우 저장하지 않고 성공 응답만 반환
    if (consentType === 'once') {
      console.log(`일회성 동의: ${uid}`);
      return NextResponse.json({
        success: true,
        message: '일회성 동의가 처리되었습니다.',
        consentType: 'once'
      });
    }

    // "6개월 허용"인 경우 데이터베이스에 저장
    const now = new Date().toISOString();
    const expiresAt = getExpirationDate();

    const consentData: ConsentData = {
      uid,
      mallId,
      userId,
      consentType,
      createdAt: now,
      expiresAt,
      isActive: true
    };

    // 동의 데이터 저장 (사용자별, 쇼핑몰별, shopId별)
    const consentRef = ref(realtimeDb, `mallServiceConsents/${userId}/${mallId}/${shopId || 'default'}`);
    await set(consentRef, consentData);

    console.log(`6개월 동의 저장: ${uid}, 만료일: ${expiresAt}`);

    return NextResponse.json({
      success: true,
      message: '6개월 동의가 저장되었습니다.',
      consentType: 'always',
      expiresAt
    });

  } catch (error) {
    console.error('동의 저장 API 오류:', error);
    return NextResponse.json(
      { 
        error: '동의 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * 동의 상태 확인 API
 * GET /api/consent?uid=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const shopId = searchParams.get('shopId');

    if (!uid) {
      return NextResponse.json(
        { error: 'uid 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // UID 파싱
    const parsed = parseUid(uid);
    if (!parsed) {
      return NextResponse.json(
        { error: '올바르지 않은 UID 형식입니다.' },
        { status: 400 }
      );
    }

    const { mallId, userId } = parsed;

    // 동의 데이터 조회
    const consentRef = ref(realtimeDb, `mallServiceConsents/${userId}/${mallId}/${shopId || 'default'}`);
    const snapshot = await get(consentRef);

    if (!snapshot.exists()) {
      return NextResponse.json({
        hasConsent: false,
        message: '저장된 동의 내역이 없습니다.'
      });
    }

    const consentData: ConsentData = snapshot.val();

    // 만료일 확인
    if (consentData.expiresAt) {
      const expiresAt = new Date(consentData.expiresAt);
      const now = new Date();

      if (now > expiresAt) {
        // 만료된 동의 삭제
        await remove(consentRef);
        console.log(`만료된 동의 삭제: ${uid}`);
        
        return NextResponse.json({
          hasConsent: false,
          message: '동의가 만료되었습니다.'
        });
      }
    }

    // 비활성화된 동의 확인
    if (!consentData.isActive) {
      return NextResponse.json({
        hasConsent: false,
        message: '동의가 해제되었습니다.'
      });
    }

    return NextResponse.json({
      hasConsent: true,
      consentData: {
        consentType: consentData.consentType,
        createdAt: consentData.createdAt,
        expiresAt: consentData.expiresAt
      }
    });

  } catch (error) {
    console.error('동의 확인 API 오류:', error);
    return NextResponse.json(
      { 
        error: '동의 확인 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * 동의 해제 API
 * DELETE /api/consent
 */
export async function DELETE(request: NextRequest) {
  try {
    const { uid, shopId } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'uid는 필수입니다.' },
        { status: 400 }
      );
    }

    // UID 파싱
    const parsed = parseUid(uid);
    if (!parsed) {
      return NextResponse.json(
        { error: '올바르지 않은 UID 형식입니다.' },
        { status: 400 }
      );
    }

    const { mallId, userId } = parsed;

    // 동의 해제 (삭제)
    const consentRef = ref(realtimeDb, `mallServiceConsents/${userId}/${mallId}/${shopId || 'default'}`);
    await remove(consentRef);

    console.log(`동의 해제: ${uid}`);

    return NextResponse.json({
      success: true,
      message: '동의가 해제되었습니다.'
    });

  } catch (error) {
    console.error('동의 해제 API 오류:', error);
    return NextResponse.json(
      { 
        error: '동의 해제 중 오류가 발생했습니다.',
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

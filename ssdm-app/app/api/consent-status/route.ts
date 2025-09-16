import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface ConsentStatusRequest {
  shopId: string;
  mallId: string;
}

interface ConsentStatusResponse {
  isConnected: boolean;
  autoConsent: boolean;
  expiresAt: string | null;
  consentType?: string;
  userId?: string;
}

/**
 * 동의 상태 확인 함수
 * @param shopId 상점 ID
 * @param mallId 쇼핑몰 ID
 * @returns 동의 상태 정보
 */
async function checkConsentStatus(shopId: string, mallId: string): Promise<ConsentStatusResponse> {
  try {
    // userConsents 데이터 가져오기
    const userConsents = await getUserConsents();
    
    // 모든 사용자에서 해당 mallId_shopId 조합 찾기
    let foundConsent = null;
    let userId = null;
    
    for (const [uid, consents] of Object.entries(userConsents)) {
      const consentKey = `${mallId}_${shopId}`;
      if (consents && consents[consentKey]) {
        foundConsent = consents[consentKey];
        userId = uid;
        break;
      }
    }
    
    // 동의 기록이 없으면
    if (!foundConsent) {
      return {
        isConnected: false,
        autoConsent: false,
        expiresAt: null
      };
    }
    
    // 만료 확인
    const now = new Date();
    const expiryDate = new Date(foundConsent.expiryDate);
    
    if (now > expiryDate) {
      return {
        isConnected: false,
        autoConsent: false,
        expiresAt: null
      };
    }
    
    // 유효한 동의가 있으면
    return {
      isConnected: true,
      autoConsent: foundConsent.consentType === 'always',
      expiresAt: foundConsent.expiryDate,
      consentType: foundConsent.consentType,
      userId: userId
    };
    
  } catch (error) {
    console.error('동의 상태 확인 중 오류:', error);
    return {
      isConnected: false,
      autoConsent: false,
      expiresAt: null
    };
  }
}

/**
 * 사용자 동의 데이터 조회 함수
 * @returns 사용자 동의 데이터
 */
async function getUserConsents(): Promise<Record<string, any>> {
  try {
    // Firebase Realtime Database에서 userConsents 데이터 가져오기
    const userConsentsRef = ref(realtimeDb, 'system/userConsents');
    const snapshot = await get(userConsentsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return {};
    }
    
  } catch (error) {
    console.error('userConsents 데이터 조회 실패:', error);
    return {};
  }
}

/**
 * 동의 상태 확인 API
 * POST /api/consent-status
 */
export async function POST(request: NextRequest) {
  try {
    const { shopId, mallId }: ConsentStatusRequest = await request.json();
    
    if (!shopId || !mallId) {
      return NextResponse.json({ 
        error: 'shopId and mallId are required' 
      }, { status: 400 });
    }
    
    // userConsents 데이터에서 해당 동의 상태 조회
    const consentStatus = await checkConsentStatus(shopId, mallId);
    
    return NextResponse.json(consentStatus);
    
  } catch (error) {
    console.error('동의 상태 확인 실패:', error);
    return NextResponse.json({ 
      error: 'Failed to check consent status',
      isConnected: false,
      autoConsent: false 
    }, { status: 500 });
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

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
    // 1. userMappings에서 shopId로 uid 찾기
    const mappingRef = ref(realtimeDb, `userMappings/${mallId}/${shopId}`);
    const mappingSnapshot = await get(mappingRef);
    
    if (!mappingSnapshot.exists()) {
      return {
        isConnected: false,
        autoConsent: false,
        expiresAt: null
      };
    }
    
    const uid = mappingSnapshot.val().uid;
    
    // 2. mallServiceConsents에서 해당 사용자의 쇼핑몰 동의 상태 확인 (올바른 구조: uid/mallId/shopId)
    const consentRef = ref(realtimeDb, `mallServiceConsents/${uid}/${mallId}/${shopId}`);
    const consentSnapshot = await get(consentRef);
    
    if (!consentSnapshot.exists()) {
      return {
        isConnected: false,
        autoConsent: false,
        expiresAt: null
      };
    }
    
    const consentData = consentSnapshot.val();
    
    // 3. 동의가 활성화되어 있는지 확인
    if (!consentData.isActive) {
      return {
        isConnected: false,
        autoConsent: false,
        expiresAt: null
      };
    }
    
    // 4. "항상 허용"인 경우 6개월 만료 확인
    if (consentData.consentType === 'always') {
      const consentDate = new Date(consentData.timestamp);
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      
      if (consentDate < sixMonthsAgo) {
        return {
          isConnected: false,
          autoConsent: false,
          expiresAt: null
        };
      }
    }
    
    // 5. 유효한 동의가 있으면
    return {
      isConnected: true,
      autoConsent: consentData.consentType === 'always',
      expiresAt: consentData.consentType === 'always' 
        ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      consentType: consentData.consentType,
      userId: uid
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
    
    // mallServiceConsents에서 해당 동의 상태 조회
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

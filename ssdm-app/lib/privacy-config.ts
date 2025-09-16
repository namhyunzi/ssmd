// 개인정보 시스템 연동 설정
export const PRIVACY_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
  mallId: process.env.MALL_ID || '',
  apiKey: process.env.PRIVACY_SYSTEM_API_KEY || '',
  sessionTypes: {
    paper: { 
      name: process.env.PAPER_SESSION_NAME || '종이송장 (관리자용)', 
      ttl: parseInt(process.env.PAPER_SESSION_TTL || '3600'), 
      extensible: false 
    },
    qr: { 
      name: process.env.QR_SESSION_NAME || 'QR송장 (배송기사용)', 
      ttl: parseInt(process.env.QR_SESSION_TTL || '43200'), 
      extensible: true, 
      maxExtensions: parseInt(process.env.QR_MAX_EXTENSIONS || '3')
    }
  }
}

/**
 * 쇼핑몰에서 SSMD 시스템과 통신하기 위한 클라이언트 클래스
 */
export class PrivacySystemClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = config?.baseUrl || PRIVACY_CONFIG.baseUrl;
    this.apiKey = config?.apiKey || PRIVACY_CONFIG.apiKey;
  }

  /**
   * UID 생성 API
   * @returns UID 생성 결과
   */
  async generateUID() {
    const response = await fetch(`${this.baseUrl}/api/generate-uid`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`UID 생성 실패: ${response.status}`);
    }
    
    const result = await response.json();
    
    // UUID 기반 표준 형식 반환
    return { 
      uid: result.uid     // 'bookstore-12345678-1234-1234-1234-123456789abc'
    };
  }

  /**
   * JWT 발급 API
   * @param shopId 쇼핑몰 사용자 ID
   * @param mallId 쇼핑몰 ID
   * @returns JWT 토큰 정보
   */
  async issueJWT(shopId: string, mallId: string) {
    const response = await fetch(`${this.baseUrl}/api/issue-jwt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ shopId, mallId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`JWT 발급 실패: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
    }
    
    return await response.json(); // { jwt: string, expiresIn: number, sessionType: string }
  }

  /**
   * 개인정보 요청 API
   * @param jwt JWT 토큰
   * @param requiredFields 요청할 개인정보 필드 목록
   * @param sessionType 세션 타입 ('paper' | 'qr')
   * @returns 보안 뷰어 URL 및 세션 정보
   */
  async requestUserInfo(jwt: string, requiredFields: string[], sessionType: 'paper' | 'qr' = 'paper') {
    const response = await fetch(`${this.baseUrl}/api/request-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jwt, requiredFields, sessionType })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`개인정보 요청 실패: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
    }
    
    return await response.json(); // { success: true, viewerUrl: string, sessionId: string, ... }
  }

  /**
   * 세션 연장 API (QR 전용)
   * @param sessionId 세션 ID
   * @returns 연장 결과
   */
  async extendSession(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/api/extend-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`세션 연장 실패: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
    }
    
    return await response.json(); // { success: true, newExpiresAt: string, remainingExtensions: number, ... }
  }

  /**
   * 세션 연장 가능 여부 확인
   * @param sessionId 세션 ID
   * @returns 연장 가능 정보
   */
  async checkExtensionAvailable(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/api/extend-session?sessionId=${sessionId}`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`세션 확인 실패: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
    }
    
    return await response.json(); // { canExtend: boolean, remainingExtensions: number, ... }
  }

}

/**
 * 쇼핑몰에서 사용할 헬퍼 함수들
 */
export const PrivacyHelpers = {
  /**
   * JWT 요청 함수 (기존 JWT 팝업에서 shopId, mallId 사용)
   */
  async requestPrivacyJWT(
    shopId: string,
    mallId: string
  ): Promise<{ jwt: string }> {
    try {
      const client = new PrivacySystemClient();
      
      // JWT 발급
      const jwtResult = await client.issueJWT(shopId, mallId);
      
      return { jwt: jwtResult.jwt };
    } catch (error) {
      console.error('JWT 요청 실패:', error);
      throw error;
    }
  },

  /**
   * 개인정보 요청 함수
   */
  async requestUserInfo(jwt: string, requiredFields: string[]) {
    try {
      const client = new PrivacySystemClient();
      const result = await client.requestUserInfo(jwt, requiredFields);
      
      // 🔥 SSDM에서 제공하는 추가 정보 활용
      console.log('세션 타입:', result.sessionType);
      console.log('허용된 필드:', result.allowedFields);
      console.log('만료 시간:', result.expiresAt);
      console.log('기능:', result.capabilities);
      
      return result; // { viewerUrl, sessionId, allowedFields, ... }
    } catch (error) {
      console.error('개인정보 요청 실패:', error);
      throw error;
    }
  },

  /**
   * 동의 요청 함수
   */
  async requestUserConsent(
    jwt: string, 
    requiredFields: string[], 
    duration: 'once' | 'always'
  ): Promise<boolean> {
    try {
      // 팝업으로 동의 페이지 열기 (JWT 없이)
      const consentUrl = `${PRIVACY_CONFIG.baseUrl}/consent`;
      const popup = window.open(consentUrl, 'consent', 'width=600,height=800');
      
      // 팝업이 로드된 후 JWT 전달
      const sendJWT = () => {
        if (popup && !popup.closed) {
          popup.postMessage({
            type: 'init_consent',
            jwt: jwt
          }, PRIVACY_CONFIG.baseUrl);
        }
      };
      
      // 팝업 로드 대기 후 JWT 전달
      setTimeout(sendJWT, 1000);
      
      // 팝업 결과 대기
      return new Promise((resolve) => {
        const handleMessage = (event: any) => {
          // 🔥 SSDM의 baseUrl과 정확히 일치하는지 확인
          if (event.origin !== PRIVACY_CONFIG.baseUrl) return;
          
          if (event.data.type === 'consent_result') {
            popup?.close();
            window.removeEventListener('message', handleMessage);
            resolve(event.data.agreed);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // 🔥 팝업이 닫혔는지 확인 (사용자가 X 버튼으로 닫은 경우)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            resolve(false); // 거부로 처리
          }
        }, 1000);
      });
    } catch (error) {
      console.error('동의 요청 실패:', error);
      throw error;
    }
  }
};

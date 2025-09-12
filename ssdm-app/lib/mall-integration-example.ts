/**
 * 쇼핑몰에서 SSMD 연동 시 사용할 수 있는 예제 코드
 * 이 파일은 쇼핑몰 개발자들에게 제공하는 참고용 코드입니다.
 */

import { PrivacySystemClient, PrivacyHelpers } from './privacy-config';

/**
 * 쇼핑몰 주문 완료 후 개인정보 보호 프로세스 예제
 */
export class MallIntegrationExample {
  /**
   * 주문 완료 시 호출하는 메인 함수
   * @param requiredFields 배송에 필요한 개인정보 필드들
   * @param sessionType 세션 타입 ('paper': 종이송장, 'qr': QR송장)
   */
  static async handleOrderComplete(
    requiredFields: string[] = ['name', 'phone', 'address'],
    sessionType: 'paper' | 'qr' = 'paper'
  ) {
    try {
      console.log('=== SSMD 개인정보 보호 프로세스 시작 ===');
      console.log('요청 필드:', requiredFields);
      console.log('세션 타입:', sessionType);

      const client = new PrivacySystemClient();
      
      // 1️⃣ UID 생성
      console.log('1. UID 생성 중...');
      const uidResult = await client.generateUID();
      console.log('✅ UID 생성 완료:', uidResult.uid);
      
      // 2️⃣ JWT 발급
      console.log('2. JWT 발급 중...');
      const jwtResult = await client.issueJWT(uidResult.uid);
      console.log('✅ JWT 발급 완료:', {
        expiresIn: `${jwtResult.expiresIn}초`
      });
      
      // 3️⃣ 개인정보 요청
      console.log('3. 보안 뷰어 생성 중...');
      const infoResult = await client.requestUserInfo(jwtResult.jwt, requiredFields, sessionType);
      console.log('✅ 보안 뷰어 생성 완료:', {
        viewerUrl: infoResult.viewerUrl,
        allowedFields: infoResult.allowedFields,
        capabilities: infoResult.capabilities
      });
      
      // 4️⃣ 택배사에 뷰어 URL 전달
      console.log('4. 택배사에 정보 전달...');
      await this.notifyDeliveryCompany(infoResult.viewerUrl, {
        sessionId: infoResult.sessionId,
        allowedFields: infoResult.allowedFields,
        expiresAt: infoResult.expiresAt
      });
      console.log('✅ 택배사 전달 완료');

      return {
        success: true,
        viewerUrl: infoResult.viewerUrl,
        message: '개인정보 보호 프로세스가 완료되었습니다.'
      };

    } catch (error) {
      console.error('❌ SSMD 연동 실패:', error);
      
      // 사용자에게 친화적인 오류 메시지 표시
      throw new Error('배송 정보 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  /**
   * 동의 프로세스가 필요한 경우 사용
   * @param shopUserId 쇼핑몰 사용자 ID
   * @param requiredFields 필요한 개인정보 필드들
   * @param duration 동의 기간 ('once': 이번만, 'always': 6개월)
   */
  static async requestUserConsent(
    shopUserId: string,
    requiredFields: string[],
    duration: 'once' | 'always' = 'once'
  ): Promise<boolean> {
    try {
      // 1. UID 생성
      const uidResult = await PrivacyHelpers.requestPrivacyUIDAndJWT();
      
      // 2. 동의 요청
      const consentResult = await PrivacyHelpers.requestUserConsent(
        uidResult.uid, 
        requiredFields, 
        duration
      );
      
      if (consentResult) {
        console.log('✅ 사용자 동의 완료');
        return true;
      } else {
        console.log('❌ 사용자 동의 거부');
        return false;
      }
      
    } catch (error) {
      console.error('동의 프로세스 오류:', error);
      return false;
    }
  }

  /**
   * 택배사에 뷰어 URL 전달 (예제 구현)
   * 실제로는 각 택배사 API에 맞게 구현해야 합니다.
   */
  private static async notifyDeliveryCompany(
    viewerUrl: string, 
    metadata: {
      sessionId: string;
      allowedFields: string[];
      expiresAt: string;
    }
  ) {
    // 예제: 택배사 API 호출
    console.log('택배사 API 호출 시뮬레이션:');
    console.log('- 뷰어 URL:', viewerUrl);
    console.log('- 세션 ID:', metadata.sessionId);
    console.log('- 제공 필드:', metadata.allowedFields);
    console.log('- 만료 시간:', metadata.expiresAt);
    
    /*
    // 실제 구현 예시:
    await fetch('https://delivery-company-api.com/orders/privacy-info', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer DELIVERY_API_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: 'ORDER_ID',
        privacyViewerUrl: viewerUrl,
        sessionId: metadata.sessionId,
        expiresAt: metadata.expiresAt
      })
    });
    */
    
    // 시뮬레이션을 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 간단한 사용 예제
 */
export const QuickExample = {
  /**
   * 가장 간단한 사용법
   */
  async simpleUsage(userId: string) {
    try {
      // 🚀 한 줄로 전체 프로세스 실행
      const result = await MallIntegrationExample.handleOrderComplete(userId);
      
      console.log('성공:', result.message);
      return result.viewerUrl;
      
    } catch (error) {
      console.error('오류:', error);
      // 사용자에게 오류 알림
      alert('배송 정보 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요.');
    }
  },

  /**
   * 동의 프로세스 포함 사용법
   */
  async withConsent(userId: string) {
    try {
      // 1. 먼저 동의 받기
      const consentGiven = await MallIntegrationExample.requestUserConsent(
        userId, 
        ['name', 'phone', 'address'],
        'always' // 6개월간 허용
      );
      
      if (!consentGiven) {
        throw new Error('개인정보 제공에 동의하지 않았습니다.');
      }
      
      // 2. 동의 받았으면 프로세스 진행
      const result = await MallIntegrationExample.handleOrderComplete(userId);
      
      return result.viewerUrl;
      
    } catch (error) {
      console.error('오류:', error);
      throw error;
    }
  }
};


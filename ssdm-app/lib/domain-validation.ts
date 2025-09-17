import { realtimeDb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

/**
 * 쇼핑몰의 허용 도메인 조회
 */
export async function getMallAllowedDomain(mallId: string): Promise<string | null> {
  try {
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const snapshot = await get(mallRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const mallData = snapshot.val();
    return mallData.allowedDomain || null;
  } catch (error) {
    console.error('쇼핑몰 허용 도메인 조회 오류:', error);
    return null;
  }
}

/**
 * returnUrl의 도메인이 허용된 도메인인지 검증
 */
export async function validateReturnUrl(returnUrl: string, mallId: string): Promise<boolean> {
  try {
    // URL 형식 검증
    const url = new URL(returnUrl);
    const domain = url.hostname;
    
    // 허용 도메인 조회
    const allowedDomain = await getMallAllowedDomain(mallId);
    if (!allowedDomain) {
      console.error(`쇼핑몰 ${mallId}을 찾을 수 없습니다.`);
      return false;
    }
    
    // 허용 도메인에서 호스트명 추출
    const allowedUrl = new URL(allowedDomain);
    const allowedHostname = allowedUrl.hostname;
    
    // 도메인 일치 확인
    const isAllowed = domain === allowedHostname;
    
    if (!isAllowed) {
      console.warn(`허용되지 않은 도메인: ${domain}, 허용 도메인: ${allowedHostname}`);
    }
    
    return isAllowed;
    
  } catch (error) {
    console.error('returnUrl 검증 오류:', error);
    return false;
  }
}

/**
 * 기본 콜백 URL 생성 (검증 실패 시 사용)
 */
export function getDefaultCallbackUrl(mallId: string): string {
  // 향후 확장을 위해 mall별로 다른 기본 URL을 설정할 수 있음
  return `https://ssmd.com/callback-error?mallId=${mallId}&error=invalid_return_url`;
}




import { realtimeDb } from './firebase';
import { ref, set, get, remove } from 'firebase/database';

interface Verifications {
  code: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Firebase에 인증코드 저장 (저장 전 자동으로 만료된 코드 정리)
 * @param email 이메일 주소
 * @param code 6자리 인증코드
 * @returns 저장 성공 여부
 */
export async function saveVerificationCode(
  email: string, 
  code: string
): Promise<boolean> {
  try {
    // 저장 전 만료된 코드들 자동 정리
    await cleanupExpiredCodes();
    
    const now = new Date().toISOString();
    const expiresAt = now + (3 * 60 * 1000); // 3분 후 만료
    
    // 이메일을 키로 사용 (특수문자 제거)
    const emailKey = email.replace(/[.#$[\]]/g, '_');
    
    const verificationData: Verifications = {
      code,
      email,
      createdAt: now,
      expiresAt
    };
    
    await set(ref(realtimeDb, `verifications/${emailKey}`), verificationData);
    console.log(`인증코드 저장 성공: ${email}`);
    return true;
  } catch (error) {
    console.error('인증코드 저장 실패:', error);
    return false;
  }
}

/**
 * Firebase에서 인증코드 검증 (검증 전 자동으로 만료된 코드 정리)
 * @param email 이메일 주소
 * @param inputCode 사용자가 입력한 코드
 * @returns 검증 결과 객체
 */
export async function verifyCode(
  email: string, 
  inputCode: string
): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    // 검증 전 만료된 코드들 자동 정리
    await cleanupExpiredCodes();
    
    const emailKey = email.replace(/[.#$[\]]/g, '_');
    const snapshot = await get(ref(realtimeDb, `verifications/${emailKey}`));
    
    if (!snapshot.exists()) {
      return {
        isValid: false,
        error: '인증코드를 찾을 수 없습니다. 다시 요청해주세요.'
      };
    }
    
    const data: Verifications = snapshot.val();
    const now = new Date().toISOString();
    
    // 만료 시간 확인
    if (new Date(now) > new Date(data.expiresAt)) {
      // 만료된 코드 삭제
      await remove(ref(realtimeDb, `verifications/${emailKey}`));
      return {
        isValid: false,
        error: '인증코드가 만료되었습니다. 다시 요청해주세요.'
      };
    }
    
    // 코드 일치 확인
    if (data.code !== inputCode) {
      return {
        isValid: false,
        error: '인증코드가 일치하지 않습니다.'
      };
    }
    
    // 검증 성공 시 코드 삭제 (일회용)
    await remove(ref(realtimeDb, `verifications/${emailKey}`));
    
    return {
      isValid: true
    };
  } catch (error) {
    console.error('인증코드 검증 실패:', error);
    return {
      isValid: false,
      error: '인증 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 만료된 인증코드 자동 정리
 * - 만료된 코드 (3분 경과)
 * - 오래된 코드 (1시간 경과) 
 */
export async function cleanupExpiredCodes(): Promise<void> {
  try {
    const snapshot = await get(ref(realtimeDb, 'verifications'));
    if (!snapshot.exists()) return;
    
    const data = snapshot.val();
    const now = new Date().toISOString();
    let deletedCount = 0;
    
    // 배치로 삭제할 키들 수집
    const keysToDelete: string[] = [];
    
    for (const emailKey in data) {
      const verification: Verifications = data[emailKey];
      
      // 만료된 코드 또는 1시간 이상 된 코드 삭제
      const isExpired = new Date(now) > new Date(verification.expiresAt);
      const isOld = new Date(now) > new Date(new Date(verification.createdAt).getTime() + (60 * 60 * 1000)); // 1시간
      
      if (isExpired || isOld) {
        keysToDelete.push(emailKey);
      }
    }
    
    // 배치 삭제 실행
    if (keysToDelete.length > 0) {
      const deletePromises = keysToDelete.map(async (emailKey) => {
        try {
          await remove(ref(realtimeDb, `verifications/${emailKey}`));
          deletedCount++;
        } catch (error) {
          console.error(`개별 삭제 실패: ${emailKey}`, error);
        }
      });
      
      await Promise.all(deletePromises);
      
      if (deletedCount > 0) {
        console.log(`자동 정리 완료: ${deletedCount}개의 만료된/오래된 인증코드 삭제`);
      }
    }
  } catch (error) {
    // 정리 실패해도 메인 기능에 영향 주지 않도록 에러 로그만 출력
    console.error('자동 정리 실패 (메인 기능에는 영향 없음):', error);
  }
}

/**
 * 특정 이메일의 인증코드 데이터 삭제 (회원가입 완료 시 사용)
 */
export async function removeVerificationCode(email: string): Promise<void> {
  try {
    const emailKey = email.replace(/[.#$[\]]/g, '_');
    await remove(ref(realtimeDb, `verifications/${emailKey}`));
    console.log(`인증코드 데이터 삭제 완료: ${email}`);
  } catch (error) {
    console.error('인증코드 데이터 삭제 실패:', error);
    throw error;
  }
}

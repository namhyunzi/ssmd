import { realtimeDb } from './firebase';
import { ref, get } from 'firebase/database';
import { User } from 'firebase/auth';

export interface UserConsents {
  id: string;
  userId: string;
  mallId: string;
  shopId: string;
  consentType: "always" | "session" | "once";
  timestamp: string;
  isActive: boolean;
}


/**
 * 사용자의 쇼핑몰 서비스 동의 목록 가져오기
 * @param user Firebase Auth User 객체
 * @returns UserConsents 배열
 */
export async function getUserServiceConsents(user: User): Promise<UserConsents[]> {
  if (!user) return [];
  
  try {
    const consentsRef = ref(realtimeDb, `mallServiceConsents/${user.uid}`);
    const snapshot = await get(consentsRef);
    
    const consents: UserConsents[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // mallServiceConsents/{uid}/{mallId}/{shopId} 구조를 평면화
      Object.keys(data).forEach((mallId) => {
        const mallData = data[mallId];
        Object.keys(mallData).forEach((shopId) => {
          const consentData = mallData[shopId];
          consents.push({
            id: `${mallId}_${shopId}`,
            userId: user.uid,
            mallId,
            shopId,
            consentType: consentData.consentType,
            timestamp: consentData.timestamp,
            isActive: consentData.isActive
          });
        });
      });
    }
    
    return consents;
  } catch (error) {
    console.error('Error getting mall service consents:', error);
    return [];
  }
}

/**
 * 서비스 동의 상태 계산 (mallServiceConsents 구조에 맞게 수정)
 * @param consentType 동의 타입 ("once" | "session" | "always")
 * @param timestamp 동의 시간
 * @param isActive 활성 상태
 * @returns "active" | "expiring" | "expired"
 */
export function calculateConsentStatus(consentType: string, timestamp: string, isActive: boolean): "active" | "expiring" | "expired" {
  if (!isActive) {
    return "expired";
  }
  
  if (consentType === "always") {
    return "active";
  }
  
  if (consentType === "session") {
    // 세션은 24시간 후 만료
    const consentTime = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - consentTime.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    
    if (diffHours >= 24) {
      return "expired";
    } else if (diffHours >= 20) { // 20시간 후부터 만료 예정
      return "expiring";
    } else {
      return "active";
    }
  }
  
  if (consentType === "once") {
    // 일회성은 7일 후 만료
    const consentTime = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - consentTime.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays >= 7) {
      return "expired";
    } else if (diffDays >= 5) { // 5일 후부터 만료 예정
      return "expiring";
    } else {
      return "active";
    }
  }
  
  return "active";
}

/**
 * 서비스 동의 통계 계산 (mallServiceConsents 구조에 맞게 수정)
 * @param consents 서비스 동의 배열
 * @returns 통계 객체
 */
export function calculateConsentStats(consents: UserConsents[]) {
  const stats = {
    total: consents.length,
    active: 0,
    expiring: 0,
    expired: 0
  };
  
  consents.forEach(consent => {
    const status = calculateConsentStatus(consent.consentType, consent.timestamp, consent.isActive);
    stats[status]++;
  });
  
  return stats;
}



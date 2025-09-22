import { realtimeDb } from './firebase';
import { ref, get } from 'firebase/database';
import { User } from 'firebase/auth';

export interface UserConsents {
  id: string;
  userId: string;
  mallId: string;
  shopId: string;
  consentType: "always" | "once";
  createdAt: string;
  expiresAt: string;
  isActive?: boolean;
}


/**
 * 사용자의 쇼핑몰 서비스 동의 목록 가져오기
 * @param user Firebase Auth User 객체
 * @returns UserConsents 배열
 */
export async function getUserServiceConsents(user: User): Promise<UserConsents[]> {
  if (!user) return [];
  
  try {
    // 새로운 구조: userMappings에서 mappedUid 조회 후 mallServiceConsents 조회
    const { getUserMappings } = await import('@/lib/data-storage');
    const mappings = await getUserMappings();
    
    const consents: UserConsents[] = [];
    
    // 각 매핑에 대해 mallServiceConsents 조회
    for (const mapping of mappings) {
      const consentsRef = ref(realtimeDb, `mallServiceConsents/${mapping.mappedUid}`);
      const snapshot = await get(consentsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // mallServiceConsents/{mappedUid}/{mallId}/{shopId} 구조를 평면화
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
              createdAt: consentData.createdAt,
              expiresAt: consentData.expiresAt,
              isActive: consentData.isActive || undefined
            });
          });
        });
      }
    }
    
    return consents;
  } catch (error) {
    console.error('Error getting mall service consents:', error);
    return [];
  }
}

/**
 * 서비스 동의 상태 계산 (expiresAt 기반, isActive 고려)
 * @param consentType 동의 타입 ("once" | "always")
 * @param expiresAt 만료 시간
 * @param isActive 활성 상태 (always일 때만 존재)
 * @returns "active" | "expiring" | "expired"
 */
export function calculateConsentStatus(consentType: string, expiresAt: string, isActive?: boolean): "active" | "expiring" | "expired" {
  const now = new Date();
  const expirationDate = new Date(expiresAt);
  
  // 만료된 경우
  if (now > expirationDate) {
    return "expired";
  }
  
  // always 타입이고 비활성화된 경우
  if (consentType === "always" && isActive === false) {
    return "expired";
  }
  
  // 만료 예정 확인 (7일 이내)
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 7) {
    return "expiring";
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
    const status = calculateConsentStatus(consent.consentType, consent.expiresAt, consent.isActive);
    stats[status]++;
  });
  
  return stats;
}



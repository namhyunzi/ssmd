import { realtimeDb } from './firebase';
import { ref, get, push, remove, query, orderByChild, equalTo, get as getQuery } from 'firebase/database';
import { User } from 'firebase/auth';

export interface ServiceConsent {
  id: string;
  userId: string;
  serviceName: string;
  startDate: string;
  expiryDate: string;
  consentType: "always" | "session" | "once";
  status: "active" | "expiring" | "expired";
  createdAt: number;
  updatedAt: number;
}

/**
 * 사용자의 서비스 동의 목록 가져오기
 * @param user Firebase Auth User 객체
 * @returns ServiceConsent 배열
 */
export async function getUserServiceConsents(user: User): Promise<ServiceConsent[]> {
  if (!user) return [];
  
  try {
    const consentsRef = ref(realtimeDb, 'serviceConsents');
    const q = query(consentsRef, orderByChild('userId'), equalTo(user.uid));
    const snapshot = await getQuery(q);
    
    const consents: ServiceConsent[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((key) => {
        consents.push({
          id: key,
          ...data[key]
        } as ServiceConsent);
      });
    }
    
    return consents;
  } catch (error) {
    console.error('Error getting service consents:', error);
    return [];
  }
}

/**
 * 서비스 동의 상태 계산
 * @param expiryDate 만료일 (YYYY-MM-DD 형식)
 * @returns "active" | "expiring" | "expired"
 */
export function calculateConsentStatus(expiryDate: string): "active" | "expiring" | "expired" {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return "expired";
  } else if (diffDays <= 7) {
    return "expiring";
  } else {
    return "active";
  }
}

/**
 * 서비스 동의 통계 계산
 * @param consents 서비스 동의 배열
 * @returns 통계 객체
 */
export function calculateConsentStats(consents: ServiceConsent[]) {
  const stats = {
    total: consents.length,
    active: 0,
    expiring: 0,
    expired: 0
  };
  
  consents.forEach(consent => {
    const status = calculateConsentStatus(consent.expiryDate);
    stats[status]++;
  });
  
  return stats;
}

/**
 * 새로운 서비스 동의 생성
 * @param user Firebase Auth User 객체
 * @param consentData 동의 데이터
 * @returns 생성 성공 여부
 */
export async function createServiceConsent(
  user: User, 
  consentData: Omit<ServiceConsent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  if (!user) return false;
  
  try {
    const now = Date.now();
    const newConsent = {
      ...consentData,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    };
    
    const consentsRef = ref(realtimeDb, 'serviceConsents');
    await push(consentsRef, newConsent);
    console.log('Service consent created for:', user.email);
    return true;
  } catch (error) {
    console.error('Error creating service consent:', error);
    return false;
  }
}

/**
 * 서비스 동의 삭제
 * @param consentId 동의 ID
 * @returns 삭제 성공 여부
 */
export async function deleteServiceConsent(consentId: string): Promise<boolean> {
  try {
    const consentRef = ref(realtimeDb, `serviceConsents/${consentId}`);
    await remove(consentRef);
    console.log('Service consent deleted:', consentId);
    return true;
  } catch (error) {
    console.error('Error deleting service consent:', error);
    return false;
  }
}

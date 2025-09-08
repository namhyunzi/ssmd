import { realtimeDb } from './firebase';
import { ref, get, push, remove, query, orderByChild, equalTo, get as getQuery, set } from 'firebase/database';
import { User } from 'firebase/auth';

export interface UserConsents {
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

export interface ServiceConsents {
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
export async function getUserServiceConsents(user: User): Promise<UserConsents[]> {
  if (!user) return [];
  
  try {
    const consentsRef = ref(realtimeDb, 'serviceConsents');
    const q = query(consentsRef, orderByChild('userId'), equalTo(user.uid));
    const snapshot = await getQuery(q);
    
    const consents: UserConsents[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((key) => {
        consents.push({
          id: key,
          ...data[key]
        } as UserConsents);
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
  consentData: Omit<UserConsents, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  if (!user) return false;
  
  try {
    const now = new Date().toISOString();
    const newConsent = {
      ...consentData,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    } as UserConsents;
    
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

/**
 * 테스트용 가짜 서비스 동의 데이터 생성
 * @param user Firebase Auth User 객체
 * @returns 생성 성공 여부
 */
export async function createTestServiceConsents(user: User): Promise<boolean> {
  if (!user) return false;
  
  try {
    const now = new Date();
    const nowISO = now.toISOString();
    
    // 현재 날짜 기준으로 다양한 상태의 테스트 데이터 생성
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    // 날짜 계산 헬퍼 함수
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    
    const testConsents = [
      {
        serviceName: "네이버 서비스",
        startDate: formatDate(addDays(today, -30)),
        expiryDate: formatDate(addDays(today, 30)), // 활성 상태 (30일 후 만료)
        consentType: "always" as const,
        status: "active" as const
      },
      {
        serviceName: "카카오톡",
        startDate: formatDate(addDays(today, -15)),
        expiryDate: formatDate(addDays(today, 45)), // 활성 상태 (45일 후 만료)
        consentType: "session" as const,
        status: "active" as const
      },
      {
        serviceName: "구글 드라이브",
        startDate: formatDate(addDays(today, -20)),
        expiryDate: formatDate(addDays(today, 5)), // 만료 예정 (5일 후)
        consentType: "always" as const,
        status: "expiring" as const
      },
      {
        serviceName: "마이크로소프트 365",
        startDate: formatDate(addDays(today, -10)),
        expiryDate: formatDate(addDays(today, 3)), // 만료 예정 (3일 후)
        consentType: "session" as const,
        status: "expiring" as const
      },
      {
        serviceName: "아마존 웹 서비스",
        startDate: formatDate(addDays(today, -60)),
        expiryDate: formatDate(addDays(today, -5)), // 만료됨 (5일 전)
        consentType: "once" as const,
        status: "expired" as const
      },
      {
        serviceName: "스포티파이",
        startDate: formatDate(addDays(today, -25)),
        expiryDate: formatDate(addDays(today, 2)), // 만료 예정 (2일 후)
        consentType: "always" as const,
        status: "expiring" as const
      },
      {
        serviceName: "넷플릭스",
        startDate: formatDate(addDays(today, -7)),
        expiryDate: formatDate(addDays(today, 60)), // 활성 상태 (60일 후 만료)
        consentType: "session" as const,
        status: "active" as const
      },
      {
        serviceName: "유튜브 프리미엄",
        startDate: formatDate(addDays(today, -40)),
        expiryDate: formatDate(addDays(today, -10)), // 만료됨 (10일 전)
        consentType: "once" as const,
        status: "expired" as const
      }
    ];
    
    // 각 테스트 데이터를 Firebase에 저장
    for (const consentData of testConsents) {
      const newConsent = {
        ...consentData,
        userId: user.uid,
        createdAt: nowISO,
        updatedAt: nowISO
      };
      
      const consentsRef = ref(realtimeDb, 'serviceConsents');
      await push(consentsRef, newConsent);
    }
    
    console.log('Test service consents created for:', user.email);
    console.log('Created', testConsents.length, 'test consents');
    return true;
  } catch (error) {
    console.error('Error creating test service consents:', error);
    return false;
  }
}

/**
 * 테스트용 개인정보 제공내역 데이터 생성
 * @param user Firebase Auth User 객체
 * @returns 생성 성공 여부
 */
export async function createTestProvisionLogs(user: User): Promise<boolean> {
  if (!user) return false;
  
  try {
    const today = new Date();
    
    // 날짜 계산 헬퍼 함수
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    
    // 개인정보 제공내역 테스트 데이터
    const testLogs = [
      {
        serviceName: "네이버 서비스",
        provisionDateTime: addDays(today, -1).toISOString(),
        providedInfo: ["이름", "이메일", "휴대폰 번호"]
      },
      {
        serviceName: "카카오톡",
        provisionDateTime: addDays(today, -3).toISOString(),
        providedInfo: ["이름", "휴대폰 번호", "주소"]
      },
      {
        serviceName: "구글 드라이브",
        provisionDateTime: addDays(today, -5).toISOString(),
        providedInfo: ["이름", "이메일"]
      },
      {
        serviceName: "마이크로소프트 365",
        provisionDateTime: addDays(today, -7).toISOString(),
        providedInfo: ["이름", "이메일", "휴대폰 번호", "주소"]
      },
      {
        serviceName: "스포티파이",
        provisionDateTime: addDays(today, -10).toISOString(),
        providedInfo: ["이름", "이메일", "휴대폰 번호"]
      },
      {
        serviceName: "넷플릭스",
        provisionDateTime: addDays(today, -12).toISOString(),
        providedInfo: ["이름", "이메일", "휴대폰 번호", "주소", "상세주소"]
      },
      {
        serviceName: "아마존 웹 서비스",
        provisionDateTime: addDays(today, -15).toISOString(),
        providedInfo: ["이름", "이메일", "주소", "상세주소"]
      },
      {
        serviceName: "유튜브 프리미엄",
        provisionDateTime: addDays(today, -18).toISOString(),
        providedInfo: ["이름", "이메일", "휴대폰 번호"]
      },
      {
        serviceName: "인스타그램",
        provisionDateTime: addDays(today, -20).toISOString(),
        providedInfo: ["이름", "휴대폰 번호"]
      },
      {
        serviceName: "페이스북",
        provisionDateTime: addDays(today, -25).toISOString(),
        providedInfo: ["이름", "이메일", "휴대폰 번호", "주소"]
      }
    ];
    
    // 각 로그 데이터를 Firebase에 저장
    for (const logData of testLogs) {
      const logRef = ref(realtimeDb, `userLogs/${user.uid}`);
      const newLogRef = push(logRef);
      
      const logEntry = {
        id: newLogRef.key,
        ...logData,
        createdAt: new Date().toISOString()
      };
      
      await set(newLogRef, logEntry);
    }
    
    console.log('Test provision logs created for:', user.email);
    console.log('Created', testLogs.length, 'test provision logs');
    return true;
  } catch (error) {
    console.error('Error creating test provision logs:', error);
    return false;
  }
}

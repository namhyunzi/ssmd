import { realtimeDb } from './firebase';
import { ref, set, get, update, remove } from 'firebase/database';
import { User } from 'firebase/auth';

// 새로운 Firebase 구조에 맞는 인터페이스들
export interface UserProfile {
  name: string;
  phone: string;
  address: string;
  detailAddress: string;
  zipCode: string;
  email: string;
  profileCompleted: boolean;
  profileCompletedAt: string;
  updatedAt?: string; // 기존 데이터 호환성을 위해 optional로 변경
}

export interface StorageConfig {
  storageLocations: string[]; // "pc", "cloud", "usb" 등
  configuredAt: string;
  isConfigured: boolean;
}

export interface ConsentInfo {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
  agreedAt: string;
}

export interface UserData {
  email: string;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
  storageConfig?: StorageConfig;
  consent?: ConsentInfo;
}

/**
 * Firebase에 개인정보 저장
 */
export async function saveUserProfile(
  user: User,
  profileData: {
    name: string;
    phone: string;
    address: string;
    detailAddress: string;
    zipCode: string;
    email: string;
  }
): Promise<boolean> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    
    const profile: UserProfile = {
      ...profileData,
      profileCompleted: true,
      profileCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await update(userRef, {
      profile: profile
    });

    console.log('개인정보 Firebase 저장 완료');
    return true;
  } catch (error) {
    console.error('개인정보 저장 실패:', error);
    return false;
  }
}

/**
 * Firebase에서 개인정보 조회
 */
export async function getUserProfile(user: User): Promise<UserProfile | null> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val() as UserData;
      return userData.profile || null;
    }
    return null;
  } catch (error) {
    console.error('개인정보 조회 실패:', error);
    return null;
  }
}

/**
 * Firebase에 분산저장소 설정 저장
 */
export async function saveStorageConfig(
  user: User,
  storageData: {
    storageLocations: string[];
  }
): Promise<boolean> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    
    const storageConfig: StorageConfig = {
      ...storageData,
      configuredAt: new Date().toISOString(),
      isConfigured: true
    };

    await update(userRef, {
      storageConfig: storageConfig,
      updatedAt: new Date().toISOString()
    });

    console.log('분산저장소 설정 Firebase 저장 완료');
    return true;
  } catch (error) {
    console.error('분산저장소 설정 저장 실패:', error);
    return false;
  }
}

/**
 * Firebase에서 분산저장소 설정 조회
 */
export async function getStorageConfig(user: User): Promise<StorageConfig | null> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val() as UserData;
      return userData.storageConfig || null;
    }
    return null;
  } catch (error) {
    console.error('분산저장소 설정 조회 실패:', error);
    return null;
  }
}

/**
 * Firebase에 동의 정보 저장
 */
export async function saveConsentInfo(
  user: User,
  consentData: {
    termsAgreed: boolean;
    privacyAgreed: boolean;
    marketingAgreed: boolean;
  }
): Promise<boolean> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    
    const consent: ConsentInfo = {
      ...consentData,
      agreedAt: new Date().toISOString()
    };

    await update(userRef, {
      consent: consent,
      updatedAt: new Date().toISOString()
    });

    console.log('동의 정보 Firebase 저장 완료');
    return true;
  } catch (error) {
    console.error('동의 정보 저장 실패:', error);
    return false;
  }
}

/**
 * Firebase에서 동의 정보 조회
 */
export async function getConsentInfo(user: User): Promise<ConsentInfo | null> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val() as UserData;
      return userData.consent || null;
    }
    return null;
  } catch (error) {
    console.error('동의 정보 조회 실패:', error);
    return null;
  }
}

/**
 * Firebase에서 전체 사용자 데이터 조회
 */
export async function getUserData(user: User): Promise<UserData | null> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserData;
    }
    return null;
  } catch (error) {
    console.error('사용자 데이터 조회 실패:', error);
    return null;
  }
}

/**
 * 개인정보 제공 로그 저장
 */
export async function saveProvisionLog(
  userId: string,
  logData: {
    mallId: string;
    providedFields: string[];
    consentType: string;
  }
): Promise<boolean> {
  try {
    const logId = Date.now().toString();
    const logRef = ref(realtimeDb, `provisionLogs/${userId}/${logId}`);
    
    const logEntry = {
      mallId: logData.mallId,
      providedFields: logData.providedFields,
      consentType: logData.consentType,
      timestamp: new Date().toISOString()
    };
    
    await set(logRef, logEntry);
    console.log('개인정보 제공 로그 저장 완료:', logEntry);
    return true;
  } catch (error) {
    console.error('로그 저장 실패:', error);
    return false;
  }
}

/**
 * 사용자의 개인정보 제공 로그 조회
 */
export async function getUserProvisionLogs(userId: string): Promise<any[]> {
  try {
    const logsRef = ref(realtimeDb, `provisionLogs/${userId}`);
    const snapshot = await get(logsRef);
    
    if (snapshot.exists()) {
      const logsData = snapshot.val();
      const logsList = Object.keys(logsData).map(logId => ({
        logId,
        ...logsData[logId]
      }));
      
      // 최신순으로 정렬
      return logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    return [];
  } catch (error) {
    console.error('로그 조회 실패:', error);
    return [];
  }
}

/**
 * 쇼핑몰의 허용 필드 조회
 */
export async function getMallAllowedFields(mallId: string): Promise<string[] | null> {
  try {
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const snapshot = await get(mallRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const mallData = snapshot.val();
    return mallData.allowedFields || [];
  } catch (error) {
    console.error('쇼핑몰 정보 조회 오류:', error);
    return null;
  }
}

/**
 * 쇼핑몰 이름 조회
 */
export async function getMallName(mallId: string): Promise<string> {
  try {
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const snapshot = await get(mallRef);
    if (snapshot.exists()) {
      const mallData = snapshot.val();
      return mallData.mallName || mallId;
    }
    return mallId;
  } catch (error) {
    console.error('쇼핑몰 이름 조회 실패:', error);
    return mallId;
  }
}

/**
 * Firebase 테스트 데이터 삭제
 */
export async function cleanupTestData(): Promise<boolean> {
  try {
    // users 경로의 모든 데이터 삭제
    const usersRef = ref(realtimeDb, 'users');
    await remove(usersRef);
    
    // userLogs 경로의 모든 데이터 삭제
    const logsRef = ref(realtimeDb, 'userLogs');
    await remove(logsRef);
    
    console.log('Firebase 테스트 데이터 삭제 완료');
    return true;
  } catch (error) {
    console.error('테스트 데이터 삭제 실패:', error);
    return false;
  }
}


/**
 * 사용자의 특정 쇼핑몰 매핑 조회
 */
export async function getUserMapping(mallId: string, shopId: string) {
  try {
    const { auth } = await import('@/lib/firebase')
    if (!auth.currentUser) {
      throw new Error('로그인이 필요합니다.')
    }
    
    const firebaseUid = auth.currentUser.uid
    const mappingRef = ref(realtimeDb, `userMappings/${mallId}/${firebaseUid}/${shopId}`)
    const snapshot = await get(mappingRef)
    
    if (snapshot.exists()) {
      return {
        mallId,
        shopId,
        ...snapshot.val()
      }
    }
    
    return null
  } catch (error) {
    console.error('사용자 매핑 조회 실패:', error)
    throw error
  }
}

/**
 * 사용자의 모든 쇼핑몰 매핑 조회
 */
export async function getUserMappings() {
  try {
    const { auth } = await import('@/lib/firebase')
    if (!auth.currentUser) {
      throw new Error('로그인이 필요합니다.')
    }
    
    const firebaseUid = auth.currentUser.uid
    const mappingsRef = ref(realtimeDb, `userMappings`)
    const snapshot = await get(mappingsRef)
    
    const userMappings: any[] = []
    if (snapshot.exists()) {
      const data = snapshot.val()
      Object.keys(data).forEach(mallId => {
        if (data[mallId][firebaseUid]) {
          Object.keys(data[mallId][firebaseUid]).forEach(shopId => {
            userMappings.push({
              mallId,
              shopId,
              mappedUid: data[mallId][firebaseUid][shopId].mappedUid,
              createdAt: data[mallId][firebaseUid][shopId].createdAt,
              isActive: data[mallId][firebaseUid][shopId].isActive
            })
          })
        }
      })
    }
    
    return userMappings
  } catch (error) {
    console.error('사용자 매핑 목록 조회 실패:', error)
    throw error
  }
}

// 쇼핑몰 서비스 동의 내역 조회
export async function getMallServiceConsents(mappedUid: string) {
  try {
    const { realtimeDb } = await import('@/lib/firebase')
    const { ref, get } = await import('firebase/database')
    
    const consentRef = ref(realtimeDb, `mallServiceConsents/${mappedUid}`)
    const snapshot = await get(consentRef)
    
    const consents: any[] = []
    if (snapshot.exists()) {
      const data = snapshot.val()
      Object.keys(data).forEach(mallId => {
        Object.keys(data[mallId]).forEach(shopId => {
          consents.push({
            mallId,
            shopId,
            ...data[mallId][shopId]
          })
        })
      })
    }
    
    return consents
  } catch (error) {
    console.error('쇼핑몰 서비스 동의 내역 조회 실패:', error)
    throw error
  }
}

// 개인정보 제공 내역 조회
export async function getProvisionLogs(mappedUid: string) {
  try {
    const { realtimeDb } = await import('@/lib/firebase')
    const { ref, get } = await import('firebase/database')
    
    const logsRef = ref(realtimeDb, `provisionLogs/${mappedUid}`)
    const snapshot = await get(logsRef)
    
    const logs: any[] = []
    if (snapshot.exists()) {
      const data = snapshot.val()
      Object.keys(data).forEach(logId => {
        logs.push({
          logId,
          ...data[logId]
        })
      })
    }
    
    return logs
  } catch (error) {
    console.error('개인정보 제공 내역 조회 실패:', error)
    throw error
  }
}
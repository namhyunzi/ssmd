import { realtimeDb } from './firebase';
import { ref, set, get, push, update, remove } from 'firebase/database';
import { User } from 'firebase/auth';
import { 
  generateEncryptionKey, 
  encryptData, 
  decryptData, 
  generateHash, 
  verifyIntegrity,
  fragmentData,
  reassembleData
} from './encryption';

export interface UserProfileMetadata {
  userId: string;
  storageLocations: string[]; // ['local'], ['local', 'cloud'] 등으로 분산 저장 처리
  fragments: {
    totalFragments: number;
    fragmentOrder: number;
    storageDevice: string;
    encryptedKey: string;
    checksum: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalStorageData {
  encryptedData: string; // 암호화된 개인정보 데이터
  encrypted: boolean;
  key: string; // 암호화 키 (로컬에만 저장)
  checksum: string; // 데이터 무결성 검증용
}

// 기존의 약한 암호화 함수들은 제거됨
// 이제 lib/encryption.ts의 강력한 AES-256 암호화 사용

/**
 * 로컬 저장소에 개인정보 저장
 */
export function saveToLocalStorage(data: LocalStorageData): boolean {
  try {
    const storageKey = 'ssdm_user_profile';
    const jsonString = JSON.stringify(data);
    localStorage.setItem(storageKey, jsonString);
    return true;
  } catch (error) {
    console.error('로컬 저장소 저장 실패:', error);
    return false;
  }
}

/**
 * 로컬 저장소에서 개인정보 읽기
 */
export function loadFromLocalStorage(): LocalStorageData | null {
  try {
    const storageKey = 'ssdm_user_profile';
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('로컬 저장소 읽기 실패:', error);
    return null;
  }
}

/**
 * 개인정보를 로컬에 암호화하여 저장하고 Firebase에 메타데이터 저장
 */
export async function saveProfileWithMetadata(
  user: User,
  profileData: {
    name: string;
    phone: string;
    address: string;
    detailAddress: string;
    zipCode: string;
    email?: string;
  }
): Promise<boolean> {
  try {
    // 1. 강력한 AES-256 암호화 키 생성
    const encryptionKey = generateEncryptionKey(user.uid, Date.now());
    
    // 2. 데이터 암호화
    const dataString = JSON.stringify(profileData);
    const encryptedData = encryptData(dataString, encryptionKey);
    const checksum = generateHash(dataString);
    
    // 3. 로컬 저장소에 암호화된 데이터만 저장
    const localData: LocalStorageData = {
      encryptedData: encryptedData, // 암호화된 데이터만 저장
      encrypted: true,
      key: encryptionKey,
      checksum: checksum
    };
    
    const localSaved = saveToLocalStorage(localData);
    
    if (!localSaved) {
      throw new Error('로컬 저장소 저장 실패');
    }
    
    // 4. Firebase에 메타데이터 저장 (실제 데이터는 저장하지 않음)
    const metadata: UserProfileMetadata = {
      userId: user.uid,
      storageLocations: ['local'], // 현재는 로컬만, 나중에 ['local', 'cloud'] 등으로 확장
      fragments: [{
        totalFragments: 1,
        fragmentOrder: 1,
        storageDevice: 'local',
        encryptedKey: encryptData(encryptionKey, user.uid), // 사용자 ID로 키 암호화
        checksum: checksum
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const metadataRef = ref(realtimeDb, `userProfileMetadata/${user.uid}`);
      await set(metadataRef, metadata);
    } catch (firebaseError: any) {
      console.error('Firebase Realtime Database 저장 오류:', firebaseError);
      console.error('Firebase 오류 코드:', firebaseError?.code);
      console.error('Firebase 오류 메시지:', firebaseError?.message);
      console.error('Firebase 오류 스택:', firebaseError?.stack);
      
      // Firebase 오류를 다시 던져서 상위에서 처리하도록 함
      throw firebaseError;
    }
    
    console.log('개인정보 암호화 저장 및 메타데이터 저장 완료');
    return true;
    
  } catch (error) {
    console.error('개인정보 저장 실패:', error);
    console.error('오류 상세:', error);
    return false;
  }
}

/**
 * 로컬에서 개인정보 읽기 및 복호화
 */
export function loadProfileFromLocal(): {
  name: string;
  phone: string;
  address: string;
  detailAddress: string;
  zipCode: string;
  email?: string;
} | null {
  try {
    const localData = loadFromLocalStorage();
    if (!localData || !localData.encrypted) {
      return null;
    }
    
    // AES-256으로 암호화된 데이터 복호화
    const decryptedDataString = decryptData(localData.encryptedData, localData.key);
    const profileData = JSON.parse(decryptedDataString);
    
    // SHA-256 해시로 무결성 검증
    const isIntegrityValid = verifyIntegrity(decryptedDataString, localData.checksum);
    if (!isIntegrityValid) {
      console.error('데이터 무결성 검증 실패');
      return null;
    }
    
    return profileData;
  } catch (error) {
    console.error('개인정보 복호화 실패:', error);
    return null;
  }
}

/**
 * Firebase Realtime Database에서 메타데이터 읽기
 */
export async function getProfileMetadata(user: User): Promise<UserProfileMetadata | null> {
  try {
    const metadataRef = ref(realtimeDb, `userDataMetadata/${user.uid}`);
    const snapshot = await get(metadataRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserProfileMetadata;
    }
    return null;
  } catch (error) {
    console.error('메타데이터 읽기 실패:', error);
    return null;
  }
}

/**
 * 분산 저장소용 메타데이터 업데이트 (미래 확장용)
 */
export async function updateStorageMetadata(
  user: User,
  newFragments: {
    totalFragments: number;
    fragmentOrder: number;
    storageDevice: string;
    encryptedKey: string;
    checksum: string;
  }[]
): Promise<boolean> {
  try {
    const metadataRef = ref(realtimeDb, `userDataMetadata/${user.uid}`);
    await update(metadataRef, {
      fragments: newFragments,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('메타데이터 업데이트 실패:', error);
    return false;
  }
}

// Firebase 연결 테스트 함수는 제거됨

// 암호화 테스트 함수는 lib/encryption.ts의 testEncryption() 함수 사용
export function testEncryptionDecryption(): boolean {
  const { testEncryption } = require('./encryption');
  return testEncryption();
}

/**
 * 개인정보 제공 로그 저장 (Firebase에 직접 저장)
 */
export async function saveProvisionLog(
  userId: string,
  logData: {
    serviceName: string;
    provisionDate: string;
    provisionTime: string;
    providedInfo: string[];
  }
): Promise<boolean> {
  try {
    const logRef = ref(realtimeDb, `userLogs/${userId}`);
    const newLogRef = push(logRef);
    
    const logEntry = {
      id: newLogRef.key,
      ...logData,
      createdAt: new Date().toISOString()
    };
    
    await set(newLogRef, logEntry);
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
    const logsRef = ref(realtimeDb, `userLogs/${userId}`);
    const snapshot = await get(logsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data);
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
 * Firebase Realtime Database에서 테스트 데이터 삭제
 */
export async function cleanupTestData(): Promise<boolean> {
  try {
    // users 경로의 모든 데이터 삭제
    const usersRef = ref(realtimeDb, 'users');
    await remove(usersRef);
    
    // userProfileMetadata 경로의 모든 데이터 삭제
    const metadataRef = ref(realtimeDb, 'userProfileMetadata');
    await remove(metadataRef);
    
    // userLogs 경로의 모든 데이터 삭제
    const logsRef = ref(realtimeDb, 'userLogs');
    await remove(logsRef);
    
    // userConsents 경로의 모든 데이터 삭제
    const consentsRef = ref(realtimeDb, 'userConsents');
    await remove(consentsRef);
    
    console.log('Firebase 테스트 데이터 삭제 완료');
    return true;
  } catch (error) {
    console.error('테스트 데이터 삭제 실패:', error);
    return false;
  }
}

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

export interface UserDataMetadata {
  userId: string;
  dataType: 'profile' | 'consent' | 'log';
  storageLocation: 'local' | 'cloud' | 'distributed';
  fragments: {
    totalFragments: number;
    fragmentOrder: number;
    storageDevice: string;
    encryptedKey: string;
    checksum: string;
  }[];
  createdAt: number;
  updatedAt: number;
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
    console.log('=== saveToLocalStorage 시작 ===');
    const storageKey = 'ssdm_user_profile';
    console.log('저장 키:', storageKey);
    console.log('저장할 데이터:', data);
    
    const jsonString = JSON.stringify(data);
    console.log('JSON 문자열 길이:', jsonString.length);
    
    localStorage.setItem(storageKey, jsonString);
    
    // 저장 확인
    const saved = localStorage.getItem(storageKey);
    console.log('저장 확인:', saved ? '성공' : '실패');
    console.log('=== saveToLocalStorage 완료 ===');
    return true;
  } catch (error) {
    console.error('로컬 저장소 저장 실패:', error);
    console.error('오류 상세:', error);
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
    console.log('=== saveProfileWithMetadata 시작 ===');
    console.log('사용자:', user.uid);
    console.log('프로필 데이터:', profileData);
    
    // 1. 강력한 AES-256 암호화 키 생성
    const encryptionKey = generateEncryptionKey(user.uid, Date.now());
    console.log('AES-256 암호화 키 생성 완료, 키 길이:', encryptionKey.length);
    
    // 2. 데이터 암호화
    const dataString = JSON.stringify(profileData);
    console.log('JSON 문자열 길이:', dataString.length);
    
    console.log('AES-256 데이터 암호화 시작...');
    const encryptedData = encryptData(dataString, encryptionKey);
    console.log('AES-256 암호화 완료, 암호화된 데이터 길이:', encryptedData.length);
    
    const checksum = generateHash(dataString);
    console.log('SHA-256 해시 생성:', checksum);
    
    // 3. 로컬 저장소에 암호화된 데이터만 저장
    const localData: LocalStorageData = {
      encryptedData: encryptedData, // 암호화된 데이터만 저장
      encrypted: true,
      key: encryptionKey,
      checksum: checksum
    };
    
    console.log('로컬 저장소에 저장할 데이터:', localData);
    const localSaved = saveToLocalStorage(localData);
    console.log('로컬 저장소 저장 결과:', localSaved);
    
    if (!localSaved) {
      throw new Error('로컬 저장소 저장 실패');
    }
    
    // 4. Firebase에 메타데이터 저장 (실제 데이터는 저장하지 않음)
    const metadata: UserDataMetadata = {
      userId: user.uid,
      dataType: 'profile',
      storageLocation: 'local',
      fragments: [{
        totalFragments: 1,
        fragmentOrder: 1,
        storageDevice: 'local',
        encryptedKey: encryptData(encryptionKey, user.uid), // 사용자 ID로 키 암호화
        checksum: checksum
      }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    console.log('Firebase 메타데이터:', metadata);
    console.log('Firebase Realtime Database에 메타데이터 저장 시작...');
    console.log('Firebase realtimeDb 인스턴스:', realtimeDb);
    
    try {
      const metadataRef = ref(realtimeDb, `userDataMetadata/${user.uid}`);
      console.log('Realtime Database 참조 생성:', metadataRef);
      
      await set(metadataRef, metadata);
      console.log('Realtime Database 저장 성공');
    } catch (firebaseError: any) {
      console.error('Firebase Realtime Database 저장 오류:', firebaseError);
      console.error('Firebase 오류 코드:', firebaseError?.code);
      console.error('Firebase 오류 메시지:', firebaseError?.message);
      console.error('Firebase 오류 스택:', firebaseError?.stack);
      
      // Firebase 오류를 다시 던져서 상위에서 처리하도록 함
      throw firebaseError;
    }
    
    console.log('개인정보 암호화 저장 및 메타데이터 저장 완료');
    console.log('로컬 저장소에 암호화된 데이터 저장됨');
    console.log('Firebase에는 메타데이터만 저장됨');
    console.log('=== saveProfileWithMetadata 완료 ===');
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
export async function getProfileMetadata(user: User): Promise<UserDataMetadata | null> {
  try {
    const metadataRef = ref(realtimeDb, `userDataMetadata/${user.uid}`);
    const snapshot = await get(metadataRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as UserDataMetadata;
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
      updatedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('메타데이터 업데이트 실패:', error);
    return false;
  }
}

// Firebase 연결 테스트 함수는 제거됨

// 암호화 테스트 함수는 lib/encryption.ts의 testEncryption() 함수 사용

import CryptoJS from 'crypto-js';

/**
 * 강력한 AES-256 암호화/복호화 유틸리티
 * 개인정보 보호를 위한 안전한 암호화 방식
 */

/**
 * 사용자별 고유 암호화 키 생성
 * @param userId 사용자 ID
 * @param timestamp 타임스탬프 (선택사항)
 * @returns 256비트 암호화 키
 */
export function generateEncryptionKey(userId: string, timestamp?: number): string {
  const salt = timestamp ? `${userId}_${timestamp}` : userId;
  const key = CryptoJS.PBKDF2(salt, 'ssdm_salt_2024', {
    keySize: 256/32,
    iterations: 10000
  });
  return key.toString();
}

/**
 * AES-256으로 데이터 암호화
 * @param data 암호화할 데이터 (JSON 문자열)
 * @param key 암호화 키
 * @returns 암호화된 데이터 (Base64 인코딩)
 */
export function encryptData(data: string, key: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  } catch (error) {
    console.error('데이터 암호화 실패:', error);
    throw new Error('데이터 암호화에 실패했습니다.');
  }
}

/**
 * AES-256으로 데이터 복호화
 * @param encryptedData 암호화된 데이터 (Base64 인코딩)
 * @param key 복호화 키
 * @returns 복호화된 데이터 (JSON 문자열)
 */
export function decryptData(encryptedData: string, key: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!result) {
      throw new Error('복호화된 데이터가 비어있습니다.');
    }
    
    return result;
  } catch (error) {
    console.error('데이터 복호화 실패:', error);
    throw new Error('데이터 복호화에 실패했습니다.');
  }
}

/**
 * 데이터 무결성 검증을 위한 SHA-256 해시 생성
 * @param data 검증할 데이터
 * @returns SHA-256 해시값
 */
export function generateHash(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * 데이터 무결성 검증
 * @param data 검증할 데이터
 * @param expectedHash 예상 해시값
 * @returns 무결성 검증 결과
 */
export function verifyIntegrity(data: string, expectedHash: string): boolean {
  const actualHash = generateHash(data);
  return actualHash === expectedHash;
}

/**
 * 안전한 랜덤 키 생성 (분산저장소용)
 * @param length 키 길이 (기본값: 32)
 * @returns 랜덤 키
 */
export function generateRandomKey(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * 데이터 조각화 (분산저장소용)
 * @param data 조각화할 데이터
 * @param fragmentCount 조각 개수
 * @returns 조각화된 데이터 배열
 */
export function fragmentData(data: string, fragmentCount: number): string[] {
  if (fragmentCount < 2) {
    return [data];
  }
  
  const fragments: string[] = [];
  const chunkSize = Math.ceil(data.length / fragmentCount);
  
  for (let i = 0; i < fragmentCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    fragments.push(data.slice(start, end));
  }
  
  return fragments;
}

/**
 * 조각화된 데이터 재조립
 * @param fragments 조각 배열
 * @returns 재조립된 데이터
 */
export function reassembleData(fragments: string[]): string {
  return fragments.join('');
}

/**
 * 암호화/복호화 테스트 함수 (개발용)
 */
export function testEncryption(): boolean {
  try {
    const testData = {
      name: "홍길동",
      phone: "010-1234-5678",
      address: "서울시 강남구 테헤란로 123번길 45",
      detailAddress: "101동 201호",
      zipCode: "12345",
      email: "test@example.com"
    };
    
    const dataString = JSON.stringify(testData);
    const userId = "test_user_123";
    const encryptionKey = generateEncryptionKey(userId);
    
    console.log('=== AES-256 암호화/복호화 테스트 시작 ===');
    console.log('원본 데이터:', testData);
    console.log('암호화 키 길이:', encryptionKey.length);
    
    // 암호화
    const encrypted = encryptData(dataString, encryptionKey);
    console.log('암호화된 데이터 길이:', encrypted.length);
    
    // 해시 생성
    const hash = generateHash(dataString);
    console.log('데이터 해시:', hash);
    
    // 복호화
    const decrypted = decryptData(encrypted, encryptionKey);
    const decryptedData = JSON.parse(decrypted);
    console.log('복호화된 데이터:', decryptedData);
    
    // 무결성 검증
    const isIntegrityValid = verifyIntegrity(decrypted, hash);
    console.log('무결성 검증:', isIntegrityValid ? '성공' : '실패');
    
    // 데이터 일치성 검증
    const isDataMatch = JSON.stringify(testData) === JSON.stringify(decryptedData);
    console.log('데이터 일치성:', isDataMatch ? '성공' : '실패');
    
    const isSuccess = isIntegrityValid && isDataMatch;
    console.log('전체 테스트 결과:', isSuccess ? '성공' : '실패');
    console.log('=== AES-256 암호화/복호화 테스트 완료 ===');
    
    return isSuccess;
  } catch (error) {
    console.error('암호화 테스트 실패:', error);
    return false;
  }
}

import { realtimeDb } from './firebase';
import { ref, set, get, update } from 'firebase/database';
import { User } from 'firebase/auth';

export interface Users {
  uid: string;
  email: string;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Firebase Realtime Database에 사용자 기본 정보 저장
 * 개인정보는 별도로 users/{uid}/profile에 저장됨
 */
export async function saveUserProfile(
  user: User,
  profileData: Partial<Users>
): Promise<boolean> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const now = new Date().toISOString();
    
    // 기본 사용자 정보만 저장
    const profile: Users = {
      uid: user.uid,
      email: user.email || '',
      profileCompleted: profileData.profileCompleted || false,
      createdAt: profileData.createdAt || now,
      updatedAt: now,
      ...profileData
    };
    
    await set(userRef, profile);
    console.log('사용자 기본 정보 저장 성공:', user.email);
    return true;
  } catch (error) {
    console.error('사용자 기본 정보 저장 실패:', error);
    return false;
  }
}

/**
 * Firebase Realtime Database에서 사용자 기본 정보 가져오기
 * 개인정보는 별도로 users/{uid}/profile에서 조회해야 함
 */
export async function getUserProfile(user: User): Promise<Users | null> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val() as Users;
      console.log('사용자 기본 정보 로드 성공:', user.email);
      return data;
    } else {
      console.log('사용자 기본 정보가 존재하지 않음:', user.email);
      return null;
    }
  } catch (error) {
    console.error('사용자 기본 정보 로드 실패:', error);
    return null;
  }
}

/**
 * 사용자 기본 정보 업데이트
 */
export async function updateUserProfile(
  user: User,
  updates: Partial<Users>
): Promise<boolean> {
  try {
    const userRef = ref(realtimeDb, `users/${user.uid}`);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await update(userRef, updateData);
    console.log('사용자 기본 정보 업데이트 성공:', user.email);
    return true;
  } catch (error) {
    console.error('사용자 기본 정보 업데이트 실패:', error);
    return false;
  }
}

/**
 * 프로필 완료 상태 확인
 */
export function isProfileComplete(profile: Users): boolean {
  return profile.profileCompleted;
}

/**
 * 새 사용자 기본 정보 생성
 */
export async function createDefaultProfile(user: User): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const profile: Users = {
      uid: user.uid,
      email: user.email || '',
      profileCompleted: false,
      createdAt: now,
      updatedAt: now
    };
    
    return await saveUserProfile(user, profile);
  } catch (error) {
    console.error('기본 사용자 정보 생성 실패:', error);
    return false;
  }
}

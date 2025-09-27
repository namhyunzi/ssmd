import { ref, set, get } from 'firebase/database'
import { realtimeDb } from './firebase'

// 로그인 시 세션 생성/업데이트
export const createUserSession = async (userId: string) => {
  try {
    const userSessionRef = ref(realtimeDb, `activeSessions/${userId}`)
    await set(userSessionRef, {
      isActive: true,
      lastSeen: new Date().toISOString()
    })
    console.log('사용자 세션 생성/업데이트:', userId)
  } catch (error) {
    console.error('세션 생성 실패:', error)
  }
}

// 로그아웃 시 세션 비활성화
export const removeUserSession = async (userId: string) => {
  try {
    const userSessionRef = ref(realtimeDb, `activeSessions/${userId}`)
    await set(userSessionRef, {
      isActive: false,
      lastSeen: new Date().toISOString()
    })
    console.log('사용자 세션 비활성화:', userId)
  } catch (error) {
    console.error('세션 비활성화 실패:', error)
  }
}

// 세션 상태 확인
export const checkUserSession = async (userId: string) => {
  try {
    const userSessionRef = ref(realtimeDb, `activeSessions/${userId}`)
    const snapshot = await get(userSessionRef)
    
    if (snapshot.exists()) {
      const sessionData = snapshot.val()
      return sessionData.isActive
    }
    return false
  } catch (error) {
    console.error('세션 확인 실패:', error)
    return false
  }
}

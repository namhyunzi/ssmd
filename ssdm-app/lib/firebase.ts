// Firebase 설정 파일
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Firebase 설정 객체 - 환경변수에서만 가져옴
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 환경변수 검증
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 인스턴스
export const auth = getAuth(app);
export const db = getFirestore(app); // Firestore (NoSQL)
export const realtimeDb = getDatabase(app); // Realtime Database
export const storage = getStorage(app);
export default app;

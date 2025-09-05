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
console.log('=== Firebase 설정 확인 ===');
console.log('API Key:', firebaseConfig.apiKey ? '설정됨' : '없음');
console.log('Project ID:', firebaseConfig.projectId ? '설정됨' : '없음');
console.log('Auth Domain:', firebaseConfig.authDomain ? '설정됨' : '없음');
console.log('Database URL:', firebaseConfig.databaseURL ? '설정됨' : '없음');
console.log('Storage Bucket:', firebaseConfig.storageBucket ? '설정됨' : '없음');
console.log('Messaging Sender ID:', firebaseConfig.messagingSenderId ? '설정됨' : '없음');
console.log('App ID:', firebaseConfig.appId ? '설정됨' : '없음');

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase 환경변수 누락:', {
    apiKey: !!firebaseConfig.apiKey,
    projectId: !!firebaseConfig.projectId,
    authDomain: !!firebaseConfig.authDomain,
    databaseURL: !!firebaseConfig.databaseURL
  });
  throw new Error('Firebase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

// Firebase 앱 초기화
console.log('Firebase 앱 초기화 시작...');
const app = initializeApp(firebaseConfig);
console.log('Firebase 앱 초기화 완료');

// Firebase 서비스 인스턴스
console.log('Firebase 서비스 인스턴스 생성 시작...');
export const auth = getAuth(app);
console.log('Auth 서비스 생성 완료');

export const db = getFirestore(app); // Firestore (NoSQL)
console.log('Firestore 서비스 생성 완료');

export const realtimeDb = getDatabase(app); // Realtime Database
console.log('Realtime Database 서비스 생성 완료');

export const storage = getStorage(app);
console.log('Storage 서비스 생성 완료');

console.log('=== Firebase 초기화 완료 ===');
export default app;

// Firebase Realtime Database에 테스트 데이터 삽입 스크립트
// Node.js 환경에서 실행

require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

// Firebase 설정 (환경변수에서 가져오기)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔧 Firebase 설정 확인:');
console.log('- Project ID:', firebaseConfig.projectId);
console.log('- Database URL:', firebaseConfig.databaseURL);

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function insertTestData() {
  try {
    // 테스트 데이터 1: 정상 (1년 후 만료)
    const normalMall = {
      mallName: "테스트샵",
      apiKey: "testshop-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      allowedFields: ["name", "phone", "address"],
      contactEmail: "test@testshop.com",
      description: "테스트용 쇼핑몰",
      emailSent: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후
      isActive: true
    };

    // 테스트 데이터 2: 만료 임박 (7일 후 만료) - 빨간색으로 표시될 예정
    const expiringSoonMall = {
      mallName: "만료임박몰",
      apiKey: "expiring-mall-x7y8z9a1b2c3d4e5f6g7h8i9j0k1l2m3",
      allowedFields: ["name", "email"],
      contactEmail: "admin@expiring-mall.com",
      description: "곧 만료되는 테스트 쇼핑몰",
      emailSent: false,
      createdAt: new Date(Date.now() - 358 * 24 * 60 * 60 * 1000).toISOString(), // 358일 전 생성
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후 만료
      isActive: true
    };

    // 테스트 데이터 3: 이미 만료됨 (어제 만료) - 빨간색으로 표시될 예정
    const expiredMall = {
      mallName: "만료된몰",
      apiKey: "expired-mall-q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6",
      allowedFields: ["name", "phone", "address", "email"],
      contactEmail: "",
      description: "이미 만료된 테스트 쇼핑몰",
      emailSent: false,
      createdAt: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString(), // 366일 전 생성
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 어제 만료
      isActive: true
    };

    // 데이터 삽입 (englishId를 키로 사용)
    await set(ref(database, 'malls/testshop'), normalMall);
    await set(ref(database, 'malls/expiring-mall'), expiringSoonMall);
    await set(ref(database, 'malls/expired-mall'), expiredMall);

    // API Key 인덱스 삽입
    await set(ref(database, 'apiKeys/testshop-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'), {
      mallId: "testshop",
      createdAt: new Date().toISOString()
    });
    await set(ref(database, 'apiKeys/expiring-mall-x7y8z9a1b2c3d4e5f6g7h8i9j0k1l2m3'), {
      mallId: "expiring-mall",
      createdAt: new Date().toISOString()
    });
    await set(ref(database, 'apiKeys/expired-mall-q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6'), {
      mallId: "expired-mall",
      createdAt: new Date().toISOString()
    });

    console.log('✅ 테스트 데이터 삽입 완료!');
    console.log('📋 삽입된 데이터:');
    console.log('1. 테스트샵 - 정상 (1년 후 만료)');
    console.log('2. 만료임박몰 - 7일 후 만료 (🔴 빨간색 경고)');
    console.log('3. 만료된몰 - 이미 만료됨 (🔴 빨간색 경고)');
    
  } catch (error) {
    console.error('❌ 데이터 삽입 실패:', error);
  }
}

// 스크립트 실행
insertTestData();

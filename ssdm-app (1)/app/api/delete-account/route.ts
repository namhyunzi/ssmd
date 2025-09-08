import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Firebase Admin SDK 초기화 - delete-account 전용
let adminApp: App | null;

// 환경변수 확인
console.log('Firebase Admin SDK 초기화 중...');

try {
  // 기존 앱이 있는지 확인
  const existingApps = getApps();
  const existingApp = existingApps.find(app => app.name === 'delete-account-app');
  
  if (existingApp) {
    adminApp = existingApp;
  } else {
    // delete-account 전용 앱으로 초기화 (databaseURL 포함)
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    }, 'delete-account-app');
  }
} catch (error) {
  console.error('Firebase Admin SDK 초기화 실패:', error);
  adminApp = null;
}

export async function POST(request: NextRequest) {
  try {
    const { uid, email } = await request.json();

    if (!uid || !email) {
      return NextResponse.json(
        { error: '사용자 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!adminApp) {
      return NextResponse.json(
        { error: '서버 설정 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    try {
      // 1. 먼저 사용자가 존재하는지 확인
      let userExists = false;
      try {
        const auth = getAuth(adminApp);
        const userRecord = await auth.getUser(uid);
        userExists = true;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          userExists = false;
        } else {
          throw error;
        }
      }

      // Firebase Admin SDK로 Realtime Database 데이터 삭제
      const adminDb = getDatabase(adminApp);
      
      // 1. 직접 경로로 삭제 가능한 데이터들
      const directDeletePaths = [
        `users/${uid}`,
        `userProfileMetadata/${uid}`,
        `userLogs/${uid}`,
        `userConsents/${uid}`,
        `verifications/${email.replace(/[.#$[\]]/g, '_')}`
      ];

      for (const path of directDeletePaths) {
        try {
          await adminDb.ref(path).remove();
        } catch (error: any) {
          console.log(`삭제 실패: ${path}`, error.message);
        }
      }

      // serviceConsents 삭제
      try {
        const serviceConsentsRef = adminDb.ref('serviceConsents');
        const serviceConsentsSnapshot = await serviceConsentsRef.orderByChild('userId').equalTo(uid).once('value');
        
        if (serviceConsentsSnapshot.exists()) {
          const serviceConsentsData = serviceConsentsSnapshot.val();
          const serviceConsentKeys = Object.keys(serviceConsentsData);
          
          for (const key of serviceConsentKeys) {
            await adminDb.ref(`serviceConsents/${key}`).remove();
          }
        }
      } catch (error: any) {
        console.log('serviceConsents 삭제 실패:', error.message);
      }


      // 3. 사용자가 존재하는 경우에만 Auth 계정 삭제
      if (userExists) {
        await getAuth(adminApp).deleteUser(uid);
      }
      return NextResponse.json({
        success: true,
        message: '계정이 성공적으로 삭제되었습니다.',
      });

    } catch (error: any) {
      console.error('계정 삭제 오류:', error);
      
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: '계정 삭제에 실패했습니다.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('계정 삭제 API 오류:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


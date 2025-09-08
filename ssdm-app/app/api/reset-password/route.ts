import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK 초기화
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: '이메일과 새 비밀번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 유효성 검사
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { error: '비밀번호는 영문과 숫자를 포함해야 합니다.' },
        { status: 400 }
      );
    }

    try {
      // Firebase Admin SDK로 사용자 찾기
      const userRecord = await getAuth().getUserByEmail(email);
      
      if (!userRecord) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // Firebase Admin SDK로 비밀번호 업데이트
      await getAuth().updateUser(userRecord.uid, {
        password: newPassword
      });

      return NextResponse.json({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.',
      });

    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error);
      
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      } else if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: '비밀번호가 너무 약합니다.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: '비밀번호 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('비밀번호 변경 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

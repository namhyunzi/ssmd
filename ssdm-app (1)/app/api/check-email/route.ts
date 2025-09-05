import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // Firebase Auth에서 해당 이메일로 가입된 계정이 있는지 확인
    try {
      console.log('이메일 중복 확인 시작:', email);
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      console.log('Firebase Auth 응답:', signInMethods);
      
      if (signInMethods.length > 0) {
        // 이미 가입된 이메일
        return NextResponse.json({
          exists: true,
          message: "이미 가입한 이메일입니다. '이메일 로그인'으로 로그인해주세요."
        });
      } else {
        // 사용 가능한 이메일
        return NextResponse.json({
          exists: false,
          message: "사용 가능한 이메일입니다."
        });
      }
    } catch (error: any) {
      // Firebase 오류 처리
      console.error('Firebase Auth 오류 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        email: email
      });
      
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: '올바른 이메일 형식이 아닙니다.' },
          { status: 400 }
        );
      } else if (error.code === 'auth/configuration-not-found') {
        return NextResponse.json(
          { error: 'Firebase Authentication이 설정되지 않았습니다.' },
          { status: 500 }
        );
      } else if (error.code === 'auth/project-not-found') {
        return NextResponse.json(
          { error: 'Firebase 프로젝트를 찾을 수 없습니다.' },
          { status: 500 }
        );
      } else if (error.code === 'auth/network-request-failed') {
        return NextResponse.json(
          { error: '네트워크 연결을 확인해주세요.' },
          { status: 500 }
        );
      }
      
      // 기타 Firebase 오류
      return NextResponse.json(
        { 
          error: 'Firebase 인증 서비스 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('이메일 중복 확인 전체 오류:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      type: typeof error
    });
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

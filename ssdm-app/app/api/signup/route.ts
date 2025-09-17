import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import { removeVerificationCode } from '@/lib/firebase-verification';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    // 입력값 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
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

    // 비밀번호 강도 검증
    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { error: '비밀번호는 영문과 숫자를 포함해야 합니다.' },
        { status: 400 }
      );
    }

    // Firebase Auth로 사용자 생성
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 사용자 프로필 업데이트 (사용자명 설정)
      // username이 없으면 이메일의 @ 앞부분을 사용
      const displayName = username || email.split('@')[0];
      await updateProfile(user, {
        displayName: displayName
      });

      // 비밀번호 해시화 (추가 보안을 위해)
      const hashedPassword = await bcrypt.hash(password, 12);

      // 회원가입 성공 시 임시 인증코드 데이터 정리
      try {
        await removeVerificationCode(email);
      } catch (cleanupError) {
        console.warn('인증코드 정리 중 오류 (무시 가능):', cleanupError);
      }

      console.log('회원가입 성공:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });

      return NextResponse.json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }
      });

    } catch (error: any) {
      console.error('Firebase Auth 오류:', error);

      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { error: '이미 사용 중인 이메일입니다.' },
          { status: 400 }
        );
      } else if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: '비밀번호가 너무 약합니다.' },
          { status: 400 }
        );
      } else if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: '올바른 이메일 형식이 아닙니다.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: '회원가입 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('회원가입 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

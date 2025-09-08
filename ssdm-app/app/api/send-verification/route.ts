import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail, isValidEmail } from '@/lib/email';
import { generateVerificationCode } from '@/lib/verification';
import { saveVerificationCode } from '@/lib/firebase-verification';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // 이메일 유효성 검사
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 인증코드 생성
    const verificationCode = generateVerificationCode();

    // Firebase에 인증코드 먼저 저장 (빠른 응답을 위해)
    const codeSaved = await saveVerificationCode(email, verificationCode);
    
    if (codeSaved) {
      // Vercel 서버리스 환경에서는 await를 사용해서 이메일 발송 완료까지 기다림
      const emailSent = await sendVerificationEmail(email, verificationCode);
      
      if (emailSent) {
        return NextResponse.json({
          success: true,
          message: '인증코드가 발송되었습니다.',
        });
      } else {
        return NextResponse.json(
          { error: '이메일 발송에 실패했습니다.' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: '인증코드 저장에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('이메일 발송 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sendApiKeyEmail, isValidEmail } from '@/lib/email';

interface SendApiKeyRequest {
  toEmail: string;
  mallName: string;
  apiKey: string;
  allowedFields: string[];
}

/**
 * API Key 이메일 발송 API
 * POST /api/send-apikey
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      toEmail, 
      mallName, 
      apiKey, 
      allowedFields 
    }: SendApiKeyRequest = await request.json();

    // 입력값 검증
    if (!toEmail || !mallName || !apiKey || !allowedFields) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    if (!isValidEmail(toEmail)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // API Key 이메일 발송
    const emailSent = await sendApiKeyEmail(
      toEmail,
      mallName,
      apiKey,
      allowedFields
    );

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'API Key 이메일이 성공적으로 발송되었습니다.',
        sentTo: toEmail
      });
    } else {
      return NextResponse.json(
        { error: 'API Key 이메일 발송에 실패했습니다.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Key 이메일 발송 API 오류:', error);
    return NextResponse.json(
      { 
        error: 'API Key 이메일 발송 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { realtimeDb } from '@/lib/firebase';
import { ref, update, get } from 'firebase/database';

interface UpdateEmailStatusRequest {
  mallId: string;
  emailSent: boolean;
}

/**
 * 이메일 발송 상태 업데이트 API
 * POST /api/update-email-status
 */
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminKey = request.headers.get('X-Admin-Key');
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { mallId, emailSent }: UpdateEmailStatusRequest = await request.json();

    // 입력값 검증
    if (!mallId || typeof emailSent !== 'boolean') {
      return NextResponse.json(
        { error: 'mallId와 emailSent는 필수입니다.' },
        { status: 400 }
      );
    }

    // 쇼핑몰 존재 확인 (mallId가 이제 englishId)
    const mallRef = ref(realtimeDb, `malls/${mallId}`);
    const snapshot = await get(mallRef);
    
    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: '존재하지 않는 쇼핑몰입니다.' },
        { status: 404 }
      );
    }

    // 이메일 발송 상태 업데이트
    const updateData: any = {
      emailSent,
      updatedAt: new Date().toISOString()
    };

    if (emailSent) {
      updateData.emailSentAt = new Date().toISOString();
    }

    await update(mallRef, updateData);

    console.log(`이메일 상태 업데이트: ${mallId} -> ${emailSent ? '발송완료' : '미발송'}`);

    return NextResponse.json({
      success: true,
      message: `이메일 상태가 ${emailSent ? '발송완료' : '미발송'}로 업데이트되었습니다.`
    });

  } catch (error) {
    console.error('이메일 상태 업데이트 API 오류:', error);
    return NextResponse.json(
      { 
        error: '이메일 상태 업데이트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * CORS 처리
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    },
  });
}

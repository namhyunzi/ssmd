import { NextResponse } from 'next/server';
import { cleanupExpiredCodes } from '@/lib/firebase-verification';

/**
 * 만료된 인증코드 수동 정리 API
 * - 개발/테스트 환경에서 수동으로 정리할 때 사용
 * - 관리자 페이지에서 정리 버튼으로 활용 가능
 */
export async function POST() {
  try {
    await cleanupExpiredCodes();
    
    return NextResponse.json({
      success: true,
      message: '만료된 인증코드 정리 완료'
    });
  } catch (error) {
    console.error('인증코드 정리 API 오류:', error);
    return NextResponse.json(
      { 
        error: '인증코드 정리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청으로도 정리 가능 (브라우저에서 직접 호출 가능)
 */
export async function GET() {
  return POST();
}

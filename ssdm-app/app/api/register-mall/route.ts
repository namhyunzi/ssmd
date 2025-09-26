import { NextRequest, NextResponse } from 'next/server'
import { ref, get, set } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'

interface RegisterMallRequest {
  mallName: string
  englishId: string
  requiredFields: string[]
  contactEmail?: string
  description?: string
  allowedDomains: string[]
}

interface MallData {
  mallName: string        // 표시용 이름
  allowedFields: string[]
  contactEmail: string
  description: string
  allowedDomains: string[]
  createdAt: string
  expiresAt: string       // API Key 만료일 (1년)
  isActive: boolean
}


// API Key 생성 함수 (영문 식별자 사용)
function generateApiKey(englishId: string): string {
  // Web Crypto API를 사용 (128bit = 16bytes)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const randomString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${englishId}-${randomString}`;
}

/**
 * 쇼핑몰 등록 API
 * POST /api/register-mall
 */
export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인 (실제 운영에서는 JWT 토큰 검증 등)
    const adminKey = request.headers.get('X-Admin-Key');
    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'admin_secret_key_12345';
    
    if (adminKey !== expectedAdminKey) {
      console.log('관리자 키 불일치:', { received: adminKey, expected: expectedAdminKey });
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { mallName, englishId, requiredFields, contactEmail, description, allowedDomains }: RegisterMallRequest = await request.json();

    // 입력값 검증
    if (!mallName || !englishId || !requiredFields || !Array.isArray(requiredFields) || !allowedDomains || !Array.isArray(allowedDomains)) {
      return NextResponse.json(
        { error: 'mallName, englishId, requiredFields(배열), allowedDomains(배열)은 필수입니다.' },
        { status: 400 }
      );
    }

    // 허용 도메인 검증
    if (allowedDomains.length === 0) {
      return NextResponse.json(
        { error: '최소 하나 이상의 허용 도메인을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 도메인 형식 검증 및 정규화
    const normalizedDomains: string[] = [];
    for (const domain of allowedDomains) {
      if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
        return NextResponse.json(
          { error: '유효하지 않은 도메인이 포함되어 있습니다.' },
          { status: 400 }
        );
      }
      
      // URL에서 도메인 추출 함수
      const extractDomain = (input: string): string => {
        try {
          const trimmed = input.trim();
          
          // URL 형태인지 확인하고 도메인 추출
          if (trimmed.includes('://')) {
            const url = new URL(trimmed);
            return url.host;
          }
          
          // 프로토콜 없이 시작하는 경우 정리
          return trimmed.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
        } catch {
          // URL 파싱 실패시 기본 정리만 수행
          return input.trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
        }
      };

      const normalizedDomain = extractDomain(domain);
      
      // 정규화된 도메인 검증 (포트 번호 포함 허용)
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*(:[\d]{1,5})?$/;
      if (!domainRegex.test(normalizedDomain)) {
        return NextResponse.json(
          { error: `잘못된 도메인 형식입니다: ${normalizedDomain}` },
          { status: 400 }
        );
      }
      
      normalizedDomains.push(normalizedDomain);
    }

    // 쇼핑몰 이름 길이 검사
    if (mallName.trim().length < 2) {
      return NextResponse.json(
        { error: '쇼핑몰 이름은 최소 2자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 영문 식별자 유효성 검사 (영문, 숫자, 하이픈만 허용, 3-20자)
    const englishIdRegex = /^[a-z0-9-]{3,20}$/;
    if (!englishIdRegex.test(englishId)) {
      return NextResponse.json(
        { error: '영문 식별자는 영문 소문자, 숫자, 하이픈만 사용 가능하며 3-20자여야 합니다.' },
        { status: 400 }
      );
    }

    // 영문 식별자 중복 체크 (키가 이미 존재하면 중복)
    const mallCheckRef = ref(realtimeDb, `malls/${englishId}`);
    const mallSnapshot = await get(mallCheckRef);
    
    if (mallSnapshot.exists()) {
      return NextResponse.json(
        { error: '이미 사용 중인 영문 식별자입니다.' },
        { status: 409 }
      );
    }

    // API Key 생성 (영문 식별자 사용)
    let apiKey;
    try {
      apiKey = generateApiKey(englishId);
      console.log('생성된 apiKey:', apiKey.substring(0, 20) + '...');
    } catch (err) {
      console.error('API Key 생성 오류:', err);
      throw new Error('API Key 생성에 실패했습니다.');
    }

    // 만료일 설정 (1년 후)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const expiresAtISO = expiresAt.toISOString();

    // 쇼핑몰 데이터 저장 (API Key는 환경변수로만 관리)
    const mallData: MallData = {
      mallName,
      allowedFields: requiredFields,
      contactEmail: contactEmail || '',
      description: description || '',
      allowedDomains: normalizedDomains, // 정규화된 도메인 사용
      createdAt: new Date().toISOString(),
      expiresAt: expiresAtISO,
      isActive: true
    };

    // englishId를 키로 사용
    const mallRef = ref(realtimeDb, `malls/${englishId}`);
    await set(mallRef, mallData);

    console.log(`쇼핑몰 등록 성공: ${englishId} (${mallName})`);

    return NextResponse.json({
      mallId: englishId,  // englishId를 mallId로 반환
      apiKey,
      allowedFields: requiredFields,
      expiresAt: expiresAtISO
    });

  } catch (error) {
    console.error('쇼핑몰 등록 API 오류:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: '쇼핑몰 등록 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * 등록된 쇼핑몰 목록 조회 또는 단일 쇼핑몰 정보 조회
 * GET /api/register-mall
 * GET /api/register-mall?mallId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mallId = searchParams.get('mallId');

    // 단일 쇼핑몰 정보 조회
    if (mallId) {
      const mallRef = ref(realtimeDb, `malls/${mallId}`);
      const snapshot = await get(mallRef);

      if (!snapshot.exists()) {
        return NextResponse.json(
          { error: '등록되지 않은 쇼핑몰입니다.' },
          { status: 404 }
        );
      }

      const mallData = snapshot.val();

      return NextResponse.json({
        success: true,
        mall: {
          mallName: mallData.mallName,
          allowedFields: mallData.allowedFields,
          isActive: mallData.isActive
        }
      });
    }

    // 전체 쇼핑몰 목록 조회
    console.log('쇼핑몰 목록 조회 시작...');
    
    const mallsRef = ref(realtimeDb, 'malls');
    console.log('Firebase 참조 생성 완료');
    
    const snapshot = await get(mallsRef);
    console.log('Firebase 데이터 조회 완료:', snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log('등록된 쇼핑몰이 없음');
      return NextResponse.json({ success: true, malls: [] });
    }

    const mallsData = snapshot.val();
    console.log('조회된 데이터 키들:', Object.keys(mallsData));
    
    const malls = Object.values(mallsData) as MallData[];
    console.log('변환된 쇼핑몰 개수:', malls.length);

    // mallId로 통일 (호환성)
    const mallsWithCompatibility = malls.map((mall, index) => ({
      ...mall,
      mallId: Object.keys(mallsData)[index] // englishId를 mallId로 사용
    }));

    return NextResponse.json({ 
      success: true, 
      malls: mallsWithCompatibility.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });

  } catch (error) {
    console.error('쇼핑몰 목록 조회 오류:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false,
        error: '쇼핑몰 목록 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : undefined
      },
      { status: 500 }
    );
  }
}

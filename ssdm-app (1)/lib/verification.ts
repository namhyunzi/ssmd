// 이메일 인증 관련 유틸리티 함수들

/**
 * 6자리 랜덤 인증코드 생성
 * @returns 6자리 숫자 문자열 (예: "123456")
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 인증코드 유효기간 계산 (3분)
 * @returns 만료 시간 (Date 객체)
 */
export function getExpirationTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + 3 * 60 * 1000); // 3분 후
}

/**
 * 인증코드 만료 여부 확인
 * @param expirationTime 만료 시간
 * @returns 만료되었으면 true, 아니면 false
 */
export function isCodeExpired(expirationTime: Date): boolean {
  return new Date() > expirationTime;
}

/**
 * 인증코드 형식 검증
 * @param code 입력된 코드
 * @returns 유효한 형식이면 true
 */
export function isValidCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

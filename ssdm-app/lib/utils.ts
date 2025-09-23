import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 휴대폰 번호 뒷자리 포맷팅 함수 (8자리 입력용)
 * @param phone - 포맷팅할 전화번호 뒷자리 문자열 (8자리)
 * @returns 포맷팅된 전화번호 문자열 (1234-5678 형식)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  const numbers = phone.replace(/\D/g, '')
  
  // 8자리 뒷자리만 처리 (1234-5678 형식)
  if (numbers.length <= 4) {
    return numbers
  } else if (numbers.length <= 8) {
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
  } else {
    // 8자리 초과 시 자르기
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}`
  }
}

/**
 * 전체 휴대폰 번호 포맷팅 함수 (표시용)
 * @param phone - 포맷팅할 전체 전화번호 문자열
 * @returns 포맷팅된 전화번호 문자열 (010-1234-5678 형식)
 */
export function formatFullPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  const numbers = phone.replace(/\D/g, '')
  
  if (numbers.length === 11) {
    // 010-1234-5678 형식 (010 + 8자리)
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  } else if (numbers.length === 10) {
    // 02-1234-5678 형식 (지역번호 + 8자리)
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
  } else if (numbers.length === 8) {
    // 1234-5678 형식 (8자리만)
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
  }
  
  return phone
}

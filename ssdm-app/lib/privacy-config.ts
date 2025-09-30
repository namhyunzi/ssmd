// 개인정보 시스템 연동 설정
export const PRIVACY_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
  mallId: process.env.MALL_ID || '',
  apiKey: process.env.PRIVACY_SYSTEM_API_KEY || '',
  sessionTypes: {
    paper: { 
      name: process.env.PAPER_SESSION_NAME || '종이송장 (관리자용)', 
      ttl: parseInt(process.env.PAPER_SESSION_TTL || '3600'), 
      extensible: false 
    },
    qr: { 
      name: process.env.QR_SESSION_NAME || 'QR송장 (배송기사용)', 
      ttl: parseInt(process.env.QR_SESSION_TTL || '43200'), 
      extensible: true, 
      maxExtensions: parseInt(process.env.QR_MAX_EXTENSIONS || '3')
    }
  }
}

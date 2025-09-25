import jwt from 'jsonwebtoken'

// 회원사(쇼핑몰)과 통신시 JWT 검증
export function verifyJWT(token: string, apiKey: string): any {
  try {
    const decoded = jwt.verify(token, apiKey, {
      algorithms: ['HS256']
    })
    return decoded
  } catch (error) {
    console.error('JWT 검증 에러:', error)
    throw new Error('JWT 검증에 실패했습니다')
  }
}

// 권함위임사(택배사)와 통신시 사용할 JWT
export function generateDelegateJWT(shopId: string, mallId: string, requestedFields: string[]): string {
  const jwtPayload = {
    shopId: shopId,
    mallId: mallId,
    fields: requestedFields,
    one_time: true,
    exp: Math.floor(Date.now() / 1000) + (60 * 60)
  }

  const privateKey = process.env.SSDM_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('SSDM_PRIVATE_KEY가 설정되지 않았습니다.')
  }

  return jwt.sign(jwtPayload, privateKey, { algorithm: 'ES256' })
}

// 권함위임사(택배사)와 통신시 JWT 검증
export function verifyDelegateJWT(token: string, publicKey: string): any {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['ES256']
    })
    return decoded
  } catch (error) {
    console.error('택배사용 JWT 검증 에러:', error)
    throw new Error('택배사용 JWT 검증에 실패했습니다')
  }
}

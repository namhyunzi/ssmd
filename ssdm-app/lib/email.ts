import nodemailer from 'nodemailer';

// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER, // Gmail 주소
    pass: process.env.GMAIL_APP_PASSWORD, // 앱 비밀번호
  },
  // Vercel 환경에서 TLS 인증서 검증 문제 해결
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * 인증코드 이메일 발송
 * @param toEmail 받는 사람 이메일
 * @param verificationCode 6자리 인증코드
 * @returns 발송 성공 여부
 */
export async function sendVerificationEmail(
  toEmail: string,
  verificationCode: string
): Promise<boolean> {
  try {
    // Vercel 환경에서 SMTP 연결 검증
    await new Promise((resolve, reject) => {
      transporter.verify(function (error, success) {
        if (error) {
          console.error('SMTP 연결 검증 실패:', error);
          reject(error);
        } else {
          console.log('SMTP 서버가 메시지를 받을 준비가 되었습니다');
          resolve(success);
        }
      });
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject: 'SSMD - 이메일 인증코드',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: Arial, sans-serif; background-color: #fafafa;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #333; font-size: 28px; font-weight: bold; margin-bottom: 10px;">SSMD</h1>
            <h2 style="color: #333; font-size: 18px; font-weight: bold; margin: 0;">인증코드를 확인해주세요.</h2>
          </div>
          
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="background: white; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <span style="font-size: 48px; font-weight: bold; color: #333; letter-spacing: 4px;">
                ${verificationCode}
              </span>
            </div>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 8px 0;">이메일 인증 절차에 따라 이메일 인증코드를 발급해드립니다.</p>
            <p style="margin: 0;">인증코드는 이메일 발송 시점으로부터 3분동안 유효합니다.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
            <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">개인정보보호정책 | 이용약관</p>
            <p style="color: #999; font-size: 11px; margin: 0;">© 2024 SSMD. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    // Vercel 환경에서 Promise 기반 처리
    const result = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('이메일 발송 실패:', error);
          reject(error);
        } else {
          console.log('이메일 발송 성공:', info.messageId);
          resolve(info);
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
}

/**
 * 이메일 주소 유효성 검사
 * @param email 검사할 이메일 주소
 * @returns 유효한 이메일이면 true
 */
/**
 * API Key 발급 이메일 발송
 * @param toEmail 받는 사람 이메일
 * @param mallName 쇼핑몰 이름
 * @param apiKey 발급된 API Key
 * @param allowedFields 허용된 개인정보 필드들
 * @returns 발송 성공 여부
 */
export async function sendApiKeyEmail(
  toEmail: string,
  mallName: string,
  apiKey: string,
  allowedFields: string[]
): Promise<boolean> {
  try {
    // SMTP 연결 검증
    await new Promise((resolve, reject) => {
      transporter.verify(function (error, success) {
        if (error) {
          console.error('SMTP 연결 검증 실패:', error);
          reject(error);
        } else {
          console.log('SMTP 서버가 메시지를 받을 준비가 되었습니다');
          resolve(success);
        }
      });
    });

    const fieldLabels: { [key: string]: string } = {
      name: '이름',
      phone: '휴대폰번호',
      address: '주소',
      email: '이메일'
    };

    const allowedFieldsText = allowedFields.map(field => fieldLabels[field] || field).join(', ');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject: `SSMD API 연동 정보 - ${mallName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: Arial, sans-serif; background-color: #fafafa;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #333; font-size: 28px; font-weight: bold; margin-bottom: 10px;">SSMD</h1>
            <h2 style="color: #333; font-size: 18px; font-weight: bold; margin: 0;">API 연동 정보</h2>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 30px;">
            <h3 style="color: #333; font-size: 16px; font-weight: bold; margin-bottom: 20px;">📋 연동 정보</h3>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #666;">쇼핑몰명:</strong>
              <span style="margin-left: 10px; color: #333;">${mallName}</span>
            </div>
            
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #666;">API Key:</strong>
              <div style="margin-top: 8px; font-family: monospace; color: #333; background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; border-left: 4px solid #007bff;">
                ${apiKey}
              </div>
            </div>
            
            <div style="margin-bottom: 0;">
              <strong style="color: #666;">제공 가능 정보:</strong>
              <span style="margin-left: 10px; color: #333;">${allowedFieldsText}</span>
            </div>
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin-bottom: 30px;">
            <h3 style="color: #0066cc; font-size: 14px; font-weight: bold; margin-bottom: 10px;">🔗 API 사용 방법</h3>
            <ol style="color: #333; font-size: 13px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>UID 생성: <code>POST /api/generate-uid</code></li>
              <li>JWT 발급: <code>POST /api/issue-jwt</code></li>
              <li>개인정보 요청: 택배사가 JWT로 요청</li>
              <li>보안뷰어 제공: 암호화된 개인정보 열람</li>
            </ol>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 30px;">
            <p style="color: #856404; font-size: 13px; margin: 0;">
              <strong>⚠️ 보안 주의사항:</strong> API Key는 외부에 노출되지 않도록 주의하시고, 환경변수로 관리해주세요.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 8px 0;">API 연동 관련 문의사항이 있으시면 언제든 연락주세요.</p>
            <p style="margin: 0;">기술 지원: ${process.env.SUPPORT_EMAIL || 'support@ssmd.com'}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">SSMD 개인정보 보호 시스템</p>
            <p style="color: #999; font-size: 11px; margin: 0;">© 2024 SSMD. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    // 이메일 발송
    const result = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('API Key 이메일 발송 실패:', error);
          reject(error);
        } else {
          console.log('API Key 이메일 발송 성공:', info.messageId);
          resolve(info);
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('API Key 이메일 발송 실패:', error);
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

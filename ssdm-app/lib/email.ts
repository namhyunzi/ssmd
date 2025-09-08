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
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

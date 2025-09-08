# Gmail SMTP 설정 가이드

`.env.local` 파일에 다음 Gmail 설정을 추가하세요:

```bash
# Gmail SMTP 설정
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=kmnf ebye ufdu mihu

# 기존 Firebase 설정...
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAZ1UbNpOwoWxeonTcJx2wPgdUbC3FzMxY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ssmd-715a2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://ssmd-715a2-default-rtdb.asia-southeast1.firebasedatabase.app/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ssmd-715a2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ssmd-715a2.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=824280696096
NEXT_PUBLIC_FIREBASE_APP_ID=1:824280696096:web:ef3c7df200d268e4998345
```

## 주의사항
- `GMAIL_USER`를 실제 Gmail 주소로 변경하세요
- 앱 비밀번호는 이미 제공된 것을 사용합니다: `kmnf ebye ufdu mihu`

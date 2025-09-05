# Firebase 설정 체크리스트

Firebase 콘솔(https://console.firebase.google.com)에서 다음 설정들을 확인하고 활성화해주세요:

## 📋 **필수 설정 체크리스트**

### **1. Authentication 설정**
- [ ] **Authentication 활성화**: 좌측 메뉴 > Authentication > 시작하기
- [ ] **이메일/비밀번호 로그인 활성화**: 
  - Authentication > Sign-in method
  - Email/Password > 사용 설정
  - **이메일 링크(비밀번호 없는 로그인) 사용 중지** (체크 해제)

### **2. Realtime Database 설정**
- [ ] **Realtime Database 생성**: 
  - 좌측 메뉴 > Realtime Database > 데이터베이스 만들기
  - 위치: **asia-southeast1** (싱가포르)
  - 보안 규칙: **테스트 모드**로 시작

### **3. Firestore Database 설정** (선택사항)
- [ ] **Firestore 생성**: 
  - 좌측 메뉴 > Firestore Database > 데이터베이스 만들기
  - 위치: **asia-southeast1** (싱가포르)
  - 보안 규칙: **테스트 모드**로 시작

### **4. Storage 설정** (선택사항)
- [ ] **Storage 활성화**: 
  - 좌측 메뉴 > Storage > 시작하기
  - 위치: **asia-southeast1** (싱가포르)

## 🔧 **보안 규칙 설정**

### **Realtime Database 규칙** (테스트용)
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### **Firestore 규칙** (테스트용)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🌐 **웹 앱 설정 확인**

1. **프로젝트 설정 > 일반**
2. **내 앱** 섹션에서 웹 앱이 등록되어 있는지 확인
3. Firebase SDK 구성에서 설정값들이 `.env.local`과 일치하는지 확인

## 🔍 **현재 설정값 확인**

`.env.local` 파일에 다음 값들이 올바르게 설정되어 있는지 확인:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAZ1UbNpOwoWxeonTcJx2wPgdUbC3FzMxY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ssmd-715a2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://ssmd-715a2-default-rtdb.asia-southeast1.firebasedatabase.app/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ssmd-715a2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ssmd-715a2.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=824280696096
NEXT_PUBLIC_FIREBASE_APP_ID=1:824280696096:web:ef3c7df200d268e4998345
```

## ⚠️ **일반적인 오류 원인**

1. **Authentication 미활성화**: 가장 흔한 원인
2. **이메일/비밀번호 로그인 비활성화**
3. **잘못된 프로젝트 ID**
4. **환경변수 파일 없음** (`.env.local`)
5. **Realtime Database 미생성**
6. **잘못된 지역 설정**

## 🚀 **테스트 방법**

1. Firebase 콘솔에서 Authentication > Users에서 수동으로 사용자 추가
2. 웹 앱에서 해당 이메일로 중복 체크 테스트
3. 인증코드 발송 테스트

모든 설정이 완료되면 개발 서버를 재시작하세요:
```bash
npm run dev
```

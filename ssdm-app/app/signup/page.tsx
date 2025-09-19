"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getExpirationTime, isCodeExpired, isValidCodeFormat } from "@/lib/verification"
import { auth } from "@/lib/firebase"
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, deleteUser } from "firebase/auth"
import TermsConsentPopup from '@/components/popups/terms-consent-popup'

export default function SignupPage() {
  const router = useRouter()
  const [emailVerificationStep, setEmailVerificationStep] = useState<"initial" | "code-sent" | "verified">("initial")
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180) // 3 minutes
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("")
  const [isDomainInputMode, setIsDomainInputMode] = useState(false)
  const [customDomain, setCustomDomain] = useState("")
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [signupStep, setSignupStep] = useState<"form" | "complete">("form")
  const [showTermsPopup, setShowTermsPopup] = useState(false)
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null)
  
  // 약관 동의 체크박스 상태
  const [allAgreed, setAllAgreed] = useState(true)
  const [termsAgreed, setTermsAgreed] = useState(true)
  const [privacyAgreed, setPrivacyAgreed] = useState(true)
  const [marketingAgreed, setMarketingAgreed] = useState(true)
  
  // 커스텀 토스트 상태
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastSubMessage, setToastSubMessage] = useState("")

  // 전체동의 처리 함수
  const handleAllAgreed = (checked: boolean) => {
    setAllAgreed(checked)
    setTermsAgreed(checked)
    setPrivacyAgreed(checked)
    setMarketingAgreed(checked)
  }

  // 개별 체크박스 변경 시 전체동의 상태 업데이트
  useEffect(() => {
    const allChecked = termsAgreed && privacyAgreed && marketingAgreed
    setAllAgreed(allChecked)
  }, [termsAgreed, privacyAgreed, marketingAgreed])

  // 인증 관련 상태
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  
  // 필드별 오류 상태
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    verificationCode: "",
    password: "",
    passwordConfirm: ""
  })

  // 필드 오류 설정 함수
  const setFieldError = (field: keyof typeof fieldErrors, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }))
  }

  // 필드 오류 초기화 함수
  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors(prev => ({ ...prev, [field]: "" }))
  }

  // 디바운싱된 이메일 검증 함수 (실시간용)
  const debouncedEmailValidation = (email: string) => {
    // 기존 타이머 클리어
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // 새로운 타이머 설정 (500ms 후 실행)
    const newTimer = setTimeout(async () => {
      if (email) {
        await validateEmail(email, true) // 중복 검사 포함
      }
    }, 500)

    setDebounceTimer(newTimer)
  }

  // 이메일 유효성 검사
  const validateEmail = async (email: string, checkDuplicate: boolean = false) => {
    if (!email) {
      setFieldError("email", "필수 입력 항목입니다.")
      return false
    }
    
    // 더 엄격한 이메일 정규식
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setFieldError("email", "이메일 형식이 올바르지 않습니다.")
      return false
    }
    
    // 도메인 부분 검증 (최소 d.dd 형태)
    const domain = email.split('@')[1]
    if (domain) {
      // 더 엄격한 도메인 검증: 최소 d.dd 형태 (영문 1개 + 점 + 영문 2개 이상)
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/
      if (!domainRegex.test(domain)) {
        setFieldError("email", "이메일 형식이 올바르지 않습니다.")
        return false
      }
      
      // 도메인 부분이 최소 d.dd 형태인지 확인
      const parts = domain.split('.')
      if (parts.length < 2) {
        setFieldError("email", "이메일 형식이 올바르지 않습니다.")
        return false
      }
      
      // 각 부분이 최소 1자 이상인지 확인
      for (const part of parts) {
        if (part.length < 1) {
          setFieldError("email", "이메일 형식이 올바르지 않습니다.")
          return false
        }
      }
      
      // 마지막 부분(최상위 도메인)이 최소 2자 이상인지 확인
      if (parts[parts.length - 1].length < 2) {
        setFieldError("email", "이메일 형식이 올바르지 않습니다.")
        return false
      }
    }
    
    // 중복 확인이 필요한 경우 (디바운싱된 검증에서만)
    if (checkDuplicate) {
      try {
        const response = await fetch('/api/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
        
        const data = await response.json()
        
        if (response.ok) {
          if (data.exists) {
            setFieldError("email", data.message)
            return false
          }
        } else {
          setFieldError("email", data.error || "이메일 확인 중 오류가 발생했습니다.")
          return false
        }
      } catch (error) {
        console.error('이메일 중복 확인 오류:', error)
        setFieldError("email", "이메일 확인 중 오류가 발생했습니다.")
        return false
      }
    }
    
    clearFieldError("email")
    return true
  }

  // 비밀번호 유효성 검사
  const validatePassword = (pwd: string) => {
    if (!pwd) {
      setFieldError("password", "필수 입력 항목입니다.")
      return false
    }
    if (pwd.length < 8) {
      setFieldError("password", "비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다.")
      return false
    }
    const hasLetter = /[a-zA-Z]/.test(pwd)
    const hasNumber = /\d/.test(pwd)
    if (!hasLetter || !hasNumber) {
      setFieldError("password", "비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다.")
      return false
    }
    clearFieldError("password")
    return true
  }

  // 비밀번호 확인 검사
  const validatePasswordConfirm = (pwd: string, confirmPwd: string) => {
    if (!confirmPwd) {
      setFieldError("passwordConfirm", "필수 입력 항목입니다.")
      return false
    }
    if (pwd !== confirmPwd) {
      setFieldError("passwordConfirm", "비밀번호가 일치하지 않습니다.")
      return false
    }
    clearFieldError("passwordConfirm")
    return true
  }

  // 인증코드 검증
  const validateVerificationCode = (code: string) => {
    if (!code) {
      setFieldError("verificationCode", "인증코드를 입력해주세요.")
      return false
    }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setFieldError("verificationCode", "올바른 인증코드를 입력해주세요.")
      return false
    }
    clearFieldError("verificationCode")
    return true
  }

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [timerInterval, debounceTimer])

  // 타이머 시작 함수
  const startTimer = () => {
    // 기존 타이머가 있다면 정리
    if (timerInterval) {
      clearInterval(timerInterval)
    }
    
    setTimer(180) // 3분으로 초기화
    
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            // 시간 만료 시 현재 화면 유지 (초기 상태로 돌아가지 않음)
            setTimerInterval(null)
            // 타이머가 실제로 만료되었을 때만 오류 메시지 표시
            if (prev === 1) {
              setFieldError("verificationCode", "유효시간이 지났어요. '이메일 재전송하기'를 눌러주세요.")
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    
    setTimerInterval(interval)
  }

  // 이메일 재전송 함수
  const handleResendEmail = async () => {
    setIsResending(true)
    
    const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: fullEmail }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // 타이머 재시작
        startTimer()
        setVerificationCode("") // 입력된 코드 초기화
        // 토스트 표시
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000) // 3초 후 자동 숨김
      } else {
        setToastMessage(data.error || "이메일 재전송에 실패했습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } catch (error) {
      console.error("이메일 재전송 오류:", error)
      setToastMessage("이메일 재전송 중 오류가 발생했습니다.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setIsResending(false)
    }
  }

  const handleEmailVerification = async () => {
    if (emailVerificationStep === "initial" && emailUsername && (emailDomain || customDomain)) {
      const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
      
      // 이메일 유효성 검사 (형식만 확인, 중복은 이미 실시간으로 확인됨)
      if (!(await validateEmail(fullEmail, false))) {
        return
      }
      
      setIsLoading(true)
      
      try {
        // API를 통해 이메일 발송
        const response = await fetch('/api/send-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: fullEmail }),
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          setEmailVerificationStep("code-sent")
          startTimer()
        } else {
          setToastMessage(data.error || "이메일 발송에 실패했습니다.")
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        }
      } catch (error) {
        console.error("이메일 발송 오류:", error)
        setToastMessage("이메일 발송 중 오류가 발생했습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleCodeVerification = async () => {
    // 인증코드 유효성 검사
    if (!validateVerificationCode(verificationCode)) {
      return
    }
    
    setIsVerifying(true)
    
    const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
      
      try {
        // API를 통해 인증코드 검증
        const response = await fetch('/api/verify-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: fullEmail, 
            code: verificationCode 
          }),
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          setEmailVerificationStep("verified")
          clearFieldError("verificationCode")
        } else {
          setFieldError("verificationCode", data.error || "인증에 실패했습니다.")
        }
      } catch (error) {
        console.error("인증코드 검증 오류:", error)
        setToastMessage("인증 처리 중 오류가 발생했습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } finally {
        setIsVerifying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // 신규 사용자 감지 (creationTime과 lastSignInTime이 같으면 신규 사용자)
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
      
      console.log('Google 회원가입/로그인 성공:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        isNewUser: isNewUser,
        creationTime: result.user.metadata.creationTime,
        lastSignInTime: result.user.metadata.lastSignInTime
      })
      
      if (isNewUser) {
        // 신규 사용자의 경우 약관 동의 팝업 표시
        setPendingGoogleUser(result.user)
        setShowTermsPopup(true)
      } else {
        // 기존 사용자의 경우 대시보드로 이동
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error('Google 회원가입/로그인 오류:', error)
      
      if (error.code === 'auth/popup-closed-by-user') {
        setToastMessage("Google 로그인이 취소되었습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else if (error.code === 'auth/popup-blocked') {
        setToastMessage("팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setToastMessage("이미 다른 방법으로 가입된 이메일입니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else {
        setToastMessage("Google 로그인 중 오류가 발생했습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleTermsConsent = async (consentValues: {
    termsAgreed: boolean
    privacyAgreed: boolean
    marketingAgreed: boolean
  }) => {
    setShowTermsPopup(false)
    
    try {
      // 약관 동의 정보를 Firebase에 저장
      if (pendingGoogleUser) {
        // 1. 사용자 기본 정보 저장
        const userData = {
          email: pendingGoogleUser.email,
          displayName: pendingGoogleUser.displayName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        // 2. 동의 정보 저장 (전달받은 실제 값 사용)
        const consentData = {
          termsAgreed: consentValues.termsAgreed,
          privacyAgreed: consentValues.privacyAgreed,
          marketingAgreed: consentValues.marketingAgreed,
          agreedAt: new Date().toISOString()
        }
        
        // Firebase Realtime Database에 저장
        const { ref, set } = await import('firebase/database')
        const { realtimeDb } = await import('@/lib/firebase')
        
        // 사용자 정보와 동의 정보를 함께 저장
        const userRef = ref(realtimeDb, `users/${pendingGoogleUser.uid}`)
        await set(userRef, {
          ...userData,
          consent: consentData
        })
        
        console.log('약관 동의 정보 저장 완료:', pendingGoogleUser.email)
      }
      
      // 회원가입 완료 화면 표시
      setSignupStep("complete")
      
      // 2초 후 프로필 설정 페이지로 이동
      setTimeout(() => {
        router.push("/profile-setup")
      }, 2000)
      
    } catch (error) {
      console.error('약관 동의 정보 저장 오류:', error)
      setToastMessage("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      // 임시 사용자 정보 정리
      setPendingGoogleUser(null)
    }
  }

  const handleTermsClose = async () => {
    setShowTermsPopup(false)
    
    // 약관 거부 시 계정 삭제
    if (pendingGoogleUser) {
      try {
        await deleteUser(pendingGoogleUser)
        console.log('약관 거부로 인한 계정 삭제 완료')
      } catch (error) {
        console.error('계정 삭제 오류:', error)
        // 계정 삭제 실패 시 로그아웃만 처리
        await auth.signOut()
      }
    }
    
    setPendingGoogleUser(null)
    setToastMessage("서비스 이용을 위해 약관에 동의해주세요.")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {signupStep === "complete" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">SSDM</h1>
            <p className="text-sm text-muted-foreground">개인정보보호</p>
          </div>
        )}
        
        <Card className="w-full">
          {signupStep === "form" && (
            <CardHeader className="text-center space-y-4">
              {/* SSDM Logo */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-primary">SSDM</h1>
                <p className="text-sm text-muted-foreground">개인정보보호</p>
              </div>
            </CardHeader>
          )}

          <CardContent className="space-y-4">
            {signupStep === "form" ? (
            <>
              <Button 
                variant="outline" 
                className="w-full border-gray-300 hover:bg-gray-50 bg-transparent"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 회원가입
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">또는</span>
                </div>
              </div>

              <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <div className="flex space-x-2">
                <Input 
                  type="text" 
                  placeholder="이메일" 
                  value={emailUsername}
                  onChange={(e) => {
                    setEmailUsername(e.target.value)
                    // 실시간 검증 (디바운싱 적용)
                    if (e.target.value) {
                      if (emailDomain || customDomain) {
                        const fullEmail = `${e.target.value}@${isDomainInputMode ? customDomain : emailDomain}`
                        // 즉시 형식 검사
                        validateEmail(fullEmail, false)
                        // 디바운싱된 중복 검사
                        debouncedEmailValidation(fullEmail)
                      } else {
                        // 도메인이 선택되지 않은 경우
                        setFieldError("email", "이메일 형식이 올바르지 않습니다.")
                      }
                    } else if (fieldErrors.email) {
                      clearFieldError("email")
                    }
                  }}
                  onBlur={() => {
                    if (!emailUsername) {
                      setFieldError("email", "필수 입력 항목입니다.")
                    } else if (emailUsername && (emailDomain || customDomain)) {
                      const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
                      validateEmail(fullEmail, false) // blur에서는 형식만 검사
                    }
                  }}
                  disabled={emailVerificationStep === "verified"}
                  className={`flex-1 focus:border-primary focus:ring-primary ${
                    emailVerificationStep === "verified" 
                      ? "bg-muted cursor-not-allowed" 
                      : fieldErrors.email 
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                        : ""
                  }`}
                />
                <span className="flex items-center text-muted-foreground">@</span>
                
                {!isDomainInputMode ? (
                  <Select 
                    value={emailDomain} 
                    onValueChange={(value) => {
                      if (value === "direct") {
                        setIsDomainInputMode(true)
                        setEmailDomain("")
                      } else {
                        setEmailDomain(value)
                        // 실시간 검증 (디바운싱 적용)
                        if (emailUsername && value) {
                          const fullEmail = `${emailUsername}@${value}`
                          // 즉시 형식 검사
                          validateEmail(fullEmail, false)
                          // 디바운싱된 중복 검사
                          debouncedEmailValidation(fullEmail)
                        } else if (fieldErrors.email) {
                          clearFieldError("email")
                        }
                      }
                    }} 
                    disabled={emailVerificationStep === "verified"}
                  >
                    <SelectTrigger className={`w-40 ${
                      emailVerificationStep === "verified" 
                        ? "bg-muted cursor-not-allowed" 
                        : fieldErrors.email 
                          ? "border-red-500 focus:border-red-500" 
                          : ""
                  }`}>
                    <SelectValue placeholder="선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail.com">gmail.com</SelectItem>
                    <SelectItem value="naver.com">naver.com</SelectItem>
                    <SelectItem value="daum.net">daum.net</SelectItem>
                    <SelectItem value="hanmail.net">hanmail.net</SelectItem>
                      <SelectItem value="direct">직접입력</SelectItem>
                  </SelectContent>
                </Select>
                ) : (
                  <div className="relative w-40">
                    <Input 
                      type="text" 
                      placeholder="입력해주세요"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value)
                        // 실시간 검증 (디바운싱 적용)
                        if (emailUsername && e.target.value) {
                          const fullEmail = `${emailUsername}@${e.target.value}`
                          // 즉시 형식 검사
                          validateEmail(fullEmail, false)
                          // 디바운싱된 중복 검사
                          debouncedEmailValidation(fullEmail)
                        } else if (fieldErrors.email) {
                          clearFieldError("email")
                        }
                      }}
                      onBlur={() => {
                        if (emailUsername && customDomain) {
                          const fullEmail = `${emailUsername}@${customDomain}`
                          validateEmail(fullEmail, false) // blur에서는 형식만 검사
                        }
                      }}
                      disabled={emailVerificationStep === "verified"}
                      className={`w-full pr-8 ${
                        emailVerificationStep === "verified" 
                          ? "bg-muted cursor-not-allowed" 
                          : fieldErrors.email 
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                            : "focus:border-primary focus:ring-primary"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsDomainInputMode(false)
                        setCustomDomain("")
                        if (fieldErrors.email) {
                          clearFieldError("email")
                        }
                      }}
                      disabled={emailVerificationStep === "verified"}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {fieldErrors.email && (
                <p className="text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleEmailVerification}
              className={`w-full ${
                emailVerificationStep === "initial" && emailUsername && (emailDomain || customDomain) && !isLoading
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : emailVerificationStep === "code-sent"
                    ? "bg-gray-200 text-gray-500"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-500"
              }`}
              disabled={emailVerificationStep !== "initial" || !emailUsername || (!emailDomain && !customDomain) || isLoading || !!fieldErrors.email}
            >
              {emailVerificationStep === "initial" && "이메일 인증하기"}
              {emailVerificationStep === "code-sent" && "이메일 인증하기"}
              {emailVerificationStep === "verified" && "이메일 인증 완료"}
            </Button>


            {emailVerificationStep === "code-sent" && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="인증코드 6자리"
                    value={verificationCode}
                    onChange={(e) => {
                      // 숫자만 입력 허용하고 6자리 제한
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                      setVerificationCode(value)
                      if (fieldErrors.verificationCode) {
                        clearFieldError("verificationCode")
                      }
                    }}
                    onKeyDown={(e) => {
                      // 숫자, 백스페이스, 삭제, 탭, 화살표 키만 허용
                      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
                      if (!allowedKeys.includes(e.key) && !/[0-9]/.test(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    maxLength={6}
                    className={`pr-24 bg-white ${
                      fieldErrors.verificationCode 
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                        : "focus:border-primary focus:ring-primary"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-red-500 text-sm font-mono">{formatTime(timer)}</span>
                    <button
                      onClick={handleCodeVerification}
                      disabled={verificationCode.length !== 6 || isVerifying || (!!fieldErrors.verificationCode && verificationCode.length > 0)}
                      className={`text-sm font-medium ${
                        verificationCode.length === 6 && !isVerifying && !(!!fieldErrors.verificationCode && verificationCode.length > 0)
                          ? "text-primary hover:text-primary/80" 
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      확인
                    </button>
                  </div>
                </div>
                {fieldErrors.verificationCode && (
                  <p className="text-sm text-red-600">{fieldErrors.verificationCode}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  이메일을 받지 못하셨나요? 
                  <button 
                    onClick={handleResendEmail}
                    disabled={isResending} // 재전송 중일 때만 비활성화
                    className={`ml-1 ${
                      isResending
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-primary hover:underline"
                    }`}
                  >
                    이메일 재전송하기
                  </button>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <p className="text-xs text-muted-foreground">영문, 숫자를 포함한 8자 이상의 비밀번호를 입력해주세요.</p>
              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    clearFieldError("password")
                  }
                }}
                onBlur={() => validatePassword(password)}
                className={`w-full ${
                  fieldErrors.password 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : "focus:border-primary focus:ring-primary"
                }`}
              />
              {fieldErrors.password && (
                <p className="text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호 확인</label>
              <Input
                type="password"
                placeholder="비밀번호 확인"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value)
                  if (fieldErrors.passwordConfirm) {
                    clearFieldError("passwordConfirm")
                  }
                }}
                onBlur={() => validatePasswordConfirm(password, passwordConfirm)}
                className={`w-full ${
                  fieldErrors.passwordConfirm 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : "focus:border-primary focus:ring-primary"
                }`}
              />
              {fieldErrors.passwordConfirm && (
                <p className="text-sm text-red-600">{fieldErrors.passwordConfirm}</p>
              )}
            </div>
          </div>

          {/* 약관 동의 체크박스 */}
          <div className="space-y-3">
            {/* 약관동의 라벨 */}
            <h3 className="text-sm font-medium text-gray-900">약관동의</h3>
            
            {/* 전체 약관 동의 콜아웃 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              {/* 전체동의 */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="allAgreed"
                  checked={allAgreed}
                  onChange={(e) => handleAllAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="allAgreed" className="text-sm text-gray-700">
                  전체동의 선택항목에 대한 동의 포함
                </label>
              </div>
              
              {/* 구분선 */}
              <div className="border-t border-gray-200"></div>
              
              {/* 개별 동의 항목들 */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 flex items-center">
                    이용약관 <span className="text-red-500">(필수)</span>
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </label>
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="privacy" className="text-sm text-gray-700 flex items-center">
                    개인정보처리방침 <span className="text-red-500">(필수)</span>
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </label>
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={marketingAgreed}
                    onChange={(e) => setMarketingAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="marketing" className="text-sm text-gray-700 flex items-center">
                    마케팅 정보 수신 동의 <span className="text-gray-500">(선택)</span>
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90" 
                disabled={emailVerificationStep !== "verified" || !password || !passwordConfirm || !termsAgreed || !privacyAgreed || isLoading}
            onClick={async () => {
              // 모든 필드 검증
              const isPasswordValid = validatePassword(password)
              const isPasswordConfirmValid = validatePasswordConfirm(password, passwordConfirm)
              
              if (emailVerificationStep === "verified" && isPasswordValid && isPasswordConfirmValid) {
                const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
                
                try {
                  // Firebase Auth로 직접 회원가입
                  const userCredential = await createUserWithEmailAndPassword(auth, fullEmail, password)
                  const user = userCredential.user
                  
                  // displayName 설정 (이메일의 @ 앞부분 사용)
                  const displayName = fullEmail.split('@')[0]
                  await updateProfile(user, {
                    displayName: displayName
                  })
                  
                  // 사용자 정보를 우리 데이터베이스에 저장
                  const userData = {
                    email: user.email,
                    displayName: displayName,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                  
                  // 동의 정보 저장 (사용자가 선택한 값 사용)
                  const consentData = {
                    termsAgreed: termsAgreed,
                    privacyAgreed: privacyAgreed,
                    marketingAgreed: marketingAgreed,
                    agreedAt: new Date().toISOString()
                  }
                  
                  // Firebase Realtime Database에 저장
                  const { ref, set } = await import('firebase/database')
                  const { realtimeDb } = await import('@/lib/firebase')
                  
                  // 사용자 정보와 동의 정보를 함께 저장
                  const userRef = ref(realtimeDb, `users/${user.uid}`)
                  await set(userRef, {
                    ...userData,
                    consent: consentData
                  })
                  
                  console.log('회원가입 성공:', {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                  })
                  
                  // 회원가입 성공 후 대시보드로 이동
                  router.push('/dashboard')
                  
                } catch (error: any) {
                  console.error("회원가입 오류:", error)
                  
                  if (error.code === 'auth/email-already-in-use') {
                    setToastMessage("이미 사용 중인 이메일입니다.")
                    setShowToast(true)
                    setTimeout(() => setShowToast(false), 3000)
                  } else if (error.code === 'auth/weak-password') {
                    setToastMessage("비밀번호가 너무 약합니다.")
                    setShowToast(true)
                    setTimeout(() => setShowToast(false), 3000)
                  } else if (error.code === 'auth/invalid-email') {
                    setToastMessage("올바른 이메일 형식이 아닙니다.")
                    setShowToast(true)
                    setTimeout(() => setShowToast(false), 3000)
                  } else {
                    setToastMessage("회원가입 중 오류가 발생했습니다.")
                    setShowToast(true)
                    setTimeout(() => setShowToast(false), 3000)
                  }
                }
              }
            }}
          >
            회원가입하기
          </Button>
            </>
          ) : (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">회원가입이 완료되었습니다!</h2>
            </div>
          )}
        </CardContent>

        {signupStep === "form" && (
          <div className="border-t border-border p-4 text-center">
            <p className="text-sm">
              이미 아이디가 있으신가요?{" "}
              <Link href="/" className="text-primary hover:underline font-medium">
                로그인
              </Link>
            </p>
          </div>
        )}
        </Card>
      </div>

      {/* 약관 동의 팝업 */}
      <TermsConsentPopup
        isOpen={showTermsPopup}
        onClose={handleTermsClose}
        onConsent={handleTermsConsent}
        userEmail={pendingGoogleUser?.email}
        userName={pendingGoogleUser?.displayName}
      />

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-sm font-medium">{toastMessage}</p>
              {toastSubMessage && (
                <p className="text-xs mt-1 text-gray-300">{toastSubMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

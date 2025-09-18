"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, deleteUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import TermsConsentPopup from '@/components/popups/terms-consent-popup'


export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockUntil, setBlockUntil] = useState<Date | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastSubMessage, setToastSubMessage] = useState("")
  const [showTermsPopup, setShowTermsPopup] = useState(false)
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null)
  const router = useRouter()

  // 이미 로그인된 사용자는 대시보드로 리다이렉트 (신규 사용자가 아닐 때만)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('=== onAuthStateChanged 실행 ===')
      console.log('user:', user)
      console.log('user.emailVerified:', user?.emailVerified)
      console.log('showTermsPopup:', showTermsPopup)
      console.log('pendingGoogleUser:', pendingGoogleUser)
      
      if (user && user.emailVerified && !showTermsPopup && !pendingGoogleUser) {
        // 신규 사용자인지 확인
        const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime
        const fromExternalPopup = sessionStorage.getItem('from_external_popup')
        const isNewUserProcessing = sessionStorage.getItem('is_new_user_processing')
        
        console.log('useEffect에서 사용자 감지:', {
          uid: user.uid,
          isNewUser: isNewUser,
          showTermsPopup: showTermsPopup,
          pendingGoogleUser: !!pendingGoogleUser,
          fromExternalPopup: fromExternalPopup,
          isNewUserProcessing: isNewUserProcessing
        })
        
        // 신규 사용자 처리 중이면 리다이렉션하지 않음
        if (isNewUserProcessing === 'true') {
          console.log('신규 사용자 처리 중 - 리다이렉션 건너뜀')
          return
        }
        
        // 외부 팝업에서 온 경우 약관동의 팝업 강제 표시
        if (fromExternalPopup === 'true' && isNewUser) {
          console.log('외부 팝업에서 온 신규 사용자 - 약관동의 팝업 강제 표시')
          sessionStorage.removeItem('from_external_popup')
          setPendingGoogleUser(user)
          setShowTermsPopup(true)
          return
        }
        
        if (!isNewUser) {
          // 기존 사용자만 리디렉션 처리
          const redirectUrl = sessionStorage.getItem('redirect_after_login')
          const fromExternalPopup = sessionStorage.getItem('from_external_popup')
          
          if (redirectUrl) {
            sessionStorage.removeItem('redirect_after_login')
            sessionStorage.removeItem('from_external_popup')
            
            // 외부 팝업에서 온 경우 JWT 토큰 처리
            if (fromExternalPopup === 'true' && redirectUrl === '/consent') {
              // JWT 토큰을 sessionStorage에서 가져와서 consent 페이지로 이동
              const jwtToken = sessionStorage.getItem('openPopup')
              if (jwtToken) {
                // JWT 토큰과 함께 동의 페이지로 이동
                router.push('/consent')
                // 페이지 로드 후 postMessage로 JWT 전달
                setTimeout(() => {
                  window.postMessage({
                    type: 'init_consent',
                    jwt: jwtToken
                  }, '*')
                }, 100)
              } else {
                router.push('/consent')
              }
            } else {
              router.push(redirectUrl)
            }
          } else {
            router.push('/dashboard')
          }
        }
        // 신규 사용자는 handleGoogleLogin에서 처리 (useEffect에서 건드리지 않음)
      }
    })

    return () => unsubscribe()
  }, [router, showTermsPopup, pendingGoogleUser])

  // 컴포넌트 마운트 시 로컬 스토리지에서 실패 횟수와 제한 시간 확인
  useEffect(() => {
    const attempts = localStorage.getItem('loginAttempts')
    const blockTime = localStorage.getItem('blockUntil')
    
    if (attempts) {
      setLoginAttempts(parseInt(attempts))
    }
    
    if (blockTime) {
      const blockDate = new Date(blockTime)
      if (blockDate > new Date()) {
        setIsBlocked(true)
        setBlockUntil(blockDate)
      } else {
        // 제한 시간이 지났으면 초기화
        localStorage.removeItem('loginAttempts')
        localStorage.removeItem('blockUntil')
        setLoginAttempts(0)
        setIsBlocked(false)
        setBlockUntil(null)
      }
    }
  }, [])

  const handleLogin = async () => {
    // 제한 상태 확인
    if (isBlocked && blockUntil && blockUntil > new Date()) {
      const remainingMinutes = Math.ceil((blockUntil.getTime() - new Date().getTime()) / (1000 * 60))
      setToastMessage(`10번 실패하여 10분간 로그인이 제한됩니다.`)
      setToastSubMessage(`${remainingMinutes}분 후에 다시 시도해주세요.`)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 4000)
      return
    }

    if (!email || !password) {
      setToastMessage("이메일과 비밀번호를 모두 입력해주세요.")
      setToastSubMessage("")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      return
    }

    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      
      // 로그인 성공 시 실패 횟수 초기화
      localStorage.removeItem('loginAttempts')
      localStorage.removeItem('blockUntil')
      setLoginAttempts(0)
      setIsBlocked(false)
      setBlockUntil(null)
      
      // 로그인 후 돌아갈 URL이 있는지 확인
      const redirectUrl = sessionStorage.getItem('redirect_after_login')
      if (redirectUrl) {
        sessionStorage.removeItem('redirect_after_login')
        router.push(redirectUrl)
      } else {
        router.push("/dashboard")
      }
    } catch (error: any) {
      // 로그인 실패 시 비밀번호 입력란 지우기
      setPassword("")
      
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)
      localStorage.setItem('loginAttempts', newAttempts.toString())
      
      if (newAttempts >= 10) {
        // 10번 실패 시 10분 제한
        const blockTime = new Date()
        blockTime.setMinutes(blockTime.getMinutes() + 10)
        setBlockUntil(blockTime)
        setIsBlocked(true)
        localStorage.setItem('blockUntil', blockTime.toISOString())
        
        setToastMessage("10번 실패하여 10분간 로그인이 제한됩니다.")
        setToastSubMessage("(10/10)")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 4000)
      } else {
        setToastMessage(`${newAttempts}번 실패하면 10분간 로그인이 제한돼요. (${newAttempts}/10)`)
        setToastSubMessage("")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 4000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Google 로그인 성공 시 실패 횟수 초기화
      localStorage.removeItem('loginAttempts')
      localStorage.removeItem('blockUntil')
      setLoginAttempts(0)
      setIsBlocked(false)
      setBlockUntil(null)
      
      // 신규 사용자 감지 (creationTime과 lastSignInTime이 같으면 신규 사용자)
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
      
      console.log('=== Google 로그인 성공 ===')
      console.log('사용자 정보:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        isNewUser: isNewUser,
        creationTime: result.user.metadata.creationTime,
        lastSignInTime: result.user.metadata.lastSignInTime
      })
      console.log('신규 사용자 여부:', isNewUser)
      console.log('creationTime === lastSignInTime:', result.user.metadata.creationTime === result.user.metadata.lastSignInTime)
      
      if (isNewUser) {
        // 신규 사용자의 경우 약관 동의 팝업 표시
        console.log('=== 신규 사용자 감지 - 약관동의 팝업 표시 ===')
        console.log('setPendingGoogleUser 호출 전')
        setPendingGoogleUser(result.user)
        console.log('setShowTermsPopup(true) 호출 전')
        setShowTermsPopup(true)
        console.log('is_new_user_processing 플래그 설정')
        // 신규 사용자는 useEffect에서 리다이렉션하지 않도록 플래그 설정
        sessionStorage.setItem('is_new_user_processing', 'true')
        console.log('신규 사용자 처리 완료')
      } else {
        // 기존 사용자의 경우 리디렉션 URL 확인 후 이동
        const redirectUrl = sessionStorage.getItem('redirect_after_login')
        if (redirectUrl) {
          sessionStorage.removeItem('redirect_after_login')
          router.push(redirectUrl)
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error: any) {
      console.error('Google 로그인 오류:', error)
      
      if (error.code === 'auth/popup-closed-by-user') {
        setToastMessage("Google 로그인이 취소되었습니다.")
        setToastSubMessage("")
      } else if (error.code === 'auth/popup-blocked') {
        setToastMessage("팝업이 차단되었습니다.")
        setToastSubMessage("팝업 차단을 해제하고 다시 시도해주세요.")
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setToastMessage("이미 다른 방법으로 가입된 이메일입니다.")
        setToastSubMessage("이메일/비밀번호로 로그인해주세요.")
      } else {
        setToastMessage("Google 로그인 중 오류가 발생했습니다.")
        setToastSubMessage("")
      }
      
      setShowToast(true)
      setTimeout(() => setShowToast(false), 4000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTermsConsent = async () => {
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
        
        // 2. 동의 정보 저장
        const consentData = {
          termsAgreed: true,
          privacyAgreed: true,
          marketingAgreed: false, // 기본값
          agreedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
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
      
      // 신규 사용자 처리 플래그 정리
      sessionStorage.removeItem('is_new_user_processing')
      
      // 회원가입 완료 토스트 표시
      setToastMessage("회원가입이 완료되었습니다.")
      setToastSubMessage("개인정보 입력 페이지로 이동합니다.")
      setShowToast(true)
      
      // 2초 후 개인정보 입력 페이지로 이동
      setTimeout(() => {
        setShowToast(false)
        router.push("/profile-setup")
      }, 2000)
      
    } catch (error) {
      console.error('약관 동의 정보 저장 오류:', error)
      setToastMessage("회원가입 중 오류가 발생했습니다.")
      setToastSubMessage("다시 시도해주세요.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      // 임시 사용자 정보 정리
      setPendingGoogleUser(null)
    }
  }

  const handleTermsClose = async () => {
    setShowTermsPopup(false)
    
    // 신규 사용자 처리 플래그 정리
    sessionStorage.removeItem('is_new_user_processing')
    
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
    
    // 사용자에게 안내 메시지
    setToastMessage("약관 동의가 필요합니다.")
    setToastSubMessage("서비스 이용을 위해 약관에 동의해주세요.")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* SSDM Logo */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">SSDM</h1>
            <p className="text-sm text-muted-foreground">개인정보보호</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Login Form */}
          <div className="space-y-3">
            <Input 
              type="email" 
              placeholder="이메일" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full focus:border-primary focus:ring-primary"
              disabled={isBlocked}
            />
            <Input 
              type="password" 
              placeholder="비밀번호" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full focus:border-primary focus:ring-primary"
              disabled={isBlocked}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin()
                }
              }}
            />
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleLogin}
              disabled={isBlocked}
            >
              로그인
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          {/* Google Login */}
          <Button 
            variant="outline" 
            className="w-full bg-transparent hover:bg-muted/50"
            onClick={handleGoogleLogin}
            disabled={isLoading || isBlocked}
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
            Google로 로그인
          </Button>

          {/* Updated navigation links layout */}
          <div className="flex justify-center items-center space-x-4 text-sm">
            <Link href="/reset-password" className="text-primary hover:underline">
              비밀번호 재설정
            </Link>
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </div>
        </CardContent>

        {/* Updated bottom text */}
        <div className="border-t border-border p-4 text-center">
          <Link href="/support" className="text-sm text-muted-foreground hover:text-primary">
            로그인에 문제가 있으신가요?
          </Link>
        </div>
      </Card>

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
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-sm font-medium">{toastMessage}</p>
              {toastSubMessage && (
                <p className="text-xs mt-1 text-green-100">{toastSubMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
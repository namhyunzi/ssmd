"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, updatePassword, signOut } from "firebase/auth"

export default function PasswordChangePage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChanging, setIsChanging] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSocialLogin, setIsSocialLogin] = useState(false)

  // 사용자 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        
        // 소셜 로그인 사용자인지 확인
        const socialLogin = user.providerData.some(provider => 
          provider.providerId === 'google.com' || 
          provider.providerId === 'facebook.com' ||
          provider.providerId === 'twitter.com'
        )
        
        setIsSocialLogin(socialLogin)
        
        if (socialLogin) {
          // 소셜 로그인 사용자는 비밀번호 변경 불가
          setErrorMessage("소셜 로그인 사용자는 비밀번호 변경이 불가능합니다.")
        }
      } else {
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handlePasswordChange = async () => {
    // 에러 메시지 초기화
    setErrorMessage("")
    setSuccessMessage("")

    // 입력값 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("모든 필드를 입력해주세요.")
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.")
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage("새 비밀번호는 6자 이상이어야 합니다.")
      return
    }

    if (currentPassword === newPassword) {
      setErrorMessage("현재 비밀번호와 새 비밀번호가 같습니다.")
      return
    }

    if (!currentUser || !currentUser.email) {
      setErrorMessage("사용자 정보를 찾을 수 없습니다.")
      return
    }

    setIsChanging(true)

    try {
      // 1. 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)

      // 2. 새 비밀번호로 업데이트
      await updatePassword(currentUser, newPassword)

      setSuccessMessage("비밀번호가 성공적으로 변경되었습니다.")

      // 3. 로그아웃 처리
      setTimeout(async () => {
        try {
          // 로컬 스토리지 클리어
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('profileCompleted')
          
          // Firebase 로그아웃
          await signOut(auth)
          
          // 로그인 페이지로 이동
          router.push('/')
        } catch (logoutError) {
          console.error('로그아웃 오류:', logoutError)
          router.push('/')
        }
      }, 2000)

    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error)
      
      if (error.code === 'auth/wrong-password') {
        setErrorMessage("현재 비밀번호가 올바르지 않습니다.")
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage("새 비밀번호가 너무 약합니다.")
      } else if (error.code === 'auth/requires-recent-login') {
        setErrorMessage("보안을 위해 다시 로그인해주세요.")
      } else {
        setErrorMessage("비밀번호 변경 중 오류가 발생했습니다.")
      }
    } finally {
      setIsChanging(false)
    }
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
              const isLoggedIn = localStorage.getItem('isLoggedIn')
              router.push(isLoggedIn ? '/dashboard' : '/')
            }}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary">SSDM</h1>
              <p className="text-xs text-muted-foreground">개인정보보호</p>
            </div>
          </button>
          <div className="w-16"></div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>비밀번호 변경</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <Input 
                id="current-password" 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isChanging || isSocialLogin}
                placeholder={isSocialLogin ? "소셜 로그인 사용자는 비밀번호가 없습니다" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input 
                id="new-password" 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChanging || isSocialLogin}
                placeholder={isSocialLogin ? "소셜 로그인 사용자는 비밀번호가 없습니다" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isChanging || isSocialLogin}
                placeholder={isSocialLogin ? "소셜 로그인 사용자는 비밀번호가 없습니다" : ""}
              />
            </div>

            {/* 소셜 로그인 사용자 안내 */}
            {isSocialLogin && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">소셜 로그인 사용자</p>
                    <p className="mt-1">구글 계정으로 로그인하신 경우 비밀번호 변경이 불가능합니다. 구글 계정의 비밀번호를 변경하려면 Google 계정 설정에서 변경해주세요.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {errorMessage && !isSocialLogin && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* 성공 메시지 */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  비밀번호를 바꾸면 새 비밀번호로 다시 로그인해주세요.
                </p>
              </div>
            </div>

            {/* 로딩 상태 */}
            {isChanging && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                  <p className="text-sm text-green-800">
                    비밀번호를 변경하고 있습니다...
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent" disabled={isChanging}>
                  취소
                </Button>
              </Link>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90" 
                onClick={handlePasswordChange}
                disabled={isChanging || isSocialLogin}
              >
                비밀번호 변경
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

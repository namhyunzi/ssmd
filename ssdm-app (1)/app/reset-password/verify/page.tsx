"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ResetPasswordVerifyPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(179) // 02:59
  const [verificationCode, setVerificationCode] = useState("")
  const [isCodeVerified, setIsCodeVerified] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isResending, setIsResending] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    // 이메일 정보가 없으면 첫 번째 페이지로 리다이렉트
    const email = sessionStorage.getItem('resetEmail')
    if (!email) {
      router.push('/reset-password')
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  // 인증코드 유효성 검사
  const validateVerificationCode = (code: string) => {
    if (!code) {
      setErrorMessage("필수 입력 항목입니다.")
      return false
    }
    
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage("올바른 인증코드를 입력해주세요.")
      return false
    }
    
    setErrorMessage("")
    return true
  }

  // 인증코드 확인
  const handleVerifyCode = async () => {
    if (!validateVerificationCode(verificationCode)) {
      return
    }

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: sessionStorage.getItem('resetEmail') || '', // 이전 페이지에서 저장된 이메일
          code: verificationCode 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsCodeVerified(true)
        setErrorMessage("")
        // 인증 성공 시 이메일 정보를 sessionStorage에서 삭제하지 않음 (다음 페이지에서 필요)
      } else {
        setErrorMessage(data.error || "인증코드가 일치하지 않습니다.")
      }
    } catch (error) {
      console.error('인증코드 확인 오류:', error)
      setErrorMessage("서버 오류가 발생했습니다.")
    }
  }

  // 이메일 재전송
  const handleResendEmail = async () => {
    const email = sessionStorage.getItem('resetEmail')!
    
    setIsResending(true)
    setErrorMessage("")

    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setTimeLeft(179) // 타이머 리셋
        setVerificationCode("") // 입력 필드 초기화
        setToastMessage("인증코드가 재전송되었습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else {
        setToastMessage(data.error || "이메일 재전송에 실패했습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } catch (error) {
      console.error('이메일 재전송 오류:', error)
      setToastMessage("서버 오류가 발생했습니다.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <Link href="/" className="text-center">
            <h1 className="text-2xl font-bold text-primary">SSDM</h1>
            <p className="text-sm text-muted-foreground">개인정보보호</p>
          </Link>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-left space-y-2">
            <h2 className="text-sm font-normal text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</h2>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <div className={`flex items-center border rounded-md ${
                isCodeVerified 
                  ? "border-gray-200 bg-gray-50" 
                  : "border-gray-300 bg-white"
              }`}>
                <Input
                  type="text"
                  placeholder="인증코드 6자리"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value
                    // 숫자만 입력 허용하고 6자리까지만
                    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6)
                    setVerificationCode(numericValue)
                    setErrorMessage("") // 입력 시 오류 메시지 초기화
                  }}
                  disabled={isCodeVerified}
                  maxLength={6}
                  className={`flex-1 border-0 focus:ring-0 focus:border-0 shadow-none ${
                    isCodeVerified ? "bg-transparent cursor-not-allowed" : ""
                  }`}
                />
                <div className="flex items-center gap-2 pr-3">
                  <span className={`text-sm font-mono ${
                    isCodeVerified ? "text-gray-400" : "text-red-500"
                  }`}>
                    {Math.floor(timeLeft / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isCodeVerified}
                    className={`h-8 px-3 text-sm font-medium ${
                      isCodeVerified 
                        ? "text-gray-500 cursor-not-allowed" 
                        : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {isCodeVerified ? "확인완료" : "확인"}
                  </button>
                </div>
              </div>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <p className="text-xs text-muted-foreground flex items-center">
              <span className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center mr-2 text-xs">
                i
              </span>
              이메일을 받지 못하셨나요?{" "}
              <button 
                type="button"
                onClick={handleResendEmail}
                disabled={isResending || isCodeVerified}
                className={`ml-1 ${
                  isResending || isCodeVerified 
                    ? "text-gray-400 cursor-not-allowed" 
                    : "text-primary hover:underline"
                }`}
              >
                이메일 재전송하기
              </button>
            </p> ㅡㅇ

            {isCodeVerified ? (
              <Link href="/reset-password/new">
                <Button className="w-full bg-primary hover:bg-primary/90">비밀번호 재설정하기</Button>
              </Link>
            ) : (
              <Button 
                className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                disabled
              >
                비밀번호 재설정하기
              </Button>
            )}
          </div>

          <div className="text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">
                회원가입 시 입력한 정보가 기억나지 않는다면?
              </p>
              <Link href="/support" className="text-primary hover:underline text-sm">
                고객센터 문의하기(1670-0876)
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

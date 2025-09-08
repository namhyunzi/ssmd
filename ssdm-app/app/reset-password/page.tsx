"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordEmailPage() {
  const [email, setEmail] = useState("")
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // 이메일 유효성 검사
  const validateEmail = (email: string) => {
    if (!email) {
      setErrorMessage("필수 입력 항목입니다.")
      return false
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setErrorMessage("올바른 이메일 형식이 아닙니다.")
      return false
    }
    
    setErrorMessage("")
    return true
  }

  // 이메일 인증 요청
  const handleEmailVerification = async () => {
    if (!validateEmail(email)) {
      return
    }

    try {
      // 이메일 존재 여부 확인
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
          // 구글 간편 가입인지 확인
          if (data.isGoogleSignIn) {
            setErrorMessage("구글 간편 가입으로 가입한 계정입니다. 비밀번호 찾기는 '이메일 가입하기'로 가입한 경우에만 가능합니다.")
            return
          }
          
          // 이메일이 존재하고 일반 가입인 경우 인증코드 발송
          const verificationResponse = await fetch('/api/send-verification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          })

          if (verificationResponse.ok) {
            // 이메일을 sessionStorage에 저장
            sessionStorage.setItem('resetEmail', email)
            setIsEmailVerified(true)
            setErrorMessage("")
          } else {
            setErrorMessage("인증코드 발송에 실패했습니다.")
          }
        } else {
          setErrorMessage("등록된 이메일 주소가 아닙니다.")
        }
      } else {
        setErrorMessage(data.error || "이메일 확인 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error('이메일 인증 오류:', error)
      setErrorMessage("서버 오류가 발생했습니다.")
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
            <h2 className="text-sm font-normal text-muted-foreground">가입한 이메일 주소를 입력해주세요.</h2>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                type="email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMessage("") // 입력 시 오류 메시지 초기화
                }}
                disabled={isEmailVerified}
                className={`flex-1 focus:border-primary focus:ring-primary ${
                  isEmailVerified ? "bg-muted cursor-not-allowed" : ""
                }`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailVerification}
                disabled={isEmailVerified}
                className={`${
                  isEmailVerified 
                    ? "bg-blue-100 text-blue-600 border-blue-300 cursor-not-allowed" 
                    : "text-primary border-primary hover:bg-primary hover:text-white bg-transparent"
                }`}
              >
                {isEmailVerified ? "확인완료" : "확인"}
              </Button>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
            {isEmailVerified ? (
              <Link href="/reset-password/verify">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  이메일로 인증코드 받기
                </Button>
              </Link>
            ) : (
              <Button 
                className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                disabled
              >
                이메일로 인증코드 받기
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
    </div>
  )
}

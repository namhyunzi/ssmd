"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignupPage() {
  const router = useRouter()
  const [emailVerificationStep, setEmailVerificationStep] = useState<"initial" | "code-sent" | "verified">("initial")
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180) // 3 minutes
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [signupStep, setSignupStep] = useState<"form" | "complete">("form")

  const handleEmailVerification = () => {
    if (emailVerificationStep === "initial") {
      setEmailVerificationStep("code-sent")
      // Start timer countdown
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  const handleCodeVerification = () => {
    if (verificationCode.length === 6) {
      setEmailVerificationStep("verified")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
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
              <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-50 bg-transparent">
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
                  onChange={(e) => setEmailUsername(e.target.value)}
                  disabled={emailVerificationStep === "verified"}
                  className={`flex-1 focus:border-primary focus:ring-primary ${
                    emailVerificationStep === "verified" ? "bg-muted cursor-not-allowed" : ""
                  }`}
                />
                <span className="flex items-center text-muted-foreground">@</span>
                <Select value={emailDomain} onValueChange={setEmailDomain} disabled={emailVerificationStep === "verified"}>
                  <SelectTrigger className={`w-32 ${
                    emailVerificationStep === "verified" ? "bg-muted cursor-not-allowed" : ""
                  }`}>
                    <SelectValue placeholder="선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail.com">gmail.com</SelectItem>
                    <SelectItem value="naver.com">naver.com</SelectItem>
                    <SelectItem value="daum.net">daum.net</SelectItem>
                    <SelectItem value="hanmail.net">hanmail.net</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleEmailVerification}
              className={`w-full ${
                emailVerificationStep === "initial" && emailUsername && emailDomain
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : emailVerificationStep === "code-sent"
                    ? "bg-gray-200 text-gray-500"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-500"
              }`}
              disabled={emailVerificationStep !== "initial" || !emailUsername || !emailDomain}
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
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="pr-24 bg-white focus:border-primary focus:ring-primary"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-red-500 text-sm font-mono">{formatTime(timer)}</span>
                    <button
                      onClick={handleCodeVerification}
                      disabled={verificationCode.length !== 6}
                      className={`text-sm font-medium ${
                        verificationCode.length === 6 
                          ? "text-primary hover:text-primary/80" 
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      확인
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  이메일을 받지 못하셨나요? <button className="text-primary hover:underline">이메일 재전송하기</button>
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호 확인</label>
              <Input
                type="password"
                placeholder="비밀번호 확인"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full focus:border-primary focus:ring-primary"
              />
            </div>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90" 
            disabled={emailVerificationStep !== "verified" || !password || !passwordConfirm || password !== passwordConfirm}
            onClick={() => {
              if (emailVerificationStep === "verified" && password && passwordConfirm && password === passwordConfirm) {
                // 회원가입 완료 시 자동으로 로그인 상태로 설정
                localStorage.setItem('isLoggedIn', 'true')
                setSignupStep("complete")
                
                // 2초 후 대시보드로 자동 이동
                setTimeout(() => {
                  router.push('/dashboard')
                }, 2000)
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
    </div>
  )
}

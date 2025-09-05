"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordVerifyPage() {
  const [timeLeft, setTimeLeft] = useState(179) // 02:59
  const [verificationCode, setVerificationCode] = useState("")
  const [isCodeVerified, setIsCodeVerified] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
                  onChange={(e) => setVerificationCode(e.target.value)}
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
                    onClick={() => setIsCodeVerified(true)}
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

            <p className="text-xs text-muted-foreground flex items-center">
              <span className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center mr-2 text-xs">
                i
              </span>
              이메일을 받지 못하셨나요?{" "}
              <a href="#" className="text-primary hover:underline ml-1">
                이메일 재전송하기
              </a>
            </p>

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
            <p className="text-sm text-muted-foreground">
              회원가입 시 입력한 정보가 기억나지 않는다면?
              <br />
              <Link href="/support" className="text-primary hover:underline">
                고객센터 문의하기(1670-0876)
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

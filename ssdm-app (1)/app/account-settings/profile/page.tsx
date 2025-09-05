"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function ProfileEditPage() {
  const router = useRouter()
  const [emailStep, setEmailStep] = useState<"initial" | "editing" | "verify" | "completed">("initial")
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180) // 3 minutes
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("gmail.com")
  const [fullEmail, setFullEmail] = useState("")

  const isValidEmail = emailUsername.length > 0 && emailDomain.length > 0

  const handleEmailChange = () => {
    if (emailStep === "initial") {
      setEmailStep("editing")
      // 현재 표시된 이메일을 fullEmail에 설정
      const currentEmail = emailUsername && emailDomain ? `${emailUsername}@${emailDomain}` : "hyunji3556@gmail.com"
      setFullEmail(currentEmail)
    }
  }

  const handleEmailVerification = () => {
    if (emailStep === "editing" && isValidEmail) {
      setEmailStep("verify")
      setTimer(180) // Reset timer
      // Start timer countdown
    } else if (emailStep === "verify" && verificationCode.length === 6) {
      // 인증 완료 후 바로 initial 상태로 돌아감
      setEmailStep("initial")
      setVerificationCode("")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
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
            <CardTitle>개인정보 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" type="text" defaultValue="김철수" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                이메일<span className="text-red-500">*</span>
              </Label>

              <div className="space-y-3">
                {emailStep === "initial" && (
                  <>
                    <div className="bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {emailUsername && emailDomain ? `${emailUsername}@${emailDomain}` : "hyunji3556@gmail.com"}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={handleEmailChange}
                    >
                      이메일 변경하기
                    </Button>
                  </>
                )}

                {emailStep === "editing" && (
                  <div className="space-y-3">
                    <Input
                      value={fullEmail}
                      onChange={(e) => {
                        const emailValue = e.target.value
                        setFullEmail(emailValue)
                        
                        // 실시간으로 username과 domain 분리하여 유효성 검사용으로 사용
                        const atIndex = emailValue.lastIndexOf('@')
                        if (atIndex > -1) {
                          setEmailUsername(emailValue.substring(0, atIndex))
                          setEmailDomain(emailValue.substring(atIndex + 1))
                        } else {
                          setEmailUsername(emailValue)
                          setEmailDomain("")
                        }
                      }}
                      placeholder="이메일을 입력하세요"
                      className="w-full"
                    />
                    <Button
                      variant="outline"
                      className={`w-full ${
                        isValidEmail 
                          ? "bg-primary text-white hover:bg-primary/90" 
                          : "bg-gray-200 text-gray-500"
                      }`}
                      onClick={handleEmailVerification}
                      disabled={!isValidEmail}
                    >
                      이메일 인증하기
                    </Button>
                  </div>
                )}

                {emailStep === "verify" && (
                  <div className="space-y-3">
                    <div className="bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {emailUsername}@{emailDomain}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                      <div className="relative">
                        <Input
                          placeholder="인증코드 6자리"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          maxLength={6}
                          className="pr-24 bg-white"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <span className="text-red-500 text-sm font-mono">{formatTime(timer)}</span>
                          <button
                            onClick={handleEmailVerification}
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
                  </div>
                )}

              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input id="phone" type="tel" defaultValue="010-1234-5678" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input id="address" type="text" defaultValue="서울시 강남구 테헤란로 123" />
            </div>

            <div className="pt-4">
              <Link href="/account-settings/delete" className="text-sm text-muted-foreground hover:text-foreground flex items-center">
                탈퇴하기 <span className="ml-1">&gt;</span>
              </Link>
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
              onClick={() => router.push('/dashboard')}
            >
              완료
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

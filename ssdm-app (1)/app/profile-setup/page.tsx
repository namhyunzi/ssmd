"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function ProfileSetupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")
  const [zipCode, setZipCode] = useState("")
  
  // 이메일 관련 state
  const [emailOption, setEmailOption] = useState("same") // "same" | "different"
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("")
  const [emailVerificationStep, setEmailVerificationStep] = useState("initial") // "initial" | "code-sent" | "verified"
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180)

  // 계정 이메일 (가정)
  const accountEmail = "hyunji3556@gmail.com"

  const handleEmailVerification = () => {
    if (emailVerificationStep === "initial") {
      setEmailVerificationStep("code-sent")
    } else if (emailVerificationStep === "code-sent" && verificationCode.length === 6) {
      setEmailVerificationStep("verified")
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
            <CardTitle className="text-center text-xl">개인정보 입력</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              한 번만 정보를 입력하면, 여러 서비스에서 편리하게 이용할 수 있습니다
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <div className="flex space-x-2">
                  <Select defaultValue="010">
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="010">010</SelectItem>
                      <SelectItem value="011">011</SelectItem>
                      <SelectItem value="016">016</SelectItem>
                      <SelectItem value="017">017</SelectItem>
                      <SelectItem value="018">018</SelectItem>
                      <SelectItem value="019">019</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1234-5678"
                    className="flex-1 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>이메일</Label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <RadioGroup value={emailOption} onValueChange={setEmailOption} className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="same" id="same-email" />
                      <Label htmlFor="same-email">계정 이메일과 동일</Label>
                    </div>
                    {emailOption === "same" && (
                      <div className="relative">
                        <Input
                          value={accountEmail}
                          disabled
                          className="bg-muted cursor-not-allowed pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="different" id="different-email" />
                      <Label htmlFor="different-email">다른 이메일 사용</Label>
                    </div>
                    {emailOption === "different" && (
                      <div className="space-y-3">
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
                              <SelectItem value="knou.ac.kr">knou.ac.kr</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="outline"
                          className={`w-full ${
                            emailVerificationStep === "initial" && emailUsername && emailDomain
                              ? "bg-primary hover:bg-primary/90 text-white"
                              : emailVerificationStep === "code-sent"
                                ? "bg-gray-200 text-gray-500"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-500"
                          }`}
                          onClick={handleEmailVerification}
                          disabled={emailVerificationStep !== "initial" || !emailUsername || !emailDomain}
                        >
                          {emailVerificationStep === "initial" && "이메일 인증하기"}
                          {emailVerificationStep === "code-sent" && "이메일 인증하기"}
                          {emailVerificationStep === "verified" && "이메일 인증 완료"}
                        </Button>

                        {emailVerificationStep === "code-sent" && (
                          <div className="space-y-3 pt-4">
                            <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                            <div className="flex space-x-2 items-center">
                              <Input
                                type="text"
                                placeholder="인증코드 6자리"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                                className="flex-1 focus:border-primary focus:ring-primary"
                              />
                              <span className="text-red-500 text-sm font-mono min-w-[50px]">
                                {Math.floor(timer / 60)
                                  .toString()
                                  .padStart(2, "0")}
                                :{(timer % 60).toString().padStart(2, "0")}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEmailVerification}
                                disabled={verificationCode.length !== 6}
                                className="whitespace-nowrap"
                              >
                                확인
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              이메일을 받지 못하셨나요? <button className="text-primary hover:underline">이메일 재전송하기</button>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label>주소</Label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="flex-1 focus:border-primary focus:ring-primary bg-muted"
                    disabled
                  />
                  <Button variant="outline" className="bg-primary text-white hover:bg-primary/90">
                    주소찾기
                  </Button>
                </div>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="focus:border-primary focus:ring-primary bg-muted"
                  disabled
                />
                <Input
                  type="text"
                  placeholder="상세주소 입력"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="focus:border-primary focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  다음에 하기
                </Button>
              </Link>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  const isEmailValid = emailOption === "same" || 
                    (emailOption === "different" && emailVerificationStep === "verified")
                  
                  if (name || phone || isEmailValid || detailAddress) {
                    localStorage.setItem('profileCompleted', 'true')
                    router.push('/storage-setup')
                  }
                }}
                disabled={
                  !name && 
                  !phone && 
                  !detailAddress &&
                  emailOption === "different" && emailVerificationStep !== "verified"
                }
              >
                저장 후 계속
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">개인정보 보호</p>
                  <p className="text-muted-foreground mt-1">
                    개인정보는 암호화되어 안전하게 보관되며, 제공 시에는 본인의 동의가 필요합니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordEmailPage() {
  const [email, setEmail] = useState("")
  const [isEmailVerified, setIsEmailVerified] = useState(false)
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
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEmailVerified}
                className={`flex-1 focus:border-primary focus:ring-primary ${
                  isEmailVerified ? "bg-muted cursor-not-allowed" : ""
                }`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailVerified(true)}
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

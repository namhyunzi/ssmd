"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Fingerprint, Eye, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function SecuritySettingsPage() {
  const router = useRouter()
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false)
  const [faceIdEnabled, setFaceIdEnabled] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-primary">SSDM</h1>
            <p className="text-xs text-muted-foreground">개인정보보호</p>
          </div>
          <div className="w-16"></div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Biometric Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              생체인증 설정
            </CardTitle>
            <p className="text-sm text-muted-foreground">보안을 강화하기 위해 생체인증을 설정하세요</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fingerprint */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Fingerprint className="h-6 w-6 text-primary" />
                <div>
                  <Label htmlFor="fingerprint" className="text-base font-medium">
                    지문 인증
                  </Label>
                  <p className="text-sm text-muted-foreground">지문으로 앱에 로그인</p>
                </div>
              </div>
              <Switch id="fingerprint" checked={fingerprintEnabled} onCheckedChange={setFingerprintEnabled} />
            </div>

            {/* Face ID */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Eye className="h-6 w-6 text-primary" />
                <div>
                  <Label htmlFor="faceid" className="text-base font-medium">
                    얼굴 인증
                  </Label>
                  <p className="text-sm text-muted-foreground">얼굴 인식으로 앱에 로그인</p>
                </div>
              </div>
              <Switch id="faceid" checked={faceIdEnabled} onCheckedChange={setFaceIdEnabled} />
            </div>

            {/* Security Notice */}
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">보안 안내</p>
                  <p className="text-muted-foreground mt-1">
                    생체인증은 기기에 저장되며 서버로 전송되지 않습니다. 언제든지 설정을 변경할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>추가 보안 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">자동 로그아웃</Label>
                <p className="text-sm text-muted-foreground">30분 비활성 시 자동 로그아웃</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">로그인 알림</Label>
                <p className="text-sm text-muted-foreground">새로운 기기에서 로그인 시 알림</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

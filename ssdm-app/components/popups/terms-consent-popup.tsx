"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, FileText, Lock } from "lucide-react"

interface TermsConsentPopupProps {
  isOpen: boolean
  onClose: () => void
  onConsent: (consentValues: {
    termsAgreed: boolean
    privacyAgreed: boolean
    marketingAgreed: boolean
  }) => void
  userEmail?: string
  userName?: string
}

export default function TermsConsentPopup({
  isOpen,
  onClose,
  onConsent,
  userEmail,
  userName
}: TermsConsentPopupProps) {
  const [termsAgreed, setTermsAgreed] = useState(true)  // 서비스 이용약관 기본 동의
  const [privacyAgreed, setPrivacyAgreed] = useState(true)  // 개인정보 처리방침 기본 동의
  const [marketingAgreed, setMarketingAgreed] = useState(true)  // 마케팅 정보 수신 기본 동의

  const handleConsent = () => {
    if (termsAgreed && privacyAgreed) {
      onConsent({
        termsAgreed,
        privacyAgreed,
        marketingAgreed
      })
    }
  }

  const allRequiredAgreed = termsAgreed && privacyAgreed

  console.log('TermsConsentPopup 렌더링:', { isOpen, userEmail, userName })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh]">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">SSDM 서비스 이용약관</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {userName ? `${userName}님,` : ""} SSDM 서비스 이용을 위해<br />
            다음 약관에 동의해주세요.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 약관 동의 체크박스들 */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAgreed}
                onCheckedChange={(checked) => setTermsAgreed(checked as boolean)}
                className="mt-1 border-gray-400"
              />
              <div className="space-y-1">
                <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  서비스 이용약관 동의 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  SSDM 서비스의 이용조건 및 제한사항에 동의합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={privacyAgreed}
                onCheckedChange={(checked) => setPrivacyAgreed(checked as boolean)}
                className="mt-1 border-gray-400"
              />
              <div className="space-y-1">
                <label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                  개인정보처리방침 동의 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  개인정보 수집, 이용, 제공에 동의합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketing"
                checked={marketingAgreed}
                onCheckedChange={(checked) => setMarketingAgreed(checked as boolean)}
                className="mt-1 border-gray-400"
              />
              <div className="space-y-1">
                <label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                  마케팅 정보 수신 동의 <span className="text-gray-400">(선택)</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  서비스 개선 및 이벤트 정보를 받아보시겠습니까?
                </p>
              </div>
            </div>
          </div>

          {/* 약관 내용 미리보기 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">주요 약관 내용</span>
            </div>
            <ScrollArea className="h-32">
              <div className="text-xs text-muted-foreground space-y-2">
                <p><strong>서비스 이용약관:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>SSDM은 개인정보보호 서비스를 제공합니다</li>
                  <li>서비스 이용 시 본 약관에 동의한 것으로 간주됩니다</li>
                  <li>부적절한 사용 시 서비스 이용이 제한될 수 있습니다</li>
                </ul>
                
                <p><strong>개인정보처리방침:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>개인정보는 암호화되어 안전하게 보관됩니다</li>
                  <li>정보 제공 시에는 본인의 동의가 필요합니다</li>
                  <li>개인정보 삭제 요청 시 즉시 처리됩니다</li>
                </ul>
              </div>
            </ScrollArea>
          </div>

          {/* 보안 안내 */}
          <div className="flex items-start space-x-2 bg-blue-50 p-3 rounded-lg">
            <Lock className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">개인정보보호</p>
              <p>SSDM은 사용자의 개인정보를 최우선으로 보호하며, 안전한 서비스를 제공합니다.</p>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleConsent}
              disabled={!allRequiredAgreed}
            >
              동의 후 계속하기
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            동의 후 Google 계정으로 SSDM 서비스를 이용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

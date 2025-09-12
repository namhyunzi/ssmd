"use client"

import { useState } from "react"
import { Shield, X, User, Phone, MapPin, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface ConsentPopupProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
  userInfo?: {
    name: string
    phone: string
    address: string
  }
  onComplete?: (consentType: string, fields: string[]) => void
}

export default function ConsentPopup({ isOpen, onClose, serviceName, userInfo, onComplete }: ConsentPopupProps) {
  const [consentType, setConsentType] = useState<string>("once")

  if (!isOpen) return null

  // 만료일 계산 (6개월 후)
  const getExpiryDate = () => {
    const today = new Date()
    const expiryDate = new Date(today.setMonth(today.getMonth() + 6))
    return expiryDate.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // 기본값 설정 (실제 사용자 정보가 없을 때)
  const defaultUserInfo = {
    name: "사용자",
    phone: "전화번호 확인 중...", 
    address: "주소 확인 중..."
  }
  
  const displayUserInfo = userInfo || defaultUserInfo

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              정보 제공 동의
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {serviceName}에 다음 정보가 제공됩니다. 동의 방식을 선택해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 제공될 정보 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">제공될 정보</Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">이름</p>
                  <p className="text-sm text-gray-600">{displayUserInfo.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">휴대폰 번호</p>
                  <p className="text-sm text-gray-600">{displayUserInfo.phone}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">주소</p>
                  <p className="text-sm text-gray-600">{displayUserInfo.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 동의 방식 선택 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">동의 방식</Label>
            <div className="bg-gray-50 rounded-lg p-4">
              <RadioGroup value={consentType} onValueChange={setConsentType} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="once" id="once" />
                  <Label htmlFor="once" className="cursor-pointer">
                    <div>
                      <p className="font-medium">이번만 허용</p>
                      <p className="text-sm text-muted-foreground">이번 주문/거래에만 정보를 제공합니다</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="always" id="always" />
                  <Label htmlFor="always" className="cursor-pointer">
                    <div>
                      <p className="font-medium">항상 허용 (6개월)</p>
                      <p className="text-sm text-muted-foreground">만료일까지 자동으로 정보를 제공합니다. 연결해제 버튼으로 언제든 중단할 수 있습니다.</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* 만료일 표시 (항상 허용 선택 시) */}
          {consentType === "always" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-green-800 font-medium">
                  만료일: {getExpiryDate()}
                </p>
              </div>
            </div>
          )}

          {/* 안내 콜아웃 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                항상 허용을 선택하시면 6개월 후 자동 만료되며, 서비스 동의 내역에서 언제든 연결을 해제할 수 있습니다.
              </p>
            </div>
          </div>

          <Button 
            className="w-full h-12 bg-primary hover:bg-primary/90"
            onClick={() => {
              // 제공될 필드 목록 (실제로는 쇼핑몰이 요청한 필드)
              const requestedFields = ['name', 'phone', 'address']
              
              console.log(`동의 방식: ${consentType}, 서비스: ${serviceName}, 필드: ${requestedFields}`)
              
              // 동의 타입과 필드 정보를 부모 컴포넌트로 전달
              onComplete && onComplete(consentType, requestedFields)
            }}
          >
            동의하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
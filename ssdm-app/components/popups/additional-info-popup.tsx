"use client"

import { useState } from "react"
import { AlertTriangle, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AdditionalInfoPopupProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
  missingFields: string[]
  existingData?: { [key: string]: string } // 기존 데이터
  onComplete?: () => void
}

export default function AdditionalInfoPopup({ isOpen, onClose, serviceName, missingFields, existingData = {}, onComplete }: AdditionalInfoPopupProps) {
  const [name, setName] = useState(existingData.name || "")
  const [phone, setPhone] = useState(existingData.phone || "")
  const [zipCode, setZipCode] = useState(existingData.zipCode || "")
  const [address, setAddress] = useState(existingData.address || "")
  const [detailAddress, setDetailAddress] = useState(existingData.detailAddress || "")

  if (!isOpen) return null

  // 동적으로 누락된 필드만 검증
  const isFormValid = missingFields.every(field => {
    switch (field) {
      case 'name': return name.trim() !== ""
      case 'phone': return phone.trim() !== ""
      case 'address': return address.trim() !== ""
      default: return true
    }
  })

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              추가 정보 입력
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {serviceName}에서 요청한 정보 중 일부가 아직 입력되지 않았습니다. 추가 정보를 입력해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 모든 필드를 표시하되 누락된 것만 활성화 */}
          
          {/* 이름 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              이름 {missingFields.includes('name') && <span className="text-red-500">*</span>}
            </Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={missingFields.includes('name') ? "이름을 입력해주세요" : "이미 입력된 정보"}
              disabled={!missingFields.includes('name')}
              className={`h-12 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary ${
                !missingFields.includes('name') ? 'bg-gray-100' : 'bg-white'
              }`}
            />
          </div>

          {/* 휴대폰 번호 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              휴대폰 번호 {missingFields.includes('phone') && <span className="text-red-500">*</span>}
            </Label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex space-x-2">
                <Select defaultValue="010" disabled>
                  <SelectTrigger className="w-20 bg-gray-100 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="010">010</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={missingFields.includes('phone') ? "1234-5678" : "이미 입력된 정보"}
                  disabled={!missingFields.includes('phone')}
                  className={`flex-1 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 ${
                    !missingFields.includes('phone') ? 'bg-gray-100' : 'bg-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 주소 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              주소 {missingFields.includes('address') && <span className="text-red-500">*</span>}
            </Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex space-x-2">
                <Input 
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  disabled
                  className="w-24 bg-gray-100 border-gray-300"
                />
                <Button 
                  variant="outline" 
                  className="flex-shrink-0"
                  disabled={!missingFields.includes('address')}
                  onClick={() => {
                    // 주소 API 시뮬레이션
                    setZipCode("12345")
                    setAddress("서울특별시 강남구 테헤란로 123")
                  }}
                >
                  <Search className="h-4 w-4 mr-1" />
                  주소 찾기
                </Button>
              </div>
              <Input 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled
                className="bg-gray-100 border-gray-300"
              />
              <Input 
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                placeholder={missingFields.includes('address') ? "상세주소 입력" : "이미 입력된 정보"}
                disabled={!missingFields.includes('address')}
                className={`border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 ${
                  !missingFields.includes('address') ? 'bg-gray-100' : 'bg-white'
                }`}
              />
            </div>
          </div>

          <Button 
            className="w-full h-12 bg-primary hover:bg-primary/90"
            disabled={!isFormValid}
            onClick={() => {
              if (isFormValid) {
                onComplete && onComplete()
              }
            }}
          >
            저장 후 계속하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
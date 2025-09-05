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
  onComplete?: () => void
}

export default function AdditionalInfoPopup({ isOpen, onClose, serviceName, onComplete }: AdditionalInfoPopupProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")

  if (!isOpen) return null

  const isFormValid = name.trim() !== "" && phone.trim() !== "" && address.trim() !== ""

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
          {/* 이름 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">이름</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>

          {/* 휴대폰 번호 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">휴대폰 번호</Label>
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
                  placeholder="1234-5678"
                  className="flex-1 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 주소 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">주소</Label>
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
                placeholder="상세주소 입력"
                className="bg-white"
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
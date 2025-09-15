"use client"

import { useState, useEffect } from "react"
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
  hasExistingData?: boolean // 기존 데이터 존재 여부
  onComplete?: (data: { [key: string]: string }) => void
}

export default function AdditionalInfoPopup({ isOpen, onClose, serviceName, missingFields, hasExistingData = false, onComplete }: AdditionalInfoPopupProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    
    const numbers = phone.replace(/\D/g, '')
    
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`
    }
    
    return phone
  }

  // SSDM 중개 원칙: 실시간 복호화로 개인정보 표시 (상태에 저장하지 않음)
  const getExistingFieldValue = (field: string) => {
    try {
      const { loadFromLocalStorage } = require('@/lib/data-storage')
      const { decryptData } = require('@/lib/encryption')
      const localData = loadFromLocalStorage()
      
      if (!localData || !localData.encrypted) {
        return ''
      }
      
      // 실시간 복호화
      const decryptedDataString = decryptData(localData.encryptedData, localData.key)
      const profileData = JSON.parse(decryptedDataString)
      
      switch (field) {
        case 'name': return profileData.name || ''
        case 'phone': return formatPhoneNumber(profileData.phone || '')
        case 'address': return profileData.address || ''
        case 'zipCode': return profileData.zipCode || ''
        case 'detailAddress': return profileData.detailAddress || ''
        default: return ''
      }
    } catch (error) {
      console.error('개인정보 복호화 실패:', error)
      return ''
    }
  }

  // 필드가 누락된 필드인지 확인
  const isFieldMissing = (field: string) => missingFields.includes(field)

  if (!isOpen) return null

  // 누락된 필드만 검증
  const isFormValid = () => {
    if (isFieldMissing('name') && name.trim() === "") return false
    if (isFieldMissing('phone') && phone.trim() === "") return false
    if (isFieldMissing('address') && address.trim() === "") return false
    return true
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center justify-center text-lg flex-1">
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
          {isFieldMissing('name') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">이름</Label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12"
                placeholder="이름을 입력해주세요"
              />
            </div>
          )}
          
          {/* 이미 입력된 이름 표시 */}
          {!isFieldMissing('name') && getExistingFieldValue('name') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-600">이름 (이미 입력됨)</Label>
              <Input 
                value={getExistingFieldValue('name')}
                disabled
                className="h-12 bg-gray-100 border-gray-300"
              />
            </div>
          )}

          {/* 휴대폰 번호 */}
          {isFieldMissing('phone') && (
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
          )}
          
          {/* 이미 입력된 휴대폰 번호 표시 */}
          {!isFieldMissing('phone') && getExistingFieldValue('phone') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-600">휴대폰 번호 (이미 입력됨)</Label>
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
                    value={getExistingFieldValue('phone')}
                    disabled
                    className="flex-1 bg-gray-100 border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 주소 */}
          {isFieldMissing('address') && (
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
          )}
          
          {/* 이미 입력된 주소 표시 */}
          {!isFieldMissing('address') && getExistingFieldValue('address') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-600">주소 (이미 입력됨)</Label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex space-x-2">
                  <Input 
                    value={getExistingFieldValue('zipCode')}
                    disabled
                    className="w-24 bg-gray-100 border-gray-300"
                  />
                  <Button 
                    variant="outline" 
                    className="flex-shrink-0"
                    disabled
                  >
                    <Search className="h-4 w-4 mr-1" />
                    주소 찾기
                  </Button>
                </div>
                <Input 
                  value={getExistingFieldValue('address')}
                  disabled
                  className="bg-gray-100 border-gray-300"
                />
                <Input 
                  value={getExistingFieldValue('detailAddress')}
                  disabled
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
          )}

          <Button 
            className="w-full h-12 bg-primary hover:bg-primary/90"
            disabled={!isFormValid()}
            onClick={() => {
              if (isFormValid()) {
                const additionalData = {
                  name: isFieldMissing('name') ? name : getExistingFieldValue('name'),
                  phone: isFieldMissing('phone') ? phone : getExistingFieldValue('phone'),
                  address: isFieldMissing('address') ? `${address} ${detailAddress}`.trim() : getExistingFieldValue('address'),
                  zipCode: isFieldMissing('address') ? zipCode : getExistingFieldValue('zipCode')
                }
                onComplete && onComplete(additionalData)
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
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
  
  // 기존 데이터 저장용 state
  const [existingData, setExistingData] = useState({
    name: '',
    phone: '',
    address: '',
    zipCode: '',
    detailAddress: ''
  })

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

  // useEffect에서 데이터 로드
  useEffect(() => {
    const loadExistingData = async () => {
      const jwtToken = sessionStorage.getItem('openPopup')
      if (!jwtToken) return
      
      try {
        const decoded = JSON.parse(atob(jwtToken.split('.')[1]))
        const { uid } = decoded
        
        const { getDatabase, ref, get } = require('firebase/database')
        const db = getDatabase()
        const userProfileRef = ref(db, `userProfiles/${uid}`)
        
        const snapshot = await get(userProfileRef)
        if (snapshot.exists()) {
          const userProfile = snapshot.val()
          setExistingData({
            name: userProfile.name || '',
            phone: formatPhoneNumber(userProfile.phone || ''),
            address: userProfile.address || '',
            zipCode: userProfile.zipCode || '',
            detailAddress: userProfile.detailAddress || ''
          })
        }
      } catch (error) {
        console.error('개인정보 조회 실패:', error)
      }
    }
    
    loadExistingData()
  }, [])

  // Firebase에서 개인정보 조회하여 표시
  const getExistingFieldValue = (field: string) => {
    switch (field) {
      case 'name': return existingData.name
      case 'phone': return existingData.phone
      case 'address': return existingData.address
      case 'zipCode': return existingData.zipCode
      case 'detailAddress': return existingData.detailAddress
      default: return ''
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
            <Button variant="ghost" size="sm" onClick={() => {
              alert('개인정보 입력을 완료해주세요.')
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            <span className="text-primary font-medium">{serviceName}</span>에서 요청한 정보 중 일부가 아직 입력되지 않았습니다. 추가 정보를 입력해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 이름 */}
          {isFieldMissing('name') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`h-12 ${
                  isFieldMissing('name') && name.trim() === "" 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : "focus:border-primary focus:ring-primary"
                }`}
                placeholder="이름을 입력해주세요"
              />
              {isFieldMissing('name') && name.trim() === "" && (
                <p className="text-sm text-red-600">이름을 입력해주세요</p>
              )}
            </div>
          )}
          
          {/* 이미 입력된 이름 표시 */}
          {!isFieldMissing('name') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-600">이름</Label>
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
              <Label className="text-sm font-medium">
                휴대폰 번호 <span className="text-red-500">*</span>
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
                    placeholder="1234-5678"
                    className={`flex-1 ${
                      isFieldMissing('phone') && phone.trim() === "" 
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                        : "focus:border-primary focus:ring-primary"
                    }`}
                  />
                </div>
              </div>
              {isFieldMissing('phone') && phone.trim() === "" && (
                <p className="text-sm text-red-600">휴대폰 번호를 입력해주세요</p>
              )}
            </div>
          )}
          
          {/* 이미 입력된 휴대폰 번호 표시 */}
          {!isFieldMissing('phone') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-600">휴대폰 번호</Label>
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
              <Label className="text-sm font-medium">
                주소 <span className="text-red-500">*</span>
              </Label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex space-x-2">
                  <Input 
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className={`w-24 ${
                      isFieldMissing('address') && zipCode.trim() === "" 
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                        : "focus:border-primary focus:ring-primary"
                    }`}
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
                  className={`${
                    isFieldMissing('address') && address.trim() === "" 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                      : "focus:border-primary focus:ring-primary"
                  }`}
                />
                <Input 
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  placeholder="상세주소 입력"
                  className="bg-white"
                />
              </div>
              {isFieldMissing('address') && (address.trim() === "" || zipCode.trim() === "") && (
                <p className="text-sm text-red-600">주소를 입력해주세요</p>
              )}
            </div>
          )}
          
          {/* 이미 입력된 주소 표시 */}
          {!isFieldMissing('address') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-600">주소</Label>
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
            onClick={async () => {
              if (!isFormValid()) {
                // 오류 메시지 표시 (각 필드별로 이미 위에서 처리됨)
                return
              }
              
              if (isFormValid()) {
                try {
                  // 1. Firebase에 사용자 프로필 업데이트
                  const { getDatabase, ref, set } = require('firebase/database')
                  const { auth } = require('@/lib/firebase')
                  
                  if (!auth.currentUser) {
                    alert('로그인이 필요합니다.')
                    return
                  }
                  
                  const db = getDatabase()
                  const userId = auth.currentUser.uid
                  
                  // 누락된 필드의 데이터만 수집
                  const additionalData = {
                    name: isFieldMissing('name') ? name : getExistingFieldValue('name'),
                    phone: isFieldMissing('phone') ? phone : getExistingFieldValue('phone'),
                    address: isFieldMissing('address') ? `${address} ${detailAddress}`.trim() : getExistingFieldValue('address'),
                    zipCode: isFieldMissing('address') ? zipCode : getExistingFieldValue('zipCode')
                  }
                  
                  // Firebase에 사용자 프로필 업데이트
                  const userProfileRef = ref(db, `userProfiles/${userId}`)
                  await set(userProfileRef, additionalData)
                  
                  console.log('Firebase 업데이트 완료')
                  
                  // 2. 팝업 닫기
                  onClose()
                  
                  // 3. 정보제공화면으로 이동 (consent 페이지)
                  window.location.href = '/consent'
                  
                } catch (error) {
                  console.error('Firebase 업데이트 실패:', error)
                  alert('데이터 저장 중 오류가 발생했습니다.')
                }
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
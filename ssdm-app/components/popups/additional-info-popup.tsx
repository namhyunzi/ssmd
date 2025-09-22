"use client"

import { useState, useEffect } from "react"
import Script from "next/script"
import { AlertTriangle, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Daum 우편번호 API 타입 정의
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
          userSelectedType: 'R' | 'J';
          bname: string;
          buildingName: string;
          apartment: string;
        }) => void;
      }) => {
        open: () => void;
      };
    };
  }
}

interface AdditionalInfoPopupProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
  missingFields: string[]
  hasExistingData?: boolean // 기존 데이터 존재 여부
  onComplete?: (data: { [key: string]: string }) => void
  jwt?: string // JWT 토큰
}

export default function AdditionalInfoPopup({ isOpen, onClose, serviceName, missingFields, hasExistingData = false, onComplete, jwt }: AdditionalInfoPopupProps) {
  // 기존 데이터 저장용 state (DB에서 동적으로 가져옴)
  const [existingData, setExistingData] = useState({
    name: '',
    phone: '',
    address: '',
    zipCode: '',
    detailAddress: ''
  })

  // 필드별 포커스 상태 (클릭하고 벗어났는지 확인)
  const [fieldTouched, setFieldTouched] = useState({
    name: false,
    phone: false,
    address: false
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

  // Daum 우편번호 API 주소 찾기 함수
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: function(data) {
          // 도로명 주소와 지번 주소 모두 사용 가능
          let addr = '';
          let extraAddr = '';

          // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다.
          if (data.userSelectedType === 'R') { // 사용자가 도로명 주소를 선택했을 경우
            addr = data.roadAddress;
          } else { // 사용자가 지번 주소를 선택했을 경우(J)
            addr = data.jibunAddress;
          }

          // 사용자가 선택한 주소가 도로명 타입일때 참고항목을 조합한다.
          if(data.userSelectedType === 'R'){
            // 법정동명이 있을 경우 추가한다. (법정리는 제외)
            // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다.
            if(data.bname !== '' && /[동|로|가]$/g.test(data.bname)){
              extraAddr += data.bname;
            }
            // 건물명이 있고, 공동주택일 경우 추가한다.
            if(data.buildingName !== '' && data.apartment === 'Y'){
              extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
            }
            // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
            if(extraAddr !== ''){
              extraAddr = ' (' + extraAddr + ')';
            }
          }

          // 우편번호와 주소 정보를 해당 필드에 넣는다.
          setExistingData(prev => ({
            ...prev,
            zipCode: data.zonecode,
            address: addr + extraAddr
          }))
        }
      }).open();
    } else {
      alert('우편번호 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  // useEffect에서 데이터 로드 (팝업이 열릴 때마다)
  useEffect(() => {
    if (!isOpen) return // 팝업이 닫혀있으면 실행하지 않음
    
    const loadExistingData = async () => {
      console.log('=== 추가정보 팝업 데이터 로드 시작 ===')
      if (!jwt) {
        console.log('JWT 토큰 없음')
        return
      }
      
      try {
        // 현재 로그인한 사용자의 Firebase UID 가져오기
        const { auth } = await import('@/lib/firebase')
        if (!auth.currentUser) {
          console.log('로그인된 사용자 없음')
          throw new Error('로그인이 필요합니다.')
        }
        
        const firebaseUid = auth.currentUser.uid
        console.log('사용자 UID:', firebaseUid)
        
        const { realtimeDb } = await import('@/lib/firebase')
        const { ref, get } = await import('firebase/database')
        const userProfileRef = ref(realtimeDb, `users/${firebaseUid}/profile`)
        
        const snapshot = await get(userProfileRef)
        console.log('Firebase 데이터 존재 여부:', snapshot.exists())
        
        if (snapshot.exists()) {
          const userProfile = snapshot.val()
          console.log('가져온 사용자 데이터:', userProfile)
          
          const existingData = {
            name: userProfile.name || '',
            phone: formatPhoneNumber(userProfile.phone || ''),
            address: userProfile.address || '',
            zipCode: userProfile.zipCode || '',
            detailAddress: userProfile.detailAddress || ''
          }
          
          console.log('설정할 데이터:', existingData)
          setExistingData(existingData)
        } else {
          console.log('사용자 프로필 데이터 없음')
        }
      } catch (error) {
        console.error('개인정보 조회 실패:', error)
      }
    }
    
    loadExistingData()
  }, [isOpen, jwt]) // isOpen과 jwt가 변경될 때마다 실행

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
    if (isFieldMissing('name') && existingData.name.trim() === "") return false
    if (isFieldMissing('phone') && existingData.phone.trim() === "") return false
    if (isFieldMissing('address') && existingData.address.trim() === "") return false
    return true
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      {/* Daum 우편번호 API 스크립트 로드 */}
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('Daum 우편번호 API 로드 완료');
        }}
      />
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
            <span className="text-primary font-medium">{serviceName}</span>에서 요청한 정보 중 일부가 아직 입력되지 않았습니다. 추가 정보를<br/>입력해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 이름 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              이름 {isFieldMissing('name') && <span className="text-red-500">*</span>}
            </Label>
            <Input 
              value={existingData.name}
              onChange={(e) => setExistingData(prev => ({...prev, name: e.target.value}))}
              onBlur={() => setFieldTouched(prev => ({...prev, name: true}))}
              disabled={!isFieldMissing('name')}
              className={`h-12 ${
                !isFieldMissing('name') 
                  ? "bg-gray-100 border-gray-300" 
                  : isFieldMissing('name') && existingData.name.trim() === "" && fieldTouched.name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : "focus:border-primary focus:ring-primary"
              }`}
              placeholder={isFieldMissing('name') ? "이름을 입력해주세요" : ""}
            />
            {isFieldMissing('name') && existingData.name.trim() === "" && fieldTouched.name && (
              <p className="text-sm text-red-600">이름을 입력해주세요</p>
            )}
            {!isFieldMissing('name') && (
              <p className="text-xs text-gray-500">이미 입력된 정보입니다</p>
            )}
          </div>

          {/* 휴대폰 번호 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              휴대폰 번호 {isFieldMissing('phone') && <span className="text-red-500">*</span>}
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
                  value={existingData.phone}
                  onChange={(e) => setExistingData(prev => ({...prev, phone: e.target.value}))}
                  onBlur={() => setFieldTouched(prev => ({...prev, phone: true}))}
                  disabled={!isFieldMissing('phone')}
                  placeholder={isFieldMissing('phone') ? "1234-5678" : ""}
                  className={`flex-1 ${
                    !isFieldMissing('phone') 
                      ? "bg-gray-100 border-gray-300" 
                      : isFieldMissing('phone') && existingData.phone.trim() === "" && fieldTouched.phone
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                        : "focus:border-primary focus:ring-primary"
                  }`}
                />
              </div>
            </div>
            {isFieldMissing('phone') && existingData.phone.trim() === "" && fieldTouched.phone && (
              <p className="text-sm text-red-600">휴대폰 번호를 입력해주세요</p>
            )}
            {!isFieldMissing('phone') && (
              <p className="text-xs text-gray-500">이미 입력된 정보입니다</p>
            )}
          </div>

          {/* 주소 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              주소 {isFieldMissing('address') && <span className="text-red-500">*</span>}
            </Label>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex space-x-2">
                <Input 
                  value={existingData.zipCode}
                  onChange={(e) => setExistingData(prev => ({...prev, zipCode: e.target.value}))}
                  onBlur={() => setFieldTouched(prev => ({...prev, address: true}))}
                  disabled={!isFieldMissing('address')}
                  className={`w-24 ${
                    !isFieldMissing('address') 
                      ? "bg-gray-100 border-gray-300" 
                      : isFieldMissing('address') && existingData.zipCode.trim() === "" && fieldTouched.address
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                        : "focus:border-primary focus:ring-primary"
                  }`}
                />
                <Button 
                  variant="outline" 
                  className="flex-shrink-0"
                  disabled={!isFieldMissing('address')}
                  onClick={handleAddressSearch}
                >
                  <Search className="h-4 w-4 mr-1" />
                  주소 찾기
                </Button>
              </div>
              <Input 
                value={existingData.address}
                onChange={(e) => setExistingData(prev => ({...prev, address: e.target.value}))}
                onBlur={() => setFieldTouched(prev => ({...prev, address: true}))}
                disabled={!isFieldMissing('address')}
                className={`${
                  !isFieldMissing('address') 
                    ? "bg-gray-100 border-gray-300" 
                    : isFieldMissing('address') && existingData.address.trim() === "" && fieldTouched.address
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                      : "focus:border-primary focus:ring-primary"
                }`}
              />
              <Input 
                value={existingData.detailAddress}
                onChange={(e) => setExistingData(prev => ({...prev, detailAddress: e.target.value}))}
                onBlur={() => setFieldTouched(prev => ({...prev, address: true}))}
                disabled={!isFieldMissing('address')}
                placeholder={isFieldMissing('address') ? "상세주소 입력" : ""}
                className={!isFieldMissing('address') ? "bg-gray-100 border-gray-300" : "bg-white"}
              />
            </div>
            {isFieldMissing('address') && (existingData.address.trim() === "" || existingData.zipCode.trim() === "") && fieldTouched.address && (
              <p className="text-sm text-red-600">주소를 입력해주세요</p>
            )}
            {!isFieldMissing('address') && (
              <p className="text-xs text-gray-500">이미 입력된 정보입니다</p>
            )}
          </div>

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
                    name: isFieldMissing('name') ? existingData.name : getExistingFieldValue('name'),
                    phone: isFieldMissing('phone') ? existingData.phone : getExistingFieldValue('phone'),
                    address: isFieldMissing('address') ? `${existingData.address} ${existingData.detailAddress}`.trim() : getExistingFieldValue('address'),
                    zipCode: isFieldMissing('address') ? existingData.zipCode : getExistingFieldValue('zipCode')
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
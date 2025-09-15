"use client"

import { useState, useEffect, Suspense } from "react"
import { ArrowLeft, User, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import ProgressSteps from "@/components/ui/progress-steps"
import { generateEncryptionKey, encryptData, decryptData } from "@/lib/encryption"

function AdditionalInfoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [missingFields, setMissingFields] = useState<string[]>(['name', 'phone', 'address'])
  const [uid, setUid] = useState<string>('')
  const [fields, setFields] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [hasExistingData, setHasExistingData] = useState<boolean>(false)
  
  // 폼 상태
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    // 1. 먼저 로그인 상태 확인
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    try {
      // Firebase Auth 상태 확인
      const { getAuth, onAuthStateChanged } = await import('firebase/auth')
      const auth = getAuth()
      
      const currentUser = await new Promise<any>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          resolve(user)
        })
      })
      
      if (!currentUser) {
        // 로그인되지 않은 경우 → 로그인 페이지로 리디렉션
        console.log('로그인되지 않음 - 로그인 페이지로 리디렉션')
        const currentUrl = window.location.href
        localStorage.setItem('redirect_after_login', currentUrl)
        window.location.href = '/'
        return
      }
      
      // 로그인된 경우 → URL 파라미터 처리 및 기존 데이터 로드
      setIsLoggedIn(true)
      loadUrlParams()
      await loadExistingData()
      
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error)
    }
  }

  const loadUrlParams = () => {
    // URL 파라미터에서 누락된 필드 정보 가져오기
    const missingParam = searchParams.get('missing')
    const uidParam = searchParams.get('uid')
    const fieldsParam = searchParams.get('fields')
    
    if (missingParam) {
      setMissingFields(missingParam.split(','))
    }
    if (uidParam) {
      setUid(uidParam)
    }
    if (fieldsParam) {
      setFields(fieldsParam)
    }
  }

  const loadExistingData = async () => {
    try {
      // Firebase에서 사용자 기존 데이터 로드 및 복호화
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.error('로그인된 사용자가 없습니다.')
        return
      }
      
      const { getDatabase, ref, get } = await import('firebase/database')
      const db = getDatabase()
      
      // 사용자 메타데이터 조회
      const metadataRef = ref(db, `users/${currentUser.uid}/metadata`)
      const metadataSnapshot = await get(metadataRef)
      
      if (metadataSnapshot.exists()) {
        const metadata = metadataSnapshot.val()
        setHasExistingData(true)
      }
      
      // 암호화된 개인정보 데이터 조회
      const encryptedDataRef = ref(db, `users/${currentUser.uid}/encryptedData`)
      const encryptedSnapshot = await get(encryptedDataRef)
      
      if (encryptedSnapshot.exists()) {
        const encryptedData = encryptedSnapshot.val()
        const encryptionKey = generateEncryptionKey(currentUser.uid)
        
        try {
          // SSDM 중개 원칙: 개인정보를 상태에 저장하지 않음
          // 복호화는 성공했지만 상태에 저장하지 않음
          console.log('암호화된 개인정보 복호화 성공')
        } catch (error) {
          console.error('암호화된 데이터 복호화 실패:', error)
        }
      }
      
    } catch (error) {
      console.error('기존 데이터 로드 실패:', error)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    
    try {
      // 누락된 필드의 데이터만 수집
      const additionalData: { [key: string]: string } = {}
      
      if (isFieldMissing('name')) {
        additionalData.name = name
      }
      if (isFieldMissing('phone')) {
        additionalData.phone = phone
      }
      if (isFieldMissing('address')) {
        additionalData.address = `${address} ${detailAddress}`.trim()
        additionalData.zipCode = zipCode
      }
      
      // 1. SSDM 로컬 암호화 데이터 업데이트 (기존 데이터 + 추가 데이터)
      await updateLocalEncryptedData(additionalData)
      
      // 2. SSDM 사용자 메타데이터 업데이트 (어떤 필드가 있는지)
      await updateUserMetadata()
      
      // 3. 완료 후 정보 제공 동의 페이지로 이동 (원래 파라미터 유지 + 새로고침 플래그)
      const consentUrl = `/consent?uid=${encodeURIComponent(uid)}&fields=${encodeURIComponent(fields)}&fromAdditionalInfo=true&step=2`
      router.push(consentUrl)
      
    } catch (error) {
      console.error('데이터 업데이트 실패:', error)
      alert('데이터 저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const updateUserMetadata = async () => {
    try {
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.error('로그인된 사용자가 없습니다.')
        return
      }
      
      const { getDatabase, ref, set, get } = await import('firebase/database')
      const db = getDatabase()
      
      // 기존 메타데이터 조회
      const metadataRef = ref(db, `userProfileMetadata/${currentUser.uid}`)
      const metadataSnapshot = await get(metadataRef)
      
      let existingMetadata = {}
      if (metadataSnapshot.exists()) {
        existingMetadata = metadataSnapshot.val()
      }
      
      // 메타데이터 업데이트 (마지막 업데이트 시간 갱신)
      const updatedMetadata = {
        ...existingMetadata,
        lastUpdated: new Date().toISOString(),
        hasAdditionalInfo: true
      }
      
      await set(metadataRef, updatedMetadata)
      
      console.log('사용자 메타데이터 업데이트 완료')
    } catch (error) {
      console.error('메타데이터 업데이트 실패:', error)
      throw error
    }
  }

  const updateLocalEncryptedData = async (additionalData: { [key: string]: string }) => {
    try {
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.error('로그인된 사용자가 없습니다.')
        return
      }
      
      // SSDM 중개 원칙: 로컬 저장소에서 암호화 데이터 업데이트
      const { loadFromLocalStorage, saveProfileWithMetadata } = require('@/lib/data-storage')
      const { decryptData } = require('@/lib/encryption')
      
      // 기존 암호화된 데이터 로드
      const localData = loadFromLocalStorage()
      let existingProfileData = {}
      
      if (localData && localData.encrypted) {
        try {
          // 기존 데이터 복호화
          const decryptedDataString = decryptData(localData.encryptedData, localData.key)
          existingProfileData = JSON.parse(decryptedDataString)
        } catch (error) {
          console.error('기존 데이터 복호화 실패:', error)
          existingProfileData = {}
        }
      }
      
      // 기존 데이터와 추가 데이터 병합
      const updatedProfileData = {
        ...existingProfileData,
        ...additionalData
      }
      
      // 업데이트된 데이터를 다시 암호화하여 로컬 저장소에 저장
      await saveProfileWithMetadata(updatedProfileData, currentUser)
      
      console.log('로컬 암호화 데이터 업데이트 완료')
    } catch (error) {
      console.error('로컬 암호화 데이터 업데이트 실패:', error)
      throw error
    }
  }

  // 폼 유효성 검사
  const isFormValid = () => {
    if (isFieldMissing('name') && name.trim() === "") return false
    if (isFieldMissing('phone') && phone.trim() === "") return false
    if (isFieldMissing('address') && address.trim() === "") return false
    return true
  }

  // 로그인 상태 확인 중
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>로그인 상태를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우 (리디렉션 중)
  if (isLoggedIn === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p>로그인 페이지로 이동 중...</p>
        </div>
      </div>
    )
  }

  const progressSteps = [
    {
      number: 1,
      title: "추가정보 입력"
    },
    {
      number: 2,
      title: "정보제공동의"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* 진행 표시줄 */}
        <ProgressSteps 
          currentStep={1} 
          steps={progressSteps}
        />

        {/* 헤더 */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold mb-2">추가 정보 입력</h1>
          <p className="text-muted-foreground text-lg">
            쇼핑몰에서 요청한 정보 중 부족한 정보를 입력해주세요
          </p>
        </div>

        {/* 메인 콘텐츠 */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <User className="h-6 w-6 mr-2 text-blue-600" />
              개인정보 입력
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              아래 정보 중 누락된 항목을 입력해주세요
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 이름 */}
            {isFieldMissing('name') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">이름 *</Label>
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
                <Label className="text-sm font-medium">휴대폰 번호 *</Label>
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
                <Label className="text-sm font-medium">주소 *</Label>
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
                      <MapPin className="h-4 w-4 mr-1" />
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
                      <MapPin className="h-4 w-4 mr-1" />
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

            {/* 버튼 */}
            <div className="flex space-x-4 pt-6">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex-1 h-12"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={!isFormValid() || loading}
                className="flex-1 h-12 bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    저장 중...
                  </>
                ) : (
                  '다음 단계로'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdditionalInfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>페이지를 로드하는 중...</p>
        </div>
      </div>
    }>
      <AdditionalInfoContent />
    </Suspense>
  )
}

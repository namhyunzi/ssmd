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

  // Firebase에서 개인정보 조회하여 표시
  const getExistingFieldValue = async (field: string) => {
    try {
      const { getUserProfile } = require('@/lib/data-storage')
      const { auth } = require('@/lib/firebase')
      
      if (!auth.currentUser) {
        return ''
      }
      
      const userProfile = await getUserProfile(auth.currentUser)
      
      if (!userProfile) {
        return ''
      }
      
      switch (field) {
        case 'name': return userProfile.name || ''
        case 'phone': return formatPhoneNumber(userProfile.phone || '')
        case 'address': return userProfile.address || ''
        case 'zipCode': return userProfile.zipCode || ''
        case 'detailAddress': return userProfile.detailAddress || ''
        default: return ''
      }
    } catch (error) {
      console.error('개인정보 조회 실패:', error)
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
        // JWT 토큰만 저장하고 쿼리스트링은 저장하지 않음
        sessionStorage.setItem('redirect_after_login', '/additional-info')
        // 외부 팝업에서 온 경우를 표시
        sessionStorage.setItem('from_external_popup', 'true')
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
    // JWT에서 데이터 추출 (쿼리스트링 대신)
    const jwtToken = sessionStorage.getItem('openPopup')
    if (jwtToken) {
      try {
        // JWT에서 shopId, mallId 추출
        const decoded = JSON.parse(atob(jwtToken.split('.')[1]))
        const { shopId, mallId } = decoded
        
        // 필요한 데이터를 JWT에서 가져와서 설정
        setUid(shopId) // shopId를 uid로 사용
        
        // missingFields는 mallInfo에서 가져오기 (loadExistingData에서 처리)
      } catch (error) {
        console.error('JWT 파싱 오류:', error)
      }
    }
  }

  const loadExistingData = async () => {
    try {
      // Firebase에서 사용자 기존 데이터 로드
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.error('로그인된 사용자가 없습니다.')
        return
      }
      
      // Firebase에서 개인정보 조회
      const { getUserProfile } = await import('@/lib/data-storage')
      const userProfile = await getUserProfile(currentUser)
      
      if (userProfile) {
        setHasExistingData(true)
        console.log('Firebase에서 개인정보 조회 성공')
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
      await updateFirebaseProfile(additionalData)
      
      // 2. SSDM 사용자 프로필 업데이트 (어떤 필드가 있는지)
      await updateUserProfile()
      
      // 3. 완료 후 개인저장소 설정 페이지로 이동 (개인저장소 → 분산저장소 순서)
      sessionStorage.setItem('redirect_after_additional_info', '/storage-setup')
      // JWT와 파라미터는 sessionStorage에 이미 저장되어 있음
      window.location.href = '/storage-setup'
      
    } catch (error) {
      console.error('데이터 업데이트 실패:', error)
      alert('데이터 저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfile = async () => {
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
      
      // 기존 프로필 조회
      const profileRef = ref(db, `users/${currentUser.uid}/profile`)
      const profileSnapshot = await get(profileRef)
      
      let existingProfile = {}
      if (profileSnapshot.exists()) {
        existingProfile = profileSnapshot.val()
      }
      
      // 프로필 업데이트 (마지막 업데이트 시간 갱신)
      const updatedProfile = {
        ...existingProfile,
        lastUpdated: new Date().toISOString(),
        hasAdditionalInfo: true
      }
      
      await set(profileRef, updatedProfile)
      
      console.log('사용자 프로필 업데이트 완료')
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      throw error
    }
  }

  const updateFirebaseProfile = async (additionalData: { [key: string]: string }) => {
    try {
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.error('로그인된 사용자가 없습니다.')
        return
      }
      
      // Firebase에서 기존 개인정보 조회
      const { getUserProfile, saveUserProfile } = await import('@/lib/data-storage')
      const existingProfile = await getUserProfile(currentUser)
      
      // 기존 데이터와 추가 데이터 병합
      const updatedProfileData = {
        name: existingProfile?.name || '',
        phone: existingProfile?.phone || '',
        address: existingProfile?.address || '',
        detailAddress: existingProfile?.detailAddress || '',
        zipCode: existingProfile?.zipCode || '',
        email: existingProfile?.email || '',
        ...additionalData
      }
      
      // Firebase에 업데이트된 데이터 저장
      await saveUserProfile(currentUser, updatedProfileData)
      
      console.log('Firebase 개인정보 업데이트 완료')
    } catch (error) {
      console.error('Firebase 개인정보 업데이트 실패:', error)
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

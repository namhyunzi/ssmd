"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Shield, X, User, Phone, MapPin, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import ProgressSteps from "@/components/ui/progress-steps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

function ConsentPageContent() {
  const [consentType, setConsentType] = useState<string>("once")
  const [loading, setLoading] = useState(false)
  const [hasProfileData, setHasProfileData] = useState<boolean>(false)
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [mallInfo, setMallInfo] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const shopId = searchParams.get('shopId')
  const mallId = searchParams.get('mallId')
  const uid = searchParams.get('uid')

  useEffect(() => {
    console.log('=== useEffect 시작 ===')
    console.log('shopId:', shopId, 'mallId:', mallId)
    console.log('현재 환경:', window.parent === window ? '일반 페이지' : '팝업/iframe')
    
    if (!shopId || !mallId) {
      console.log('파라미터 누락')
      setError("필수 파라미터가 누락되었습니다. (shopId, mallId 필요)")
      return
    }

    console.log('로그인 상태 확인 시작')
    // 약간의 지연을 두고 Firebase 초기화 확인
    const timer = setTimeout(() => {
      checkLoginStatus()
    }, 100) // 100ms 지연으로 Firebase 초기화 대기
    
    return () => clearTimeout(timer)
  }, [shopId, mallId])



  // 추가정보 입력 후 데이터 새로고침
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const fromAdditionalInfo = urlParams.get('fromAdditionalInfo')
    
    if (fromAdditionalInfo === 'true') {
      // 추가정보 입력 후 이동한 경우 데이터 새로고침
      setDataRefreshKey(prev => prev + 1)
      console.log('추가정보 입력 후 이동 - 데이터 새로고침')
    }
  }, [])

  const checkLoginStatus = async () => {
    try {
      console.log('Firebase import 시작')
      
      // Firebase 모듈 동적 import with 에러 처리
      let auth, onAuthStateChanged
      try {
        const firebaseModule = await import('@/lib/firebase')
        auth = firebaseModule.auth
        console.log('Firebase auth import 완료:', !!auth)
        
        // Firebase Auth가 제대로 초기화되었는지 확인
        if (!auth) {
          throw new Error('Firebase Auth 인스턴스가 생성되지 않았습니다.')
        }
        
        const authModule = await import('firebase/auth')
        onAuthStateChanged = authModule.onAuthStateChanged
        console.log('onAuthStateChanged import 완료:', !!onAuthStateChanged)
        
        if (!onAuthStateChanged) {
          throw new Error('Firebase Auth 메서드를 불러올 수 없습니다.')
        }
      } catch (importError: any) {
        console.error('Firebase 모듈 로드 실패:', importError)
        
        // 구체적인 에러 메시지 제공
        let errorMessage = 'Firebase 초기화에 실패했습니다.'
        if (importError?.message?.includes('환경변수')) {
          errorMessage = 'Firebase 설정이 올바르지 않습니다. 관리자에게 문의하세요.'
        } else if (importError?.message?.includes('network')) {
          errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.'
        } else {
          errorMessage = 'Firebase 초기화에 실패했습니다. 페이지를 새로고침해주세요.'
        }
        
        setError(errorMessage)
        return
      }

      console.log('Firebase Auth 상태 확인 시작')
      
      // Firebase Auth 상태 확인
      const currentUser = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Firebase Auth 상태 확인 시간 초과'))
        }, 10000) // 10초 타임아웃
        
        try {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(timeout)
            unsubscribe()
            resolve(user)
          })
        } catch (authError) {
          clearTimeout(timeout)
          reject(authError)
        }
      })
      
      console.log('Firebase Auth 상태 확인 완료:', !!currentUser)
      
      if (!currentUser) {
        console.log('로그인되지 않음 - 로그인 페이지로 리디렉션')
        const currentUrl = window.location.href
        localStorage.setItem('redirect_after_login', currentUrl)
        window.location.href = '/'
        return
      }
      
      console.log('로그인된 사용자 확인:', currentUser.uid)
      setIsLoggedIn(true)
      
      // 개인정보 존재 여부 확인
      await checkProfileData()
      
    } catch (error: any) {
      console.error('로그인 상태 확인 실패:', error)
      
      // 구체적인 에러 메시지 제공
      let errorMessage = '로그인 상태 확인 중 오류가 발생했습니다.'
      if (error?.message?.includes('시간 초과')) {
        errorMessage = '로그인 상태 확인 시간이 초과되었습니다. 페이지를 새로고침해주세요.'
      } else if (error?.message?.includes('network')) {
        errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.'
      } else {
        errorMessage = '로그인 상태 확인 중 오류가 발생했습니다. 페이지를 새로고침해주세요.'
      }
      
      setError(errorMessage)
    }
  }

  const checkProfileData = async () => {
    try {
      console.log('개인정보 존재 여부 확인 시작')
      
      // 로컬 저장소에서 개인정보 존재 여부 확인
      const { loadFromLocalStorage } = require('@/lib/data-storage')
      const localData = loadFromLocalStorage()
      
      if (localData && localData.encrypted) {
        console.log('개인정보 존재함')
        setHasProfileData(true)
        
        // 개인정보 복호화해서 userInfo에 설정
        const { loadProfileFromLocal } = await import('@/lib/data-storage')
        const decryptedData = loadProfileFromLocal()
        
        if (decryptedData) {
          console.log('복호화된 사용자 데이터:', decryptedData)
          setUserInfo(decryptedData)
        }
        
        // 쇼핑몰 정보 로드
        await loadMallInfo()
        
        // 필수 필드 확인 및 추가정보 입력 페이지로 리디렉션
        await checkRequiredFields()
      } else {
        console.log('개인정보 없음')
        setHasProfileData(false)
        setError('개인정보가 등록되지 않았습니다. 프로필 설정을 먼저 완료해주세요.')
      }
    } catch (error) {
      console.error('개인정보 확인 실패:', error)
      setError('개인정보 확인 중 오류가 발생했습니다.')
    }
  }

  const loadMallInfo = async () => {
    try {
      console.log('쇼핑몰 정보 로드 시작')
      
      if (!mallId) {
        console.log('mallId가 없음')
        return
      }
      
      // Firebase에서 쇼핑몰 정보 조회
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get } = await import('firebase/database')
      
      const mallRef = ref(realtimeDb, `malls/${mallId}`)
      const mallSnapshot = await get(mallRef)
      
      if (mallSnapshot.exists()) {
        const mallData = mallSnapshot.val()
        console.log('쇼핑몰 정보 로드 완료:', mallData)
        setMallInfo({
          ...mallData,
          mallId,
          name: mallData.mallName || mallId, // admin에서 저장한 한글 이름 사용
          requiredFields: mallData.allowedFields || []
        })
      } else {
        console.log('쇼핑몰 정보를 찾을 수 없음')
        setError('쇼핑몰 정보를 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('쇼핑몰 정보 로드 실패:', error)
      setError('쇼핑몰 정보 로드 중 오류가 발생했습니다.')
    }
  }

  const checkRequiredFields = async () => {
    try {
      console.log('필수 필드 확인 시작')
      
      if (!mallInfo || !mallInfo.requiredFields) {
        console.log('mallInfo 또는 requiredFields가 없음')
        return
      }
      
      // 요청된 필드들을 배열로 변환
      const requestedFields = mallInfo.requiredFields
      console.log('요청된 필드들:', requestedFields)
      
      // 누락된 필드 확인
      const missingFields = requestedFields.filter((field: string) => {
        const value = getFieldValue(field)
        return !value || value.trim() === ''
      })
      
      console.log('누락된 필드들:', missingFields)
      
      if (missingFields.length > 0) {
        console.log('누락된 필드가 있음 - 추가정보 입력 페이지로 리디렉션')
        // 추가정보 입력 페이지로 리디렉션
        const additionalInfoUrl = `/additional-info?userId=${encodeURIComponent(uid || '')}&apiKey=${encodeURIComponent(mallInfo.apiKey || '')}&mallId=${encodeURIComponent(mallId || '')}&shopId=${encodeURIComponent(shopId || '')}`
        window.location.href = additionalInfoUrl
        return
      }
      
      console.log('모든 필수 필드가 입력됨')
    } catch (error) {
      console.error('필수 필드 확인 실패:', error)
      setError('필수 필드 확인 중 오류가 발생했습니다.')
    }
  }

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

  // SSDM 중개 원칙: 실시간 복호화로 개인정보 표시
  const getFieldValue = (field: string) => {
    try {
      // userInfo에서 직접 가져오기 (이미 복호화된 데이터)
      if (!userInfo) {
        console.log('userInfo가 없습니다')
        return ''
      }
      
      console.log('getFieldValue 호출:', { field, userInfo })
      
      switch (field) {
        case 'name': return userInfo.name || ''
        case 'phone': return formatPhoneNumber(userInfo.phone || '')
        case 'address': return userInfo.address || ''
        case 'detailAddress': return userInfo.detailAddress || ''
        case 'zipCode': return userInfo.zipCode || ''
        case 'email': return userInfo.email || ''
        default: return ''
      }
    } catch (error) {
      console.error('개인정보 표시 실패:', error)
      return ''
    }
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'address': return <MapPin className="h-4 w-4" />
      case 'detailAddress': return <MapPin className="h-4 w-4" />
      case 'zipCode': return <MapPin className="h-4 w-4" />
      case 'email': return <Info className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name': return '이름'
      case 'phone': return '휴대폰번호'
      case 'address': return '주소'
      case 'detailAddress': return '상세주소'
      case 'zipCode': return '우편번호'
      case 'email': return '이메일'
      default: return field
    }
  }

  const getExpiryDate = () => {
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    return sixMonthsFromNow.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleConsent = async () => {
    if (!mallInfo || !shopId || !mallId) return
    
    // 동의 결과 식별을 위한 고유 ID 생성
    const consentId = `${mallId}_${shopId}`

    setLoading(true)
    try {
      // Firebase에 동의 내역 저장
      const { getDatabase, ref, set } = await import('firebase/database')
      const db = getDatabase()
      
      const consentRef = ref(db, `userConsents/${uid}/${mallId}`)
      await set(consentRef, {
        consentType: consentType,
        timestamp: new Date().toISOString(),
        fields: mallInfo.requiredFields,
        shopId: shopId
      })

      // "이번만 허용"인 경우 JWT 발급
      if (consentType === "once") {
        const response = await fetch('/api/issue-jwt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shopId: shopId, 
            mallId: mallId 
          })
        })
        
        if (response.ok) {
          const { jwt } = await response.json()
          
          // 동의 결과를 부모 창(쇼핑몰)에 전달 (JWT 포함)
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'consent_result',
              agreed: true,
              consentType,
              shopId,
              mallId,
              jwt: jwt,
              timestamp: new Date().toISOString()
            }, '*')
          }
        } else {
          throw new Error('JWT 발급 실패')
        }
      } else {
        // "항상 허용"인 경우 JWT 없이 동의 결과만 전달
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'consent_result',
            agreed: true,
            consentType,
            shopId,
            mallId,
            timestamp: new Date().toISOString()
          }, '*')
        }
      }

      console.log(`동의 완료 - shopId: ${shopId}, mallId: ${mallId}, consentType: ${consentType}`)

    } catch (error) {
      console.error('동의 처리 오류:', error)
      setError('동의 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = () => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'consent_result',
        agreed: false,
        shopId,
        mallId,
        timestamp: new Date().toISOString()
      }, '*')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">오류</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col space-y-2">
              {/* 재시도 버튼 */}
              <Button 
                onClick={() => {
                  setError("")
                  setLoading(false)
                  checkLoginStatus()
                }} 
                className="w-full"
              >
                다시 시도
              </Button>
              
              {/* 팝업인 경우에만 창 닫기 버튼 표시 */}
              {window.parent !== window && (
                <Button onClick={() => window.close()} variant="outline" className="w-full">
                  창 닫기
                </Button>
              )}
              
              {/* 일반 페이지인 경우 홈으로 이동 */}
              {window.parent === window && (
                <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
                  홈으로 이동
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasProfileData || !mallInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>데이터를 불러오는 중...</p>
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
      title: "개인정보 제공 동의"
    }
  ]

  console.log('=== 디버깅 정보 ===')
  console.log('mallInfo:', mallInfo)
  console.log('mallInfo.requiredFields:', mallInfo?.requiredFields)
  console.log('userInfo:', userInfo)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* 단계 표시 */}
        <div className="flex justify-end mb-4">
          <ProgressSteps 
            steps={progressSteps} 
            currentStep={2}
          />
        </div>
        
        {/* 메인 콘텐츠 */}
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            
            <Card className="w-full">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">개인정보 제공 동의</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">{mallInfo.name}</span>에서 다음 개인정보를 요청하고 있습니다.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 제공될 정보 */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">제공될 개인정보</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {(mallInfo.requiredFields || []).map((field: string) => (
                    <div key={field} className="flex items-center space-x-3">
                      <div className="text-gray-500">
                        {getFieldIcon(field)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getFieldLabel(field)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getFieldValue(field)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 동의 방식 선택 */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">동의 방식</h3>
                <RadioGroup value={consentType} onValueChange={setConsentType}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="once" id="once" />
                      <Label htmlFor="once" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-medium">이번만 허용</div>
                          <div className="text-sm text-muted-foreground">
                            이번 주문에만 정보를 제공합니다.
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="always" id="always" />
                      <Label htmlFor="always" className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-medium">항상 허용</div>
                          <div className="text-sm text-muted-foreground">
                            {getExpiryDate()}까지 자동으로 정보를 제공합니다.
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* 안내 정보 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    항상 허용을 선택하시면 6개월 후 자동으로 만료되며, 
                    설정에서 언제든 연결을 해제할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleReject}
                  disabled={loading}
                >
                  거부
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleConsent}
                  disabled={loading}
                >
                  {loading ? '처리중...' : '동의하기'}
                </Button>
              </div>
            </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>페이지를 불러오는 중...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ConsentPageContent />
    </Suspense>
  )
}
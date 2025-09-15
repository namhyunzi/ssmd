"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Shield, X, User, Phone, MapPin, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import AdditionalInfoPopup from "@/components/popups/additional-info-popup"

interface ConsentPageProps {}

function ConsentPageContent() {
  const [consentType, setConsentType] = useState<string>("once")
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [mallInfo, setMallInfo] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  
  const searchParams = useSearchParams()
  const shopId = searchParams.get('shopId')
  const mallId = searchParams.get('mallId')

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
      
      // Auth 상태 확인을 위한 타임아웃 설정 (5초)
      const currentUser = await Promise.race([
        new Promise<any>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', !!user, user?.uid)
            unsubscribe()
            resolve(user)
          })
        }),
        new Promise<null>((_, reject) => {
          setTimeout(() => {
            reject(new Error('로그인 상태 확인 타임아웃'))
          }, 5000)
        })
      ])
      
      if (!currentUser) {
        // 로그인되지 않은 경우 → 부모 창에 로그인 요청 또는 로그인 페이지로 리디렉션
        console.log('로그인되지 않음 - 처리 방법 결정')
        
        // 외부 팝업인 경우 부모 창에 로그인 필요 메시지 전달
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'login_required',
            message: '로그인이 필요합니다.',
            returnUrl: `/consent?shopId=${encodeURIComponent(shopId || '')}&mallId=${encodeURIComponent(mallId || '')}`
          }, '*')
          
          // 팝업 환경에서는 에러 메시지 표시
          setError('로그인이 필요합니다. 부모 창에서 로그인 후 다시 시도해주세요.')
        } else {
          // 일반 페이지인 경우 로그인 페이지로 리디렉션
          const currentUrl = `/consent?shopId=${encodeURIComponent(shopId || '')}&mallId=${encodeURIComponent(mallId || '')}`
          localStorage.setItem('redirect_after_login', currentUrl)
          window.location.href = '/'
        }
        return
      }
      
      console.log('=== 로그인 상태 확인 완료 ===')
      console.log('로그인된 사용자 UID:', currentUser.uid)
      console.log('쿼리 파라미터 - shopId:', shopId, 'mallId:', mallId)
      
      setIsLoggedIn(true)
      // 로그인된 경우 동의 프로세스 진행
      await initializeUserConnection()
      
    } catch (error: any) {
      console.error('로그인 상태 확인 오류:', error)
      
      if (error?.message?.includes('타임아웃')) {
        setError('로그인 상태 확인이 시간 초과되었습니다. 페이지를 새로고침해주세요.')
      } else {
        setError('로그인 상태를 확인할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.')
      }
    }
  }

  const initializeUserConnection = async () => {
    try {
      setLoading(true)
      
      // 1. 쇼핑몰의 등록된 허용 필드 조회
      const { getMallAllowedFields } = await import('@/lib/data-storage')
      const allowedFields = await getMallAllowedFields(mallId!)
      
      if (!allowedFields || allowedFields.length === 0) {
        setError('쇼핑몰의 허용 필드가 설정되지 않았습니다.')
        return
      }
      
      // 2. 로그인된 사용자의 실제 Firebase UID 사용
      const { auth } = await import('@/lib/firebase')
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        setError('로그인된 사용자 정보를 찾을 수 없습니다.')
        return
      }
      
      const userId = currentUser.uid
      console.log('사용할 실제 사용자 UID:', userId)
      
      // 3. 사용자 데이터 로드
      await loadUserData(userId, allowedFields)
      
    } catch (error) {
      console.error('사용자 연결 초기화 오류:', error)
      setError('사용자 연결 초기화 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async (uid: string, requiredFields: string[]) => {
    try {
      // UID에서 사용자 ID 추출
      const userId = uid.split('_').slice(1).join('_')
      
      console.log('=== 사용자 데이터 로드 디버깅 ===')
      console.log('전체 UID:', uid)
      console.log('추출된 userId:', userId)
      console.log('조회할 경로: users/' + userId)
      
      // Firebase에서 사용자 데이터 로드
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get } = await import('firebase/database')
      
      // users/{uid}에서 사용자 기본 정보 조회
      const userRef = ref(realtimeDb, `users/${userId}`)
      const userSnapshot = await get(userRef)
      
      console.log('사용자 데이터 존재 여부:', userSnapshot.exists())
      
      if (!userSnapshot.exists()) {
        console.log('사용자 정보를 찾을 수 없습니다. userId:', userId)
        setError(`사용자 정보를 찾을 수 없습니다. (ID: ${userId})`)
        return
      }
      
      const userData = userSnapshot.val()
      
      // userProfileMetadata/{uid}에서 암호화된 개인정보 메타데이터 조회
      const metadataRef = ref(realtimeDb, `userProfileMetadata/${userId}`)
      const metadataSnapshot = await get(metadataRef)
      
      let personalData = {}
      if (metadataSnapshot.exists()) {
        const metadata = metadataSnapshot.val()
        
        // 로컬 저장소에서 암호화된 개인정보 복호화
        const { loadProfileFromLocal } = await import('@/lib/data-storage')
        const decryptedProfile = loadProfileFromLocal()
        
        if (decryptedProfile) {
          // 복호화된 개인정보 사용
          personalData = {
            name: decryptedProfile.name || userData.displayName?.split('/')[0] || '',
            phone: decryptedProfile.phone || '',
            address: decryptedProfile.address || '',
            detailAddress: decryptedProfile.detailAddress || '',
            zipCode: decryptedProfile.zipCode || '',
            email: decryptedProfile.email || userData.email || ''
          }
        } else {
          // 복호화 실패 시 기본 정보만 사용
          personalData = {
            name: userData.displayName?.split('/')[0] || '',
            phone: '',
            address: '',
            detailAddress: '',
            zipCode: '',
            email: userData.email || ''
          }
        }
      } else {
        // 메타데이터가 없으면 기본 정보만 사용
        personalData = {
          name: userData.displayName?.split('/')[0] || '',
          phone: '',
          address: '',
          detailAddress: '',
          zipCode: '',
          email: userData.email || ''
        }
      }
      
      // 기본 정보와 개인정보 병합
      const mergedUserData = {
        ...userData,
        ...personalData
      }
      
      // 1. 프로필 완료 여부 확인
      if (!userData.profileCompleted) {
        // 개인정보 입력 아예 안한 사람 → 개인정보 설정페이지로 리디렉션
        console.log('프로필 미완성 - 개인정보 설정페이지로 리디렉션')
        const currentUrl = `/consent?shopId=${encodeURIComponent(shopId || '')}&mallId=${encodeURIComponent(mallId || '')}`
        localStorage.setItem('redirect_after_profile', currentUrl)
        window.location.href = '/profile-setup'
        return
      }
      
      // 2. 누락된 필드 확인
      const missingFields = requiredFields.filter(field => {
        const value = mergedUserData[field as keyof typeof mergedUserData]
        return !value || value.trim() === ""
      })
      
      if (missingFields.length > 0) {
        // 요청 정보보다 적게 입력한 사람 → 추가정보 입력
        setShowAdditionalInfo(true)
        const mallIdFromUid = uid.split('_')[0]
        
        // Firebase에서 실제 쇼핑몰 정보 조회
        const mallRef = ref(realtimeDb, `malls/${mallIdFromUid}`)
        const mallSnapshot = await get(mallRef)
        
        if (mallSnapshot.exists()) {
          const mallData = mallSnapshot.val()
          setMallInfo({
            mallId: mallIdFromUid,
            mallName: mallData.mallName || mallIdFromUid,
            requiredFields
          })
        } else {
          setMallInfo({
            mallId: mallIdFromUid,
            mallName: mallIdFromUid, // 기본값으로 mallId 사용
            requiredFields
          })
        }
      } else {
        // 모든 정보가 충분한 경우 → 동의 절차 진행
        setUserInfo(mergedUserData)
        const mallIdFromUid = uid.split('_')[0]
        
        // Firebase에서 실제 쇼핑몰 정보 조회
        const mallRef = ref(realtimeDb, `malls/${mallIdFromUid}`)
        const mallSnapshot = await get(mallRef)
        
        if (mallSnapshot.exists()) {
          const mallData = mallSnapshot.val()
          setMallInfo({
            mallId: mallIdFromUid,
            mallName: mallData.mallName || mallIdFromUid,
            requiredFields
          })
        } else {
          setMallInfo({
            mallId: mallIdFromUid,
            mallName: mallIdFromUid, // 기본값으로 mallId 사용
            requiredFields
          })
        }
      }
    } catch (error) {
      console.error('사용자 데이터 로드 오류:', error)
      setError('사용자 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const getExpiryDate = () => {
    const today = new Date()
    const expiryDate = new Date(today.setMonth(today.getMonth() + 6))
    return expiryDate.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
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

  const getFieldValue = (field: string) => {
    switch (field) {
      case 'name': return userInfo?.name
      case 'phone': return userInfo?.phone
      case 'address': return userInfo?.address
      case 'detailAddress': return userInfo?.detailAddress
      case 'zipCode': return userInfo?.zipCode
      case 'email': return userInfo?.email
      default: return ''
    }
  }

  const handleConsent = async () => {
    if (!mallInfo || !shopId || !mallId) return
    
    const generatedUid = `${mallId}_${shopId}`

    setLoading(true)
    try {
      // 동의 결과를 부모 창(쇼핑몰)에 전달
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

      // 동의 내역 저장 (6개월 허용인 경우)
      if (consentType === "always") {
        // TODO: 서버에 동의 내역 저장 API 호출
        console.log(`6개월 동의 저장: ${generatedUid}, 만료일: ${getExpiryDate()}`)
      }

      console.log(`동의 완료 - shopId: ${shopId}, mallId: ${mallId}`)

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

  const handleAdditionalInfoComplete = async (additionalData: { [key: string]: string }) => {
    try {
      // 추가정보 입력 완료 후 사용자 정보 업데이트
      setShowAdditionalInfo(false)
      
      // 기존 사용자 데이터와 추가 입력된 데이터 병합
      const updatedUserData = {
        ...userInfo,
        ...additionalData
      }
      
      setUserInfo(updatedUserData)
      
      // 쇼핑몰 정보도 설정 (동의 화면 표시를 위해)
      // Firebase에서 실제 쇼핑몰 정보 조회
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get } = await import('firebase/database')
      const mallRef = ref(realtimeDb, `malls/${mallId}`)
      const mallSnapshot = await get(mallRef)
      
      if (mallSnapshot.exists()) {
        const mallData = mallSnapshot.val()
        setMallInfo({
          mallId,
          mallName: mallData.mallName || mallId,
          requiredFields: mallInfo?.requiredFields || []
        })
      } else {
        setMallInfo({
          mallId,
          mallName: mallId, // 기본값으로 mallId 사용
          requiredFields: mallInfo?.requiredFields || []
        })
      }
      
    } catch (error) {
      console.error('추가정보 완료 처리 오류:', error)
      setError('추가정보 처리 중 오류가 발생했습니다.')
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

  if (!userInfo || !mallInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="mb-4">
              {isLoggedIn === null ? '로그인 상태 확인 중...' : 
               isLoggedIn === false ? '로그인 확인 완료, 정보 처리 중...' :
               '사용자 정보를 불러오는 중...'}
            </p>
            {/* 30초 이상 로딩 시 문제 해결 안내 */}
            <div className="text-xs text-gray-500">
              페이지 로딩이 오래 걸리면 새로고침을 시도해보세요.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">개인정보 제공 동의</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">{mallInfo.mallName}</span>에서 
            다음 개인정보 제공을 요청했습니다.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 제공될 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">제공될 개인정보</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {mallInfo.requiredFields.map((field: string) => (
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
                      <div className="font-medium">6개월간 허용</div>
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
                6개월 허용을 선택하시면 설정에서 언제든 연결을 해제할 수 있습니다. 
                제공된 정보는 배송 목적으로만 사용되며, 주문 완료 후 안전하게 삭제됩니다.
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

      {/* 추가정보 입력 팝업 */}
      {mallInfo && (
        <AdditionalInfoPopup
          isOpen={showAdditionalInfo}
          onClose={() => setShowAdditionalInfo(false)}
          serviceName={mallInfo.mallName}
          onComplete={handleAdditionalInfoComplete}
          missingFields={mallInfo.requiredFields}
        />
      )}
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

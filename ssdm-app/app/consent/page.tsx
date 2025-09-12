"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Shield, X, User, Phone, MapPin, Info, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface ConsentPageProps {}

function ConsentContent() {
  const router = useRouter()
  const [consentType, setConsentType] = useState<string>("once")
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [mallInfo, setMallInfo] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')
  const fields = searchParams.get('fields')

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
        const currentUrl = `/consent?uid=${encodeURIComponent(uid || '')}&fields=${encodeURIComponent(fields || '')}`
        localStorage.setItem('redirect_after_login', currentUrl)
        window.location.href = '/'
        return
      }
      
      // 로그인된 경우 → 사용자 데이터 확인
      setIsLoggedIn(true)
      await loadUserData()
      
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error)
      setError('로그인 상태를 확인할 수 없습니다.')
    }
  }

  const loadUserData = async () => {
    if (!uid || !fields) {
      setError('필수 파라미터가 누락되었습니다.')
      return
    }

    try {
      const requiredFields = fields.split(',')
      
      // UID에서 사용자 ID 추출
      const userId = uid.split('-').slice(1).join('-')
      
      // Firebase에서 사용자 데이터 로드
      const { getDatabase, ref, get } = await import('firebase/database')
      const db = getDatabase()
      
      // 사용자 메타데이터 조회
      const userRef = ref(db, `users/${userId}/metadata`)
      const snapshot = await get(userRef)
      
      if (!snapshot.exists()) {
        setError('사용자 정보를 찾을 수 없습니다.')
        return
      }
      
      const userData = snapshot.val()
      
      // 누락된 필드 확인
      const missingFields = requiredFields.filter(field => {
        const value = userData[field]
        return !value || value.trim() === ""
      })
      
      if (missingFields.length > 0) {
        // 추가정보 입력 필요 - /additional-info 페이지로 리디렉션
        const additionalInfoUrl = `/additional-info?uid=${encodeURIComponent(uid)}&fields=${encodeURIComponent(fields)}&missing=${encodeURIComponent(missingFields.join(','))}`
        window.location.href = additionalInfoUrl
        return
      } else {
        // 바로 동의 절차 진행
        setUserInfo(userData)
        const mallId = uid.split('-')[0]
        setMallInfo({
          mallId,
          mallName: mallId === 'bookstore' ? '북스토어' : mallId,
          requiredFields
        })
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
      default: return <Info className="h-4 w-4" />
    }
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name': return '이름'
      case 'phone': return '휴대폰번호'
      case 'address': return '주소'
      case 'email': return '이메일'
      default: return field
    }
  }

  const getFieldValue = (field: string) => {
    switch (field) {
      case 'name': return userInfo?.name
      case 'phone': return userInfo?.phone
      case 'address': return userInfo?.address
      case 'email': return userInfo?.email
      default: return ''
    }
  }

  const handleConsent = async () => {
    if (!uid || !mallInfo) return

    setLoading(true)
    try {
      // 동의 결과를 부모 창에 전달
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'consent_result',
          agreed: true,
          consentType,
          uid,
          timestamp: new Date().toISOString()
        }, '*')
      }

      // 동의 내역 저장 (항상 허용인 경우)
      if (consentType === "always") {
        const { getDatabase, ref, push, set } = await import('firebase/database')
        const db = getDatabase()
        
        const consentRef = ref(db, `consent_history/${uid}`)
        const newConsentRef = push(consentRef)
        
        await set(newConsentRef, {
          mallId: mallInfo.mallId,
          fields: mallInfo.requiredFields,
          consentType,
          timestamp: new Date().toISOString(),
          userData: userInfo
        })
      }

      // JWT 발급
      const jwtResponse = await fetch('/api/issue-jwt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Internal-Call': 'generate-jwt'
        },
        body: JSON.stringify({
          uid,
          mallId: mallInfo.mallId,
          fields: mallInfo.requiredFields,
          userData: userInfo
        })
      })

      if (jwtResponse.ok) {
        const { jwt } = await jwtResponse.json()
        
        // JWT를 부모 창에 전송
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'jwt_issued',
            jwt,
            uid,
            mallId: mallInfo.mallId
          }, '*')
        }
      }

      // 팝업 닫기
      window.close()

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
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.close()} variant="outline">
              창 닫기
            </Button>
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
            <p>정보를 불러오는 중...</p>
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
                항상 허용을 선택하시면 설정에서 언제든 연결을 해제할 수 있습니다.
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
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>정보를 불러오는 중...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConsentPage({}: ConsentPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConsentContent />
    </Suspense>
  )
}

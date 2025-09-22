"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { auth } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  CheckCircle, 
  Shield, 
  Clock,
  ExternalLink,
  ArrowLeft
} from "lucide-react"

interface MallInfo {
  mallId: string
  mallName: string
  requiredFields: string[]
}

interface PreviewData {
  mallInfo: MallInfo
  consentType: string
  providedFields: string[]
  timestamp: string
}

function InfoPreviewPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [personalData, setPersonalData] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [shopId, setShopId] = useState<string | null>(null)
  const [mallId, setMallId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  // JWT 검증 함수 추가
  const verifyToken = async (jwtToken: string) => {
    try {
      const response = await fetch('/api/popup/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: jwtToken })
      })
      
      if (response.ok) {
        const { valid, payload } = await response.json()
        
        if (valid && payload) {
          setShopId(payload.shopId)
          setMallId(payload.mallId)
          
          // JWT 검증만 하고 초기화는 useEffect에서 처리
          return { success: true, mallId: payload.mallId }
        } else {
          console.error('JWT 토큰 검증 실패: 유효하지 않은 토큰')
          setError('JWT 토큰이 유효하지 않습니다.')
          return { success: false }
        }
      } else {
        console.error('JWT 토큰 검증 실패')
        setError('JWT 토큰 검증에 실패했습니다.')
        return { success: false }
      }
    } catch (error) {
      console.error('JWT 토큰 검증 중 오류:', error)
      setError('JWT 토큰 검증 중 오류가 발생했습니다.')
      return { success: false }
    }
  }

  // 초기화 함수 추가
  const initializeUserConnection = async (mallIdParam?: string, user?: any, jwt?: string) => {
    setLoading(true)
    
    try {
      console.log('=== 초기화 함수 시작 ===')
      
      // 로그인 상태에 따라 JWT 가져오기
      let jwtToken = null
      
      if (user) {
        // 로그인됨 → postMessage에서 받은 JWT 직접 사용
        jwtToken = jwt
        console.log('로그인된 상태: postMessage에서 받은 JWT 사용')
      } else {
        // 로그인 안됨 → 세션에서 가져오기
        jwtToken = sessionStorage.getItem('openPopup_preview')
        console.log('로그인 안된 상태: 세션에서 JWT 가져옴')
      }
      
      if (!jwtToken) {
        console.log('JWT 토큰이 없어서 사용자 연결 초기화를 건너뜀')
        setError('JWT 토큰이 필요합니다. 다시 시도해주세요.')
        return
      }
      
      // 파라미터로 전달된 값 우선 사용, 없으면 상태값 사용
      const currentMallId = mallIdParam || mallId;
      console.log("초기화로직시 currentMallId 확인", currentMallId);
      
      // 1. 쇼핑몰의 등록된 허용 필드 조회
      const { getMallAllowedFields } = await import('@/lib/data-storage')
      const allowedFields = await getMallAllowedFields(currentMallId!)
      console.log('허용 필드:', allowedFields)
      
      if (!allowedFields || allowedFields.length === 0) {
        console.log('허용 필드가 없음')
        setError('쇼핑몰의 허용 필드가 설정되지 않았습니다.')
        return
      }
      
      // 2. 로그인된 사용자의 실제 Firebase UID 사용
      const { auth } = await import('@/lib/firebase')
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.log('사용자가 로그인되지 않음')
        setError('로그인이 필요합니다.')
        return
      }
      
      // 3. 사용자 개인정보 조회
      const { getUserProfile } = await import('@/lib/data-storage')
      const profileData = await getUserProfile(currentUser)
      
      if (!profileData) {
        console.log('사용자 프로필이 없음')
        setError('사용자 프로필을 찾을 수 없습니다.')
        return
      }
      
      // 4. 기존 loadPreviewData 호출
      await loadPreviewData(jwtToken)
      
    } catch (error) {
      console.error('초기화 중 오류:', error)
      setError('초기화 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  useEffect(() => {
    const { onAuthStateChanged } = require('firebase/auth')
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        // 로그인 완료 후 돌아온 경우 세션에서 JWT 확인
        const jwtToken = sessionStorage.getItem('openPopup_preview')
        if (jwtToken && !isInitializing) {
          setIsInitializing(true)
          setToken(jwtToken)
          try {
            const verifyResult = await verifyToken(jwtToken)
            if (verifyResult.success) {
              initializeUserConnection(verifyResult.mallId, user, jwtToken)
            }
          } catch (error) {
            console.error('JWT 처리 실패:', error)
            setError("JWT 토큰 처리 중 오류가 발생했습니다.")
          } finally {
            setIsInitializing(false)
          }
          return
        }
        
        // postMessage 리스너 설정 (새로운 JWT 받을 때)
        const handleMessage = async (event: MessageEvent) => {
          if (event.data.type === 'init_preview') {
            const { jwt } = event.data
            if (jwt && !isInitializing) {
              setIsInitializing(true)
              setToken(jwt)
              try {
                const verifyResult = await verifyToken(jwt)
                if (verifyResult.success) {
                  initializeUserConnection(verifyResult.mallId, user, jwt)
                }
              } catch (error) {
                console.error('JWT 처리 실패:', error)
                setError("JWT 토큰 처리 중 오류가 발생했습니다.")
              } finally {
                setIsInitializing(false)
              }
            }
          }
        }
        
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
      } else {
        // 로그인 안 됨 → postMessage에서 JWT 받아서 세션에 저장 후 로그인 페이지로 리다이렉트
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'init_preview') {
            const { jwt } = event.data
            if (jwt) {
              sessionStorage.setItem('openPopup_preview', jwt)
              router.push('/')
            }
          }
        }
        
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
      }
    })
    
    return () => unsubscribe()
  }, [])

  const loadPreviewData = async (jwtToken: string) => {
    try {
      // JWT 검증 및 shopId, mallId 추출
      const response = await fetch('/api/popup/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: jwtToken })
      })
      
      if (!response.ok) {
        throw new Error('JWT 검증 실패')
      }
      
      const { payload } = await response.json()
      const { shopId: jwtShopId, mallId: jwtMallId } = payload
      
      // 쇼핑몰 정보 조회
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get } = await import('firebase/database')
      
      const mallRef = ref(realtimeDb, `malls/${jwtMallId}`)
      const mallSnapshot = await get(mallRef)
      
      let mallName = jwtMallId
      if (mallSnapshot.exists()) {
        const mallData = mallSnapshot.val()
        mallName = mallData.mallName || jwtMallId
      }

      // 사용자 개인정보 로드
      const { auth } = await import('@/lib/firebase')
      if (!auth.currentUser) {
        throw new Error('로그인이 필요합니다')
      }
      
      const { getUserProfile } = await import('@/lib/data-storage')
      const userProfile = await getUserProfile(auth.currentUser)
      
      if (!userProfile) {
        throw new Error('개인정보가 없습니다')
      }
      
      setPersonalData(userProfile)
      
      // 제공될 필드들 확인
      const availableFields = ['name', 'phone', 'address', 'email', 'zipCode']
      const providedFields = availableFields.filter(field => {
        const value = getFieldValue(field, userProfile)
        return value && value.trim() !== '' && value !== '정보 확인 중...'
      })

      const mallInfo: MallInfo = {
        mallId: jwtMallId,
        mallName,
        requiredFields: providedFields
      }

      const previewData: PreviewData = {
        mallInfo,
        consentType: "always", // 기본값
        providedFields,
        timestamp: new Date().toISOString()
      }

      setPreviewData(previewData)
    } catch (error) {
      console.error('미리보기 데이터 로드 오류:', error)
      setError("미리보기 정보를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'address': return <MapPin className="h-4 w-4" />
      case 'detailAddress': return <MapPin className="h-4 w-4" />
      case 'zipCode': return <MapPin className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
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

  // 휴대폰 번호 포맷팅 함수
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
    }
    return phone
  }

  const getFieldValue = (field: string, userProfile: any) => {
    if (!userProfile) return '정보 확인 중...'
    
    switch (field) {
      case 'name': return userProfile.name || ''
      case 'phone': return formatPhoneNumber(userProfile.phone || '')
      case 'address': 
        const address = userProfile.address || ''
        const detailAddress = userProfile.detailAddress || ''
        return detailAddress ? `${address} ${detailAddress}` : address
      case 'zipCode': return userProfile.zipCode || ''
      case 'email': return userProfile.email || ''
      default: return ''
    }
  }

  const getConsentTypeLabel = (type: string) => {
    switch (type) {
      case 'once': return '이번만 허용'
      case 'always': return '항상 허용 (6개월)'
      default: return type
    }
  }

  const getConsentTypeBadge = (type: string) => {
    switch (type) {
      case 'once': return <Badge variant="secondary">이번만</Badge>
      case 'always': return <Badge variant="default">6개월</Badge>
      default: return <Badge variant="outline">{type}</Badge>
    }
  }

  const handleConfirm = () => {
    // 확인 버튼 클릭 시 팝업 닫기
    window.close()
  }

  const handleBack = () => {
    window.history.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">정보를 불러오는 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !previewData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold mb-2">오류가 발생했습니다</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
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
            <CardTitle className="text-xl">제공될 개인정보 미리보기</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">{previewData.mallInfo.mallName}</span>에 
            제공될 개인정보를 확인하세요.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 제공될 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">제공될 개인정보</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {previewData.providedFields.map((field: string) => (
                <div key={field} className="flex items-center space-x-3">
                  <div className="text-gray-500">
                    {getFieldIcon(field)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {getFieldLabel(field)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getFieldValue(field, personalData)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">개인정보 제공 안내</p>
                <p>
                  {previewData.consentType === 'always' 
                    ? '6개월 동안 자동으로 위 정보가 제공됩니다. 언제든지 동의를 해제할 수 있습니다.'
                    : '이번 주문에만 위 정보가 제공됩니다.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <Button 
            onClick={handleConfirm}
            className="w-full"
          >
            확인
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InfoPreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">페이지를 불러오는 중...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <InfoPreviewPageContent />
    </Suspense>
  )
}

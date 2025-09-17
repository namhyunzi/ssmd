"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  
  const searchParams = useSearchParams()
  const mallId = searchParams.get('mallId')
  const shopId = searchParams.get('shopId')

  useEffect(() => {
    if (!mallId || !shopId) {
      setError("필수 파라미터가 누락되었습니다.")
      setLoading(false)
      return
    }

    loadPreviewData()
  }, [mallId, shopId])

  const loadPreviewData = async () => {
    try {
      // 쇼핑몰 정보 조회 (실제로는 Firebase에서 가져옴)
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get } = await import('firebase/database')
      
      const mallRef = ref(realtimeDb, `malls/${mallId}`)
      const mallSnapshot = await get(mallRef)
      
      let mallName = mallId!
      if (mallSnapshot.exists()) {
        const mallData = mallSnapshot.val()
        mallName = mallData.mallName || mallId!
      }

      // 3. 실제 사용자 데이터에서 요청된 필드들 확인
      // userProfile은 이미 Firebase에서 로드됨
      
      // 사용자가 실제로 가지고 있는 필드들만 표시 (상세주소는 주소와 함께 표시)
      const availableFields = ['name', 'phone', 'address', 'email', 'zipCode']
      const providedFields = availableFields.filter(field => {
        const value = getFieldValue(field)
        return value && value.trim() !== '' && value !== '정보 확인 중...'
      })

      const mallInfo: MallInfo = {
        mallId: mallId!,
        mallName,
        requiredFields: providedFields
      }

      // 동의 타입은 URL 파라미터나 기본값으로 설정
      // 실제로는 쇼핑몰에서 이미 동의 상태를 확인했으므로 여기서는 미리보기만
      const consentType = "always" // 기본값, 실제로는 쇼핑몰에서 전달받을 수 있음

      const previewData: PreviewData = {
        mallInfo,
        consentType,
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

  const getFieldValue = async (field: string) => {
    // Firebase에서 개인정보 조회하여 반환
    try {
      const { getUserProfile } = require('@/lib/data-storage')
      const { auth } = require('@/lib/firebase')
      
      if (!auth.currentUser) {
        return '로그인이 필요합니다.'
      }
      
      const userProfile = await getUserProfile(auth.currentUser)
      
      if (!userProfile) {
        return '개인정보가 없습니다.'
      }
      
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
    } catch (error) {
      console.error('개인정보 조회 실패:', error)
      return '정보 확인 중...'
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
                      {getFieldValue(field)}
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

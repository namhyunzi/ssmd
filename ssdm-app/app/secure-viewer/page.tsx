"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ref, get } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'
import { Card, CardContent } from "@/components/ui/card"
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Shield
} from "lucide-react"

interface PersonalInfo {
  name?: string
  phone?: string
  address?: string
  email?: string
  zipCode?: string
}

function SecureViewerContent() {
  const searchParams = useSearchParams()
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [securityEnabled, setSecurityEnabled] = useState(false) // 보안 기능 상태

  // 보안 기능 초기화 (securityEnabled 상태에 따라)
  useEffect(() => {
    // 보안 기능이 비활성화되어 있으면 아무것도 안함
    if (!securityEnabled) {
      return
    }

    // 보안 기능이 활성화되어 있을 때만 적용
    // 우클릭 방지
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // 텍스트 선택 방지
    const handleSelectStart = (e: Event) => {
      e.preventDefault()
      return false
    }

    // 드래그 방지
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // 키보드 단축키 방지 (프린트는 허용)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+C 등 방지 (Ctrl+P는 허용)
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u') ||
          (e.ctrlKey && e.key === 's') ||
          (e.ctrlKey && e.key === 'a') ||
          (e.ctrlKey && e.key === 'c')) {
        e.preventDefault()
        return false
      }
      // Ctrl+P (프린트)는 허용
    }

    // 마우스 우클릭 방지
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // 우클릭
        e.preventDefault()
        return false
      }
    }

    // 개발자 도구 감지
    const detectDevTools = () => {
      const threshold = 160
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        // 개발자 도구가 열린 것으로 감지
        console.warn('개발자 도구가 감지되었습니다.')
      }
    }

    // 이벤트 리스너 등록
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    
    // 주기적으로 개발자 도구 감지
    const devToolsInterval = setInterval(detectDevTools, 1000)

    // iframe 환경에서의 추가 보안
    if (window.top !== window.self) {
      // iframe 내부임을 감지하고 추가 보안 조치
      window.addEventListener('beforeunload', () => {
        // 페이지 이탈 시 보안 조치
      })
    }

    // 정리 함수
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
      clearInterval(devToolsInterval)
    }
  }, [securityEnabled]) // securityEnabled 상태를 의존성으로 변경

  useEffect(() => {
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      setError('세션 ID가 필요합니다.')
      setLoading(false)
      return
    }

    loadPersonalInfo(sessionId)
  }, [searchParams])

  const loadPersonalInfo = async (sessionId: string) => {
    try {
      // 1. 세션 데이터 조회
      const sessionRef = ref(realtimeDb, `viewer-sessions/${sessionId}`)
      const sessionSnapshot = await get(sessionRef)
      
      if (!sessionSnapshot.exists()) {
        setError('유효하지 않은 세션입니다.')
        return
      }
      
      const sessionData = sessionSnapshot.val()
      
      // 2. 만료 확인
      const now = new Date()
      const expiresAt = new Date(sessionData.expiresAt)
      
      // 디버깅용 로그
      console.log('=== 세션 만료 확인 ===')
      console.log('현재 시간 (now):', now.toISOString())
      console.log('만료 시간 (expiresAt):', expiresAt.toISOString())
      console.log('원본 expiresAt 값:', sessionData.expiresAt)
      console.log('만료 여부 (now > expiresAt):', now > expiresAt)
      console.log('시간 차이 (밀리초):', now.getTime() - expiresAt.getTime())
      console.log('========================')
      
      if (now > expiresAt) {
        console.log('세션이 만료되어 에러 설정')
        setError('세션이 만료되었습니다.')
        setLoading(false)
        setSecurityEnabled(false) // 보안 기능 비활성화
        return
      }
      
      // 유효한 세션일 때 보안 기능 활성화
      setSecurityEnabled(true)
      
      // 3. userMappings에서 Firebase UID 조회
      const mappingRef = ref(realtimeDb, `userMappings/${sessionData.mallId}`)
      const mappingSnapshot = await get(mappingRef)
      
      if (!mappingSnapshot.exists()) {
        setError('사용자 매핑 정보를 찾을 수 없습니다.')
        setLoading(false)
        setSecurityEnabled(false) // 보안 기능 비활성화
        return
      }
      
      const mappings = mappingSnapshot.val() as Record<string, Record<string, any>>
      let firebaseUid = null
      
      // shopId(쇼핑몰 사용자 ID)로 Firebase UID 찾기
      for (const [uid, userMappings] of Object.entries(mappings)) {
        if (userMappings[sessionData.shopId]) {
          firebaseUid = uid
          break
        }
      }
      
      if (!firebaseUid) {
        setError('사용자 매핑을 찾을 수 없습니다.')
        setLoading(false)
        setSecurityEnabled(false) // 보안 기능 비활성화
        return
      }
      
      // 4. Firebase UID로 users 테이블 조회
      const userRef = ref(realtimeDb, `users/${firebaseUid}`)
      const userSnapshot = await get(userRef)
      
      if (!userSnapshot.exists()) {
        setError('사용자 정보를 찾을 수 없습니다.')
        setLoading(false)
        setSecurityEnabled(false) // 보안 기능 비활성화
        return
      }
      
      const userData = userSnapshot.val()
      
      // 5. 요청된 필드만 필터링 (4개 필드만)
      const personalInfo: PersonalInfo = {}
      sessionData.requiredFields.forEach((field: string) => {
        if (userData.profile && userData.profile[field]) {
          personalInfo[field as keyof PersonalInfo] = userData.profile[field]
          
          // 주소가 요청되면 우편번호도 자동으로 포함
          if (field === 'address' && userData.profile.zipCode) {
            personalInfo.zipCode = userData.profile.zipCode
          }
        }
      })
      
      setPersonalInfo(personalInfo)
      
    } catch (error) {
      setError('개인정보 조회 중 오류가 발생했습니다.')
      setSecurityEnabled(false) // 보안 기능 비활성화
    } finally {
      setLoading(false)
    }
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User className="h-5 w-5" />
      case 'phone': return <Phone className="h-5 w-5" />
      case 'address': return <MapPin className="h-5 w-5" />
      case 'zipCode': return <MapPin className="h-5 w-5" />
      case 'email': return <Mail className="h-5 w-5" />
      default: return <Shield className="h-5 w-5" />
    }
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name': return '이름'
      case 'phone': return '휴대폰번호'
      case 'address': return '주소'
      case 'zipCode': return '우편번호'
      case 'email': return '이메일'
      default: return field
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    
    // 숫자만 추출
    const numbers = phone.replace(/\D/g, '')
    
    // 010으로 시작하는 11자리 번호인 경우
    if (numbers.length === 11 && numbers.startsWith('010')) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    
    // 010으로 시작하는 10자리 번호인 경우 (010-123-4567)
    if (numbers.length === 10 && numbers.startsWith('010')) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
    }
    
    // 다른 형식의 번호는 그대로 반환
    return phone
  }

  const getFieldValue = (field: string) => {
    if (!personalInfo) return ''
    
    switch (field) {
      case 'name': return personalInfo.name || ''
      case 'phone': return formatPhoneNumber(personalInfo.phone || '')
      case 'address': return personalInfo.address || ''
      case 'zipCode': return personalInfo.zipCode || ''
      case 'email': return personalInfo.email || ''
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none'
      } as React.CSSProperties}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none'
      } as React.CSSProperties}>
        <div className="text-center" style={{
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none'
        } as React.CSSProperties}>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {error === '세션이 만료되었습니다.' ? '세션이 만료되었습니다' : '오류가 발생했습니다'}
          </h2>
          <p className="text-gray-600">
            {error === '세션이 만료되었습니다.' 
              ? '개인정보 조회 권한이 만료되었습니다.\n다시 요청해주세요.'
              : error
            }
          </p>
        </div>
      </div>
    )
  }

  if (!personalInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none'
      } as React.CSSProperties}>
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold mb-2">개인정보를 찾을 수 없습니다</h2>
            <p className="text-muted-foreground">요청한 개인정보가 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 표시할 필드들 (4개 필드만)
  const displayFields = Object.keys(personalInfo).filter(field => {
    const value = getFieldValue(field)
    return value && value.trim() !== ''
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4" style={{
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none'
    } as React.CSSProperties}>
      <div className="w-full max-w-lg mx-auto">
        {/* 개인정보 표시 */}
        <div className="bg-gray-50 px-4 pt-4 pb-0" style={{
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none'
        } as React.CSSProperties}>
          {displayFields.map((field: string, index: number) => (
            <div key={field} className={`flex items-center space-x-3 ${index < displayFields.length - 1 ? 'mb-5' : ''}`} style={{
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              userSelect: 'none'
            } as React.CSSProperties}>
              <div className="text-gray-500">
                {getFieldIcon(field)}
              </div>
              <div className="flex-1">
                <div className="text-base font-medium text-gray-900" style={{
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  userSelect: 'none'
                } as React.CSSProperties}>
                  {getFieldLabel(field)}
                </div>
                <div className="text-sm text-gray-600" style={{
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  userSelect: 'none'
                } as React.CSSProperties}>
                  {getFieldValue(field)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SSDM 로고 */}
        <div className="flex justify-end">
          <div className="text-center" style={{
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            userSelect: 'none'
          } as React.CSSProperties}>
            <h1 className="text-xl font-bold text-primary">SSDM</h1>
            <p className="text-sm text-muted-foreground">개인정보보호</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SecureViewerPage() {
  return (
    <>
      {/* 보안 메타 태그 */}
      <head>
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';" />
        <meta name="referrer" content="no-referrer" />
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              -webkit-user-select: none !important;
              -moz-user-select: none !important;
              -ms-user-select: none !important;
              user-select: none !important;
              -webkit-user-drag: none !important;
              -khtml-user-drag: none !important;
              -moz-user-drag: none !important;
              -o-user-drag: none !important;
              user-drag: none !important;
              -webkit-touch-callout: none !important;
            }
          `
        } as any} />
      </head>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          WebkitUserDrag: 'none',
          KhtmlUserDrag: 'none',
          MozUserDrag: 'none',
          OUserDrag: 'none',
          userDrag: 'none',
          WebkitTouchCallout: 'none'
        } as React.CSSProperties}>
          <Card className="w-full max-w-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">페이지를 로드하는 중...</p>
            </CardContent>
          </Card>
        </div>
      }>
        <SecureViewerContent />
      </Suspense>
    </>
  )
}

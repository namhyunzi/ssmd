"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import ConsentPopup from "@/components/popups/consent-popup"

export default function ConsentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPopup, setShowPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mallId, setMallId] = useState<string>("")
  const [shopUserId, setShopUserId] = useState<string>("")
  const [returnUrl, setReturnUrl] = useState<string>("")
  const [serviceName, setServiceName] = useState<string>("쇼핑몰")
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    // URL 파라미터 읽기
    const mallIdParam = searchParams.get('mallId')
    const shopUserIdParam = searchParams.get('shopUserId') 
    const returnUrlParam = searchParams.get('returnUrl')

    if (!mallIdParam || !shopUserIdParam || !returnUrlParam) {
      alert('잘못된 접근입니다.')
      router.push('/')
      return
    }

    setMallId(mallIdParam)
    setShopUserId(shopUserIdParam)
    setReturnUrl(decodeURIComponent(returnUrlParam))

    // 기존 동의 확인 (6개월 동의가 있으면 자동 JWT 발급)
    checkExistingConsent(mallIdParam, shopUserIdParam, decodeURIComponent(returnUrlParam))
  }, [searchParams, router])

  const checkExistingConsent = async (mallId: string, shopUserId: string, returnUrl: string) => {
    try {
      // 현재 로그인된 사용자 확인
      const { getAuth, onAuthStateChanged } = await import('firebase/auth')
      const auth = getAuth()
      
      // Auth 상태 변화를 기다림 (새로고침 시 상태 복원 대기)
      const currentUser = await new Promise<any>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          resolve(user)
        })
      })
      
      if (!currentUser) {
        // 로그인되지 않은 경우 → 로그인 페이지로 리디렉션 (돌아올 URL 저장)
        console.log('로그인되지 않음 - 로그인 페이지로 리디렉션')
        const currentUrl = `/external-request/consent?mallId=${mallId}&shopUserId=${shopUserId}&returnUrl=${encodeURIComponent(returnUrl)}`
        localStorage.setItem('redirect_after_login', currentUrl)
        window.location.href = '/'
        return
      }

      // Firebase에서 기존 동의 확인
      const { ref, get } = await import('firebase/database')
      const { realtimeDb } = await import('@/lib/firebase')
      
      const consentRef = ref(realtimeDb, `consents/${currentUser.uid}/${mallId}`)
      const snapshot = await get(consentRef)
      
      if (snapshot.exists()) {
        const consentData = snapshot.val()
        
        // shopUserId 검증 - 올바른 쇼핑몰 사용자인지 확인
        if (consentData.shopUserId !== shopUserId) {
          console.log('다른 쇼핑몰 사용자입니다. 신규 동의 진행')
          proceedToConsent(mallId)
          return
        }
        
        // 활성 상태이고 6개월 동의인지 확인
        if (consentData.isActive && consentData.consentType === 'always') {
          // 만료일 확인
          const expiresAt = new Date(consentData.expiresAt)
          const now = new Date()
          
          if (expiresAt > now) {
            // 아직 유효한 6개월 동의 → 기존 UID로 바로 JWT 발급
            console.log('기존 6개월 동의 확인됨, 기존 UID로 자동 JWT 발급:', consentData.uid)
            
            const jwt = await issueJWTForConsent(consentData.uid)
            const successUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=success&jwt=${jwt.jwt}&expiresIn=${jwt.expiresIn}&uid=${consentData.uid}`
            window.location.href = successUrl
            return
          } else {
            // 만료된 동의 → 재동의 필요 (기존 UID 재사용)
            console.log('6개월 동의 만료됨, 재동의 필요 - 기존 UID 재사용:', consentData.uid)
          }
        } else if (consentData.consentType === 'once') {
          // 이번만 동의였던 경우 → 재동의 필요 (기존 UID 재사용)
          console.log('이번만 동의였음, 재동의 필요 - 기존 UID 재사용:', consentData.uid)
        }
      }
      
      // 기존 동의가 없거나 만료된 경우 일반 동의 프로세스
      proceedToConsent(mallId)
      
    } catch (error) {
      console.error('기존 동의 확인 실패:', error)
      // 오류 시 일반 동의 프로세스
      proceedToConsent(mallId)
    }
  }

  const proceedToConsent = async (mallId: string) => {
    // 쇼핑몰 정보 조회해서 서비스명 설정
    await fetchMallInfo(mallId)
    
    // 사용자 정보 로드
    await loadUserInfo()
  }

  const fetchMallInfo = async (mallId: string) => {
    try {
      const response = await fetch(`/api/register-mall?mallId=${mallId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.mall) {
          setServiceName(data.mall.mallName)
        }
      }
    } catch (error) {
      console.error('쇼핑몰 정보 조회 실패:', error)
    } finally {
      setIsLoading(false)
      setShowPopup(true)
    }
  }

  const loadUserInfo = async () => {
    try {
      // 로컬 저장소에서 사용자 정보 로드
      const localData = localStorage.getItem('ssdm_user_data')
      if (localData) {
        const userData = JSON.parse(localData)
        // 실제로는 복호화 로직이 필요함
        setUserInfo({
          name: userData.name || "사용자",
          phone: userData.phone || "전화번호 확인 중...",
          address: userData.address || "주소 확인 중..."
        })
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error)
    }
  }

  const handleComplete = async (consentType: string, fields: string[]) => {
    setShowPopup(false)
    
    try {
      // 현재 로그인된 사용자 정보 가져오기 (Firebase Auth)
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        alert('로그인이 필요합니다.')
        return
      }

      // 사용자 매핑 및 동의 정보 저장
      const uid = await saveUserConsent(currentUser.uid, consentType, fields)
      
      // 동의 완료 시 바로 JWT 발급
      const jwt = await issueJWTForConsent(uid)
      
      // 성공 시 쇼핑몰로 JWT와 함께 리디렉션
      const successUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=success&jwt=${jwt.jwt}&expiresIn=${jwt.expiresIn}&uid=${uid}`
      window.location.href = successUrl
      
    } catch (error) {
      console.error('동의 처리 실패:', error)
      alert('동의 처리 중 오류가 발생했습니다.')
    }
  }

  const issueJWTForConsent = async (uid: string) => {
    try {
      const response = await fetch('/api/issue-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 내부 API 호출이므로 특별 헤더 사용
          'X-Internal-Call': 'consent-process'
        },
        body: JSON.stringify({ uid })
      })

      if (!response.ok) {
        throw new Error('JWT 발급 실패')
      }

      return await response.json()
    } catch (error) {
      console.error('JWT 발급 오류:', error)
      throw error
    }
  }

  const saveUserConsent = async (ssdmUserId: string, consentType: string, fields: string[]) => {
    const { ref, set, get } = await import('firebase/database')
    const { realtimeDb } = await import('@/lib/firebase')
    
    // 기존 동의 확인해서 UID 재사용 또는 신규 생성
    let uid: string
    const existingConsentRef = ref(realtimeDb, `consents/${ssdmUserId}/${mallId}`)
    const existingSnapshot = await get(existingConsentRef)
    
    if (existingSnapshot.exists()) {
      // 기존 UID 재사용
      uid = existingSnapshot.val().uid
      console.log('기존 UID 재사용:', uid)
    } else {
      // 신규 UID 생성
      uid = `${mallId}-${generateUUID()}`
      console.log('신규 UID 생성:', uid)
    }
    
    // 만료일 계산
    const now = new Date()
    let expiresAt = null
    if (consentType === 'always') {
      // 6개월 고정
      now.setMonth(now.getMonth() + 6)
      expiresAt = now.toISOString()
    }
    // 'once'인 경우 만료일 없음 (일회성)

    const consentData = {
      uid,
      mallId,
      userId: ssdmUserId,        // SSDM Firebase UID
      shopUserId,                // 쇼핑몰 사용자 ID
      consentType,               // 'once' | 'always'
      fields,                    // 동의한 필드 목록
      createdAt: new Date().toISOString(),
      expiresAt,                 // 6개월 후 또는 null
      isActive: true
    }

    // Firebase에 저장: consents/{ssdmUserId}/{mallId}
    const consentRef = ref(realtimeDb, `consents/${ssdmUserId}/${mallId}`)
    await set(consentRef, consentData)
    
    console.log('사용자 동의 정보 저장 완료:', consentData)
    
    // UID 반환 (JWT 발급용)
    return uid
  }

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const handleClose = () => {
    setShowPopup(false)
    // 동의 거부 시 JWT 발급하지 않고 쇼핑몰로 리디렉션
    console.log('사용자가 동의를 거부함 - JWT 발급 안 함')
    const failUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}status=failed&error=user_denied`
    window.location.href = failUrl
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
              router.push('/dashboard')
            }}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary">SSDM</h1>
              <p className="text-xs text-muted-foreground">개인정보보호</p>
            </div>
          </button>
          <div className="w-16"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">정보 제공 동의</h1>
          <p className="text-muted-foreground">
            {isLoading ? '쇼핑몰 정보를 확인하고 있습니다...' : `${serviceName}에 개인정보 제공 동의`}
          </p>
        </div>
      </div>

      {/* 팝업 */}
      {!isLoading && (
        <ConsentPopup 
          isOpen={showPopup}
          onClose={handleClose}
          serviceName={serviceName}
          userInfo={userInfo}
          onComplete={handleComplete}
        />
      )}

      {/* 팝업이 닫힌 경우 안내 메시지 */}
      {!showPopup && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12 space-y-4">
            <p className="text-lg">✅ 정보 제공 동의가 완료되었습니다!</p>
            <div className="space-x-4">
              <Button onClick={() => setShowPopup(true)}>
                팝업 다시 보기
              </Button>
              <Button variant="outline" onClick={() => router.push('/external-request/additional-info')}>
                추가 정보 입력 페이지로 이동
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

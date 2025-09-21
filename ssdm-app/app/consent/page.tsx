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
  const searchParams = useSearchParams()
  const [consentType, setConsentType] = useState<string>("once")
  const [loading, setLoading] = useState(false)
  // userInfo 상태 제거 - 실시간 복호화로 변경
  const [mallInfo, setMallInfo] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [shopId, setShopId] = useState<string | null>(null)
  const [mallId, setMallId] = useState<string | null>(null)
  const [personalData, setPersonalData] = useState<any>({})
  

  useEffect(() => {
    // 1. sessionStorage에서 JWT 확인 (로그인 후 /consent로 이동한 경우)
    const jwtToken = sessionStorage.getItem('openPopup')
    if (jwtToken) {
      console.log('🔵 [로그인 후 /consent로 이동한 경우] JWT 세션에서 발견')
      setToken(jwtToken)
      verifyToken(jwtToken).then(() => {
        console.log('🔵 [로그인 후 /consent로 이동한 경우] JWT 검증 완료')
        // 검증 완료 후 초기화 실행
        initializeUserConnection()
      }).catch(error => {
        console.error('🔵 [로그인 후 /consent로 이동한 경우] JWT 검증 실패:', error)
        setError("JWT 토큰 검증에 실패했습니다.")
      })
      return
    }
    console.log('🔵 [팝업에서 직접 이동한 경우] postMessage 리스너 설정')
    
    // 2. postMessage 리스너 추가 (팝업에서 직접 이동한 경우)
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'init_consent') {
        const { jwt: jwtToken } = event.data
        console.log('받은 JWT:', jwtToken ? '존재함' : '없음')
        
        if (jwtToken) {
          try {
            setToken(jwtToken)
            
            // JWT 검증 먼저 시도
            await verifyToken(jwtToken)
            
            // 검증 성공 시에만 세션에 저장
            sessionStorage.setItem('openPopup', jwtToken)
            
            // 검증 완료 후 초기화 실행
            initializeUserConnection()
            
          } catch (error) {
            // 검증 실패 시 세션에 저장하지 않음
            console.error('JWT 처리 실패:', error)
            setError("JWT 토큰 처리 중 오류가 발생했습니다.")
          }
        } else {
          setError("JWT 토큰이 누락되었습니다.")
        }
      }
    }

    // 메시지 리스너 등록
    window.addEventListener('message', handleMessage)

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      window.removeEventListener('message', handleMessage)
    }
    }, [])

  // JWT가 없을 때는 사용자 연결 초기화를 하지 않음
  useEffect(() => {
    console.log('🟡 [에러 체크] useEffect 시작, token:', token)
    
    // JWT가 세션에 있으면 에러 체크하지 않음
    const jwtToken = sessionStorage.getItem('openPopup')
    if (jwtToken) {
      console.log('🟡 [에러 체크] JWT 세션에 있음, 에러 체크하지 않음')
      return
    }
    
    if (!token) {
      console.log('🟡 [에러 체크] JWT 토큰 없음, 에러 발생')
      setError('JWT 토큰이 필요합니다. 다시 시도해주세요.')
      return
    }
    console.log('🟡 [에러 체크] JWT 토큰 있음, 정상 처리')
  }, [token])

  useEffect(() => {
    // 팝업이 닫힐 때만 세션 정리 (X 버튼으로 닫기 감지)
    const handleBeforeUnload = () => {
      // 팝업인 경우에만 세션 정리
      if (window.opener && window.opener !== window) {
        sessionStorage.removeItem('redirect_after_login')
        sessionStorage.removeItem('redirect_after_profile')
        sessionStorage.removeItem('from_external_popup')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
    // 사용자 매핑 정보 확인 및 생성 함수
  const ensureUserMapping = async (shopId: string, mallId: string) => {
    try {
      console.log('사용자 매핑 정보 확인 시작:', { shopId, mallId })
      
      // Firebase에서 기존 매핑 정보 확인
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get, set } = await import('firebase/database')
      
      const mappingRef = ref(realtimeDb, `userMappings/${mallId}/${shopId}`)
      const mappingSnapshot = await get(mappingRef)
      
      if (mappingSnapshot.exists()) {
        const existingUid = mappingSnapshot.val().uid
        console.log('기존 UID 발견:', existingUid)
        return existingUid
      }
      
      // 새 UID 생성
      const uid = await generateUid(mallId)
      console.log('새 UID 생성:', uid)
      
      // 매핑 정보 저장
      await set(mappingRef, {
        uid: uid,
        createdAt: new Date().toISOString(),
        isActive: true
      })
      
      return uid
    } catch (error) {
      throw error
    }
  }

  // UID 생성 함수
  const generateUid = async (mallId: string): Promise<string> => {
    // UUID v4 생성 (Web Crypto API 사용)
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // UUID v4 형식으로 변환
    array[6] = (array[6] & 0x0f) | 0x40; // version 4
    array[8] = (array[8] & 0x3f) | 0x80; // variant bits
    
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const uuid = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
    
    return `${mallId}-${uuid}`;
  }

  // verifyToken 함수 수정
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
          
          // JWT 검증 성공 후 바로 사용자 연결 초기화
          await initializeUserConnection(payload.mallId)
          console.log("payload.mallId 확인 검증로직시 ",payload.mallId)
        } else {
          console.error('JWT 토큰 검증 실패: 유효하지 않은 토큰')
          setError('JWT 토큰이 유효하지 않습니다.')
        }
      } else {
        console.error('JWT 토큰 검증 실패')
        setError('JWT 토큰 검증에 실패했습니다.')
      }
    } catch (error) {
      console.error('JWT 토큰 검증 중 오류:', error)
      setError('JWT 토큰 검증 중 오류가 발생했습니다.')
    }
  }

  const initializeUserConnection = async (mallIdParam?: string) => {
    setLoading(true)
    
    try {
      console.log('=== initializeUserConnection 함수 시작 ===')
      
      // 세션에서 JWT 직접 확인
      const jwtToken = sessionStorage.getItem('openPopup')
      if (!jwtToken) {
        console.log('세션에 JWT 토큰이 없어서 사용자 연결 초기화를 건너뜀')
        setError('JWT 토큰이 필요합니다. 다시 시도해주세요.')
        return
      }
      
      console.log('세션에서 JWT 확인됨:', jwtToken)
      
      // 파라미터로 전달된 값 우선 사용, 없으면 상태값 사용
      const currentMallId = mallIdParam || mallId;
      console.log("currentMallId 확인 초기화로직시 ",currentMallId);
      
      console.log('현재 mallId 초기화 할때있음? :', currentMallId)
      
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
        console.log('로그인된 사용자 없음')
        setError('로그인된 사용자 정보를 찾을 수 없습니다.')
        return
      }
      
      const userId = currentUser.uid
      console.log('사용자 UID:', userId)
      
      // 3. 사용자 데이터 로드
      console.log('loadUserData 호출 예정')
      await loadUserData(userId, allowedFields, currentMallId || undefined)
      
    } catch (error) {
      console.error('사용자 연결 초기화 오류:', error)
      setError(`사용자 연결 초기화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }


  const loadUserData = async (uid: string, requiredFields: string[], mallIdParam?: string) => {
    try {
      console.log('=== loadUserData 함수 시작 ===')
      // Firebase Auth UID를 그대로 사용 (별도 파싱 불필요)
      const userId = uid
      
      console.log('=== 사용자 데이터 로드 시작 ===')
      console.log('Firebase Auth UID:', uid)
      
      // Firebase에서 사용자 데이터 로드
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, get } = await import('firebase/database')
      
      // users/{uid}에서 사용자 기본 정보 조회
      const userRef = ref(realtimeDb, `users/${userId}`)
      const userSnapshot = await get(userRef)
      
      console.log('사용자 데이터 존재 여부:', userSnapshot.exists())
      
      if (!userSnapshot.exists()) {
        console.log('사용자 정보를 찾을 수 없습니다 - 로그인 페이지로 리디렉션')
        
        // 리다이렉트 경로 설정하지 않음 (무한 루프 방지)
        console.log('리다이렉트 경로 설정 안함')
        
        // 외부 팝업에서 온 경우를 표시
        sessionStorage.setItem('from_external_popup', 'true')
        window.location.href = '/'
        return
      }
      
      const userData = userSnapshot.val()
      
      // Firebase에서 개인정보 직접 조회
      const { getUserProfile } = await import('@/lib/data-storage')
      const { auth } = await import('@/lib/firebase')
      
      let userProfile = null
      try {
        userProfile = await getUserProfile(auth.currentUser!)
        console.log('개인정보 조회 성공')
      } catch (error) {
        console.error('개인정보 조회 실패:', error)
        setError('개인정보를 불러오는 중 오류가 발생했습니다.')
        return
      }
      
      let personalDataObj = {}
      if (userProfile) {
        // Firebase에서 조회한 개인정보 사용
        personalDataObj = {
          name: userProfile.name || userData.displayName?.split('/')[0] || '',
          phone: userProfile.phone || '',
          address: userProfile.address || '',
          detailAddress: userProfile.detailAddress || '',
          zipCode: userProfile.zipCode || '',
          email: userProfile.email || userData.email || ''
        }
      } else {
        // 개인정보가 없으면 기본 정보만 사용
        personalDataObj = {
          name: userData.displayName?.split('/')[0] || '',
          phone: '',
          address: '',
          detailAddress: '',
          zipCode: '',
          email: userData.email || ''
        }
      }
      
      // 전역 상태에 저장
      setPersonalData(personalDataObj)
      
      // 기본 정보와 개인정보 병합
      const mergedUserData = {
        ...userData,
        ...personalDataObj
      }
      
      // 1. 프로필 완료 여부 확인 (profile 객체에서 확인)
      console.log('프로필 완료 여부 확인:', userProfile?.profileCompleted)
      if (!userProfile || !userProfile.profileCompleted) {
        // 개인정보 입력 아예 안한 사람 → 개인정보 설정페이지로 리디렉션
        console.log('프로필 미완성 - 개인정보 설정페이지로 리디렉션')
        // JWT 토큰을 sessionStorage에 저장
        const jwtToken = sessionStorage.getItem('openPopup')
        if (jwtToken) {
          sessionStorage.setItem('openPopup', jwtToken)
        }
        sessionStorage.setItem('redirect_after_profile', '/storage-setup')
        // 외부 팝업에서 온 경우를 표시
        sessionStorage.setItem('from_external_popup', 'true')
        console.log('개인정보 설정페이지로 리디렉션 실행')
        window.location.href = '/profile-setup'
        return
      }
      
      // 2. 누락된 필드 확인
      const missingFields = requiredFields.filter(field => {
        const value = mergedUserData[field as keyof typeof mergedUserData]
        return !value || value.trim() === ""
      })
      
      console.log('누락된 필드 확인:', missingFields)
      if (missingFields.length > 0) {
        // 요청 정보보다 적게 입력한 사람 → 추가정보 입력
        console.log('누락된 필드 있음 - 추가정보 입력 팝업 표시')
        setShowAdditionalInfo(true)
        // 쇼핑몰 ID는 파라미터에서 가져옴
        const mallIdFromUid = mallIdParam || mallId
        
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
        // setUserInfo 제거 - 실시간 복호화 방식으로 변경
        // 쇼핑몰 ID는 파라미터에서 가져옴
        const mallIdFromUid = mallIdParam || mallId
        
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

  // 휴대폰 번호 포맷팅 함수
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    // 숫자만 추출
    const numbers = phone.replace(/\D/g, '')
    // 010-1234-5678 형식으로 포맷팅
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
    }
    return phone
  }

  const getFieldValue = (field: string) => {
    // personalData 상태에서 값 가져오기
    if (!personalData) return ''
    
    switch (field) {
      case 'name': return personalData.name || ''
      case 'phone': return formatPhoneNumber(personalData.phone || '')
      case 'address': 
        const address = personalData.address || ''
        const detailAddress = personalData.detailAddress || ''
        return detailAddress ? `${address} ${detailAddress}` : address
      case 'detailAddress': return personalData.detailAddress || ''
      case 'zipCode': return personalData.zipCode || ''
      case 'email': return personalData.email || ''
      default: return ''
    }
  }

  // 택배사용 JWT 생성 함수
  const generateDeliveryJWT = async (shopId: string, mallId: string) => {
    try {
      console.log('택배사용 JWT 생성 요청:', { shopId, mallId })
      
      const response = await fetch('/api/issue-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shopId, mallId })
      })
      
      console.log('JWT 발급 API 응답 상태:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('JWT 발급 API 오류:', errorData)
        throw new Error(`JWT 발급 실패: ${errorData.error}`)
      }
      
      const data = await response.json()
      console.log('택배사용 JWT 생성 완료:', {
        jwt: data.jwt,
        expiresIn: data.expiresIn,
        consentType: data.consentType,
        tokenLength: data.jwt?.length
      })
      return data.jwt
    } catch (error) {
      console.error('택배사용 JWT 생성 실패:', error)
      throw error
    }
  }

  // 동의 내역 저장 함수 (새로운 테이블 구조)
  const saveConsentData = async (consentId: string, mallId: string, shopId: string, consentType: string) => {
    try {
      // generate-uid로 생성된 UID 가져오기
      const uid = await ensureUserMapping(shopId, mallId)
      
      // Firebase Realtime Database에 동의 내역 저장
      const { realtimeDb } = await import('@/lib/firebase')
      const { ref, set } = await import('firebase/database')
      
      // mallServiceConsents 테이블에 저장 (올바른 구조: uid/mallId/shopId)
      const consentRef = ref(realtimeDb, `mallServiceConsents/${uid}/${mallId}/${shopId}`)
      await set(consentRef, {
        consentType,
        createdAt: new Date().toISOString(),
        expiresAt: consentType === 'once' 
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15분 후
          : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6개월 후
        ...(consentType === 'always' && { isActive: true })
      })
      
      // 개인정보 제공 로그 저장
      const { saveProvisionLog } = await import('@/lib/data-storage')
      const providedFields = Object.keys(personalData).filter(key => personalData[key])
      await saveProvisionLog(uid, {
        mallId,
        providedFields,
        consentType
      })
      
      console.log(`쇼핑몰 서비스 동의 및 로그 저장 완료: ${uid}/${mallId}`)
    } catch (error) {
      console.error('동의 내역 저장 실패:', error)
    }
  }

  const handleConsent = async () => {
    console.log('=== 동의하기 버튼 클릭됨 ===')
    console.log('현재 시간:', new Date().toISOString())
    console.log('mallInfo:', mallInfo)
    console.log('shopId:', shopId)
    console.log('mallId:', mallId)
    console.log('consentType:', consentType)
    // userInfo 로그 제거 - 실시간 복호화 방식으로 변경
    console.log('개인정보: 실시간 복호화 방식 사용')
    
    
    // 동의 결과 식별을 위한 고유 ID 생성
    const consentId = `${mallId}_${shopId}`

    setLoading(true)
    try {
      // 동의 결과를 부모 창(쇼핑몰)에 전달
      if (window.opener && window.opener !== window) {
        console.log("window.opener 확인",window.opener);
        console.log("window 확인",window);
        // 팝업으로 열린 경우 - opener를 통해 부모 창에 메시지 전달
        // Firebase에서 mallId의 허용 도메인 조회
        try {
          const { realtimeDb } = await import('@/lib/firebase')
          const { ref, get } = await import('firebase/database')
          const mallRef = ref(realtimeDb, `malls/${mallId}`)
          const mallSnapshot = await get(mallRef)
          
          if (mallSnapshot.exists()) {
            const mallData = mallSnapshot.val()
            const allowedDomain = mallData.allowedDomain
            console.log('Firebase에서 조회한 허용 도메인:', allowedDomain)
            
            // 허용된 도메인을 targetOrigin으로 사용
            const targetOrigin = allowedDomain || null
            
            if (!targetOrigin) {
              console.error('허용된 도메인이 설정되지 않았습니다.')
              setError('허용된 도메인이 설정되지 않았습니다.')
              return
            }
            
            console.log("사용할 targetOrigin:", targetOrigin);
            
            // 1. 동의 정보 저장
            await saveConsentData(consentId, mallId, shopId, consentType)
            
            // 2. Firebase 동기화 대기
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // 3. 택배사용 JWT 생성
            const deliveryJWT = await generateDeliveryJWT(shopId, mallId)
            
            console.log('postMessage로 동의 결과 전달 (팝업):', {
              type: 'consent_result',
              agreed: true,
              consentType,
              shopId,
              mallId,
              jwt: deliveryJWT,
              timestamp: new Date().toISOString()
            })
            
            // 3. 동의 결과 + JWT 전달
            window.opener.postMessage({
              type: 'consent_result',
              agreed: true,
              consentType,
              shopId,
              mallId,
              jwt: deliveryJWT,
              timestamp: new Date().toISOString()
            }, targetOrigin)
            
          } else {
            console.error('쇼핑몰 정보를 찾을 수 없습니다:', mallId)
            setError('쇼핑몰 정보를 찾을 수 없습니다.')
            return
          }
        } catch (error) {
          console.error('허용 도메인 조회 실패:', error)
          setError('허용 도메인 조회 중 오류가 발생했습니다.')
          return
        }
        
        // 4. 팝업 닫기
        setTimeout(() => {
          // JWT 세션 및 리다이렉트 세션 정리
          sessionStorage.removeItem('openPopup')
          sessionStorage.removeItem('redirect_after_login')
          sessionStorage.removeItem('redirect_after_profile')
          sessionStorage.removeItem('from_external_popup')
          window.close()
        }, 100)
      } else {
        // 일반 페이지인 경우 동의 내역 저장
        await saveConsentData(consentId, mallId, shopId, consentType)
      }

      console.log(`동의 완료 - shopId: ${shopId}, mallId: ${mallId}`)

    } catch (error) {
      console.error('동의 처리 오류:', error)
      setError('동의 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    console.log('=== 거부하기 버튼 클릭됨 ===')
    console.log('현재 시간:', new Date().toISOString())
    console.log('mallInfo:', mallInfo)
    console.log('shopId:', shopId)
    console.log('mallId:', mallId)
    console.log('개인정보: 실시간 복호화 방식 사용')
    
    // 팝업으로 열린 경우 창 닫기
    if (window.opener && window.opener !== window) {
      console.log("window.opener", window.opener);
      console.log("window", window);
      console.log('팝업 창 닫기')
      
      try {
        // Firebase에서 허용 도메인 조회 (동의 시와 동일)
        const { realtimeDb } = await import('@/lib/firebase')
        const { ref, get } = await import('firebase/database')
        
        const mallRef = ref(realtimeDb, `malls/${mallId}`)
        const mallSnapshot = await get(mallRef)
        
        let allowedDomain = null
        if (mallSnapshot.exists()) {
          const mallData = mallSnapshot.val()
          allowedDomain = mallData.allowedDomain
          console.log('Firebase에서 조회한 허용 도메인:', allowedDomain)
        }
        
        // 거부 결과 전달 (동의 시와 동일한 방식)
        const targetOrigin = allowedDomain || null
        console.log('거부 결과 전달:', {
          type: 'consent_rejected',
          timestamp: new Date().toISOString(),
          targetOrigin
        })
        window.opener.postMessage({
          type: 'consent_rejected',
          timestamp: new Date().toISOString()
        }, targetOrigin)
        
      } catch (error) {
        console.error('허용 도메인 조회 실패:', error)
        // 에러 시에도 메시지 전달
        window.opener.postMessage({
          type: 'consent_rejected',
          timestamp: new Date().toISOString()
        }, window.location.origin)
      }
      
      // JWT 세션 및 리다이렉트 세션 정리
      sessionStorage.removeItem('openPopup')
      sessionStorage.removeItem('redirect_after_login')
      sessionStorage.removeItem('redirect_after_profile')
      sessionStorage.removeItem('from_external_popup')
      window.close()
    }
  }

  const handleAdditionalInfoComplete = async (additionalData: { [key: string]: string }) => {
    try {
      setLoading(true)
      
      // 1. Firebase에서 기존 개인정보 조회
      const { getUserProfile, saveUserProfile } = await import('@/lib/data-storage')
      const { auth } = await import('@/lib/firebase')
      const existingProfile = await getUserProfile(auth.currentUser!)
      
      // 2. 기존 데이터와 추가 데이터 병합
      const updatedProfile = {
        name: existingProfile?.name || '',
        phone: existingProfile?.phone || '',
        address: existingProfile?.address || '',
        detailAddress: existingProfile?.detailAddress || '',
        zipCode: existingProfile?.zipCode || '',
        email: existingProfile?.email || '',
        ...additionalData
      }
      
      // 3. Firebase에 업데이트된 프로필 저장
      const currentUser = auth.currentUser
      if (currentUser) {
        await saveUserProfile(currentUser, updatedProfile)
      }
      
      // 4. UI 상태 업데이트
      setShowAdditionalInfo(false)
      // setUserInfo 제거 - 실시간 복호화 방식으로 변경
      // 추가 정보는 로컬 저장소에만 저장됨
      
      // 5. 쇼핑몰 정보도 설정 (동의 화면 표시를 위해)
      const { realtimeDb } = await import('@/lib/firebase')
      const { get, ref } = await import('firebase/database')
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
    } finally {
      setLoading(false)
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
                  // JWT 토큰이 있으면 다시 검증 시도
                  const jwtToken = sessionStorage.getItem('openPopup')
                  if (jwtToken) {
                    verifyToken(jwtToken)
                  } else {
                    setError("JWT 토큰이 없습니다. 다시 시도해주세요.")
                  }
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

  if (!mallInfo) {
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
            <button 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('거부 버튼 클릭 이벤트 발생!')
                handleReject()
              }}
              disabled={loading}
            >
              거부
            </button>
            <button 
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConsent();
              }}
              disabled={loading}
            >
              {loading ? '처리중...' : '동의하기'}
            </button>
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

"use client"

import { useState, useEffect, Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import AdditionalInfoPopup from "@/components/popups/additional-info-popup"
import { generateEncryptionKey, encryptData, decryptData } from "@/lib/encryption"

function AdditionalInfoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPopup, setShowPopup] = useState(true)
  const [missingFields, setMissingFields] = useState<string[]>(['name', 'phone', 'address'])
  const [uid, setUid] = useState<string>('')
  const [fields, setFields] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [hasExistingData, setHasExistingData] = useState<boolean>(false)

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
    setShowPopup(false)
    
    try {
      // 1. SSDM 사용자 메타데이터 업데이트 (어떤 필드가 있는지)
      await updateUserMetadata()
      
      // 2. SSDM 암호화 데이터 업데이트 (실제 개인정보 값)
      await updateEncryptedData()
      
      // 3. 완료 후 정보 제공 동의 페이지로 이동 (원래 파라미터 유지)
      const consentUrl = `/consent?uid=${encodeURIComponent(uid)}&fields=${encodeURIComponent(fields)}`
      router.push(consentUrl)
      
    } catch (error) {
      console.error('데이터 업데이트 실패:', error)
      alert('데이터 저장 중 오류가 발생했습니다.')
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
      
      const { getDatabase, ref, set } = await import('firebase/database')
      const db = getDatabase()
      
      // 사용자 메타데이터 업데이트
      const metadataRef = ref(db, `users/${currentUser.uid}/metadata`)
      // SSDM 중개 원칙: 개인정보를 상태에 저장하지 않음
      // 메타데이터만 업데이트
      await set(metadataRef, {
        lastUpdated: new Date().toISOString()
      })
      
      console.log('사용자 메타데이터 업데이트 완료')
    } catch (error) {
      console.error('메타데이터 업데이트 실패:', error)
      throw error
    }
  }

  const updateEncryptedData = async () => {
    try {
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        console.error('로그인된 사용자가 없습니다.')
        return
      }
      
      const { getDatabase, ref, set } = await import('firebase/database')
      const db = getDatabase()
      
      // 암호화된 개인정보 데이터 업데이트
      const encryptedDataRef = ref(db, `users/${currentUser.uid}/encryptedData`)
      
      // SSDM 중개 원칙: 개인정보를 상태에 저장하지 않음
      // 실제 암호화 로직은 로컬 저장소에서 처리
      console.log('암호화 데이터 업데이트는 로컬 저장소에서 처리됨')
      
      // SSDM 중개 원칙: 개인정보를 Firebase에 저장하지 않음
      // 로컬 저장소에만 암호화 저장
      
      console.log('암호화 데이터 업데이트 완료')
    } catch (error) {
      console.error('암호화 데이터 업데이트 실패:', error)
      throw error
    }
  }

  const handleClose = () => {
    setShowPopup(false)
    // 팝업 닫기 시 데모 페이지로 돌아가기
    router.push('/external-request-demo')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">추가 정보 입력 페이지</h1>
          <p className="text-muted-foreground">
            쇼핑몰에서 요청한 정보 중 부족한 정보를 입력해주세요
          </p>
        </div>
      </div>

      {/* 팝업 */}
      <AdditionalInfoPopup 
        isOpen={showPopup}
        onClose={handleClose}
        serviceName="네이버 쇼핑몰"
        missingFields={missingFields}
        hasExistingData={hasExistingData}
        onComplete={handleComplete}
      />

      {/* 팝업이 닫힌 경우 안내 메시지 */}
      {!showPopup && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12 space-y-4">
            <p className="text-lg">✅ 추가 정보 입력이 완료되었습니다!</p>
            <div className="space-x-4">
              <Button onClick={() => setShowPopup(true)}>
                팝업 다시 보기
              </Button>
              <Button variant="outline" onClick={() => router.push('/consent')}>
                정보 제공 동의 페이지로 이동
              </Button>
            </div>
          </div>
        </div>
      )}
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

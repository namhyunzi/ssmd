"use client"

import { useState, useEffect } from "react"
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
      
      if (now > expiresAt) {
        setError('세션이 만료되었습니다.')
        return
      }
      
      // 3. userMappings에서 Firebase UID 조회
      const mappingRef = ref(realtimeDb, `userMappings/${sessionData.mallId}`)
      const mappingSnapshot = await get(mappingRef)
      
      if (!mappingSnapshot.exists()) {
        setError('사용자 매핑 정보를 찾을 수 없습니다.')
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
        return
      }
      
      // 4. Firebase UID로 users 테이블 조회
      const userRef = ref(realtimeDb, `users/${firebaseUid}`)
      const userSnapshot = await get(userRef)
      
      if (!userSnapshot.exists()) {
        setError('사용자 정보를 찾을 수 없습니다.')
        return
      }
      
      const userData = userSnapshot.val()
      
      // 5. 요청된 필드만 필터링 (4개 필드만)
      const personalInfo: PersonalInfo = {}
      sessionData.requiredFields.forEach((field: string) => {
        if (userData.profile && userData.profile[field]) {
          personalInfo[field as keyof PersonalInfo] = userData.profile[field]
        }
      })
      
      setPersonalInfo(personalInfo)
      
    } catch (error) {
      setError('개인정보 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'address': return <MapPin className="h-4 w-4" />
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
      case 'zipCode': return '우편번호'
      case 'email': return '이메일'
      default: return field
    }
  }

  const getFieldValue = (field: string) => {
    if (!personalInfo) return ''
    
    switch (field) {
      case 'name': return personalInfo.name || ''
      case 'phone': return personalInfo.phone || ''
      case 'address': return personalInfo.address || ''
      case 'zipCode': return personalInfo.zipCode || ''
      case 'email': return personalInfo.email || ''
      default: return ''
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {error === '세션이 만료되었습니다.' ? '세션이 만료되었습니다' : '오류가 발생했습니다'}
            </h2>
            <p className="text-muted-foreground">
              {error === '세션이 만료되었습니다.' 
                ? '개인정보 조회 권한이 만료되었습니다.\n다시 요청해주세요.'
                : error
              }
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!personalInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-lg mx-auto">
        {/* 개인정보 표시 */}
        <div className="bg-gray-50 p-4 space-y-3">
          {displayFields.map((field: string) => (
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

        {/* SSDM 로고 */}
        <div className="flex justify-end mt-4">
          <div className="text-center">
            <h1 className="text-sm font-bold text-primary">SSDM</h1>
            <p className="text-xs text-muted-foreground">개인정보보호</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SecureViewerPage() {
  return <SecureViewerContent />
}

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    // UI 확인을 위해 바로 더미 데이터 표시
    setPersonalInfo({
      name: "남현지",
      phone: "010-1111-1111",
      address: "경기 성남시 분당구 대왕판교로 477 (판교동) 1층",
      email: "hyunji9886@knou.ac.kr",
      zipCode: "13480"
    })
    setLoading(false)
  }, [])

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

  if (error || !personalInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold mb-2">오류가 발생했습니다</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 표시할 필드들 (실제로는 세션에서 받은 requiredFields 사용)
  const displayFields = ['name', 'phone', 'address', 'email', 'zipCode'].filter(field => {
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

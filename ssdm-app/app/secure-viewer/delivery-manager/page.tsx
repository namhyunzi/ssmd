"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Shield, Printer, QrCode, Eye, User, Phone, MapPin, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface ViewerSession {
  sessionId: string;
  sessionType: string;
  allowedFields: string[];
  expiresAt: string;
  isActive: boolean;
}

interface UserData {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
}

export default function DeliveryManagerViewer() {
  const [session, setSession] = useState<ViewerSession | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  useEffect(() => {
    if (!sessionId) {
      setError("세션 ID가 필요합니다.")
      setLoading(false)
      return
    }

    // 세션 확인 및 사용자 데이터 로드
    loadSessionData()
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      // 1. 세션 정보 조회
      const sessionResponse = await fetch(`/api/request-info?sessionId=${sessionId}`)
      const sessionResult = await sessionResponse.json()

      if (!sessionResponse.ok) {
        setError(sessionResult.error || "세션을 찾을 수 없습니다.")
        return
      }

      setSession(sessionResult.session)

      // 2. 실제 사용자 데이터 조회
      const userDataResponse = await fetch('/api/get-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      const userDataResult = await userDataResponse.json()

      if (!userDataResponse.ok) {
        setError(userDataResult.error || "사용자 데이터를 불러올 수 없습니다.")
        return
      }

      setUserData(userDataResult.userData)

    } catch (error) {
      console.error('세션 로드 오류:', error)
      setError("세션 정보를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'address': return <MapPin className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
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
    if (!userData) return ''
    switch (field) {
      case 'name': return userData.name || ''
      case 'phone': return userData.phone || ''
      case 'address': return userData.address || ''
      case 'email': return userData.email || ''
      default: return ''
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>세션 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-red-600">접근 오류</h1>
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

  if (!session || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>세션 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Security Header */}
      <header className="bg-destructive text-destructive-foreground p-4 border-b">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-lg font-bold">SSDM 보안 페이지</h1>
            <p className="text-xs opacity-90">개인정보보호</p>
          </div>
        </div>
      </header>

      {/* Security Warning */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm">
              <p className="font-medium text-red-800">본 화면은 SSDM 보안 페이지입니다.</p>
              <p className="text-red-700">복사, 저장, 스크린샷 금지 • 송장 출력만 허용</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* 세션 정보 */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>세션 ID: {session.sessionId.slice(0, 8)}...</span>
              <span>만료: {new Date(session.expiresAt).toLocaleString('ko-KR')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                배송 정보
              </h2>
              <Button onClick={handlePrint} size="sm" className="print:hidden">
                <Printer className="h-4 w-4 mr-2" />
                인쇄
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">배송담당자 전용 뷰어</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Information */}
            <div className="bg-muted/30 p-6 rounded-lg space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {session.allowedFields.map(field => (
                  <div key={field}>
                    <label className="text-sm font-medium text-muted-foreground flex items-center">
                      {getFieldIcon(field)}
                      <span className="ml-2">{getFieldLabel(field)}</span>
                    </label>
                    <p className="text-lg font-medium">{getFieldValue(field)}</p>
                  </div>
                ))}
              </div>
              
              {/* 허용되지 않은 필드가 있는 경우 안내 */}
              {session.allowedFields.length < 3 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    이 세션에서는 {session.allowedFields.map(f => getFieldLabel(f)).join(', ')} 정보만 제공됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 print:hidden">
              <Button onClick={handlePrint} size="lg" className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                종이송장 인쇄
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => {
                // QR송장 생성 로직
                console.log('QR송장 생성')
              }}>
                <QrCode className="h-4 w-4 mr-2" />
                QR송장 생성
              </Button>
            </div>

            {/* Security Notice */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">보안 안내</p>
                  <ul className="text-red-700 mt-1 space-y-1">
                    <li>• 이 정보는 배송 목적으로만 사용됩니다</li>
                    <li>• 화면 캡처 및 복사가 금지됩니다</li>
                    <li>• 송장 출력 후 즉시 페이지를 닫아주세요</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 워터마크 */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div className="relative w-full h-full">
          {/* 배경 전체에 대각선 워터마크 */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
                <svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
                  <text x="150" y="50" fill="red" text-anchor="middle" font-size="16" font-weight="bold" transform="rotate(-30 150 50)">
                    SSDM 배송담당자 • 기밀정보 • 복사금지
                  </text>
                </svg>
              `)}")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '300px 100px'
            }} />
          </div>
          
          {/* 중앙 강조 워터마크 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.08]">
            <div className="text-center">
              <div className="text-6xl font-bold text-red-500 mb-2">SSDM</div>
              <div className="text-2xl font-semibold text-red-600">배송담당자 전용</div>
              <div className="text-lg text-red-500">CONFIDENTIAL</div>
            </div>
          </div>

          {/* 모서리 워터마크 */}
          <div className="absolute top-4 right-4 opacity-[0.1]">
            <div className="text-right text-xs text-red-500 font-medium">
              <div>SSDM 보안 페이지</div>
              <div>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4 opacity-[0.1]">
            <div className="text-xs text-red-500 font-medium">
              <div>배송담당자 뷰어 • 스크린샷 금지</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

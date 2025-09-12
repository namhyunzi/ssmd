"use client"

import { useState } from "react"
import { Truck, Eye, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

export default function DeliveryTestPage() {
  const [jwt, setJwt] = useState("")
  const [requiredFields, setRequiredFields] = useState<string[]>([])
  const [viewerUrl, setViewerUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [testDataSetup, setTestDataSetup] = useState(false)

  const fieldOptions = [
    { id: 'name', label: '이름' },
    { id: 'phone', label: '휴대폰번호' },
    { id: 'address', label: '주소' }
  ]

  const handleFieldToggle = (fieldId: string) => {
    if (requiredFields.includes(fieldId)) {
      setRequiredFields(prev => prev.filter(f => f !== fieldId))
    } else {
      setRequiredFields(prev => [...prev, fieldId])
    }
  }

  const handleSetupTestData = async () => {
    setLoading(true)
    try {
      // JWT에서 UID 추출 (간단한 파싱)
      const jwtParts = jwt.split('.')
      if (jwtParts.length !== 3) {
        alert('올바른 JWT 형식이 아닙니다.')
        return
      }

      const payload = JSON.parse(atob(jwtParts[1]))
      const uid = payload.uid

      if (!uid) {
        alert('JWT에서 UID를 찾을 수 없습니다.')
        return
      }

      // UID에서 사용자 ID 추출
      const userId = uid.split('-').slice(1).join('-')

      const response = await fetch('/api/setup-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userData: {
            name: "김현지",
            phone: "010-1234-5678",
            address: "서울특별시 강남구 테헤란로 123, 201호",
            email: "user@example.com"
          }
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setTestDataSetup(true)
        alert('테스트 데이터가 설정되었습니다!')
      } else {
        alert(`테스트 데이터 설정 오류: ${data.error}`)
      }
    } catch (error) {
      console.error('테스트 데이터 설정 오류:', error)
      alert('테스트 데이터 설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestInfo = async () => {
    if (!jwt || requiredFields.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/request-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jwt,
          requiredFields
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setViewerUrl(data.viewerUrl)
      } else {
        alert(`오류: ${data.error}`)
      }
    } catch (error) {
      console.error('개인정보 요청 오류:', error)
      alert('요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const openViewer = () => {
    if (viewerUrl) {
      window.open(viewerUrl, '_blank', 'width=800,height=600')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              택배사 테스트 페이지
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              JWT 토큰으로 개인정보 요청 및 보안뷰어 테스트
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* JWT 입력 */}
            <div className="space-y-2">
              <Label htmlFor="jwt">JWT 토큰</Label>
              <Textarea
                id="jwt"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="JWT 토큰을 입력하세요 (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
                rows={4}
              />
            </div>

            {/* 테스트 데이터 설정 */}
            <div className="space-y-2">
              <Label>테스트 데이터 설정</Label>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-3">
                  실제 데이터 연동을 위해 먼저 테스트 데이터를 설정해주세요.
                </p>
                <Button 
                  onClick={handleSetupTestData}
                  disabled={!jwt || loading}
                  variant="outline"
                  size="sm"
                >
                  {testDataSetup ? "✅ 테스트 데이터 설정됨" : "🔧 테스트 데이터 설정"}
                </Button>
              </div>
            </div>

            {/* 필요한 필드 선택 */}
            <div className="space-y-2">
              <Label>요청할 개인정보</Label>
              <div className="space-y-2">
                {fieldOptions.map(field => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={field.id}
                      checked={requiredFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                      className="rounded"
                    />
                    <Label htmlFor={field.id}>{field.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 요청 버튼 */}
            <Button
              onClick={handleRequestInfo}
              disabled={loading || !jwt || requiredFields.length === 0 || !testDataSetup}
              className="w-full"
            >
              {loading ? '요청 중...' : '개인정보 요청'}
            </Button>
            {!testDataSetup && (
              <p className="text-sm text-red-600 text-center">
                먼저 테스트 데이터를 설정해주세요.
              </p>
            )}

            {/* 뷰어 URL 결과 */}
            {viewerUrl && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Label className="text-green-800 font-medium">보안뷰어 URL 생성 완료!</Label>
                <div className="font-mono text-sm bg-white p-3 rounded border break-all">
                  {viewerUrl}
                </div>
                <Button onClick={openViewer} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  보안뷰어 열기
                </Button>
              </div>
            )}

            {/* 사용 방법 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">사용 방법:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. 쇼핑몰에서 JWT 토큰을 발급받습니다</li>
                <li>2. 위에 JWT 토큰을 입력합니다</li>
                <li>3. 필요한 개인정보 항목을 선택합니다</li>
                <li>4. "개인정보 요청" 버튼을 클릭합니다</li>
                <li>5. 생성된 보안뷰어 URL로 정보를 확인합니다</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

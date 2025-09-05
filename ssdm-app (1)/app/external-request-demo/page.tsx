"use client"

import { ArrowLeft, AlertTriangle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function ExternalRequestDemo() {
  const router = useRouter()

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
              const isLoggedIn = localStorage.getItem('isLoggedIn')
              router.push(isLoggedIn ? '/dashboard' : '/')
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
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">외부 요청 팝업 테스트</CardTitle>
            <p className="text-muted-foreground">
              쇼핑몰에서 개인정보 요청 시 나타나는 팝업들을 테스트해볼 수 있습니다
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 개별 페이지 테스트 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">외부 요청 팝업 테스트</h3>
              <p className="text-sm text-muted-foreground">
                각 팝업을 별도 페이지에서 개별적으로 테스트할 수 있습니다
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <h4 className="font-medium mb-2">추가 정보 입력 팝업</h4>
                    <p className="text-sm text-muted-foreground mb-3">외부 요청 팝업 #1</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={() => router.push('/external-request/additional-info')}
                    >
                      페이지로 이동
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h4 className="font-medium mb-2">정보 제공 동의 팝업</h4>
                    <p className="text-sm text-muted-foreground mb-3">외부 요청 팝업 #2</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => router.push('/external-request/consent')}
                    >
                      페이지로 이동
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">테스트 안내</p>
                  <ul className="text-blue-700 mt-1 space-y-1">
                    <li>• 실제 쇼핑몰이 아닌 데모 페이지입니다</li>
                    <li>• 팝업에서 입력한 정보는 저장되지 않습니다</li>
                    <li>• 개별 페이지에서 각 팝업을 따로 테스트할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

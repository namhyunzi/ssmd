import { Shield, Printer, QrCode, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DeliveryManagerViewer() {
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
        <Card>
          <CardHeader className="text-center">
            <h2 className="text-xl font-semibold">배송 정보</h2>
            <p className="text-sm text-muted-foreground">배송담당자 전용 뷰어</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Information */}
            <div className="bg-muted/30 p-6 rounded-lg space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">받는 분</label>
                  <p className="text-lg font-medium">김철수</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">휴대폰 번호</label>
                  <p className="text-lg font-medium">010-1234-5678</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">배송 주소</label>
                  <p className="text-lg font-medium">서울시 강남구 테헤란로 123</p>
                  <p className="text-sm text-muted-foreground">상세주소: 101동 1001호</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-primary hover:bg-primary/90" size="lg">
                <Printer className="h-5 w-5 mr-2" />
                종이 송장 출력
              </Button>
              <Button variant="outline" className="w-full bg-transparent" size="lg">
                <QrCode className="h-5 w-5 mr-2" />
                QR송장 출력
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

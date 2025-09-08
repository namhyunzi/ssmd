"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import AdditionalInfoPopup from "@/components/popups/additional-info-popup"

export default function AdditionalInfoPage() {
  const router = useRouter()
  const [showPopup, setShowPopup] = useState(true)

  const handleComplete = () => {
    setShowPopup(false)
    // 완료 후 정보 제공 동의 페이지로 이동
    router.push('/external-request/consent')
  }

  const handleClose = () => {
    setShowPopup(false)
    // 팝업 닫기 시 데모 페이지로 돌아가기
    router.push('/external-request-demo')
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
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">추가 정보 입력 페이지</h1>
          <p className="text-muted-foreground">
            외부 요청 팝업 #1 - 쇼핑몰에서 요청한 정보 중 부족한 정보를 입력받는 팝업
          </p>
        </div>
      </div>

      {/* 팝업 */}
      <AdditionalInfoPopup 
        isOpen={showPopup}
        onClose={handleClose}
        serviceName="네이버 쇼핑몰"
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
              <Button variant="outline" onClick={() => router.push('/external-request/consent')}>
                정보 제공 동의 페이지로 이동
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

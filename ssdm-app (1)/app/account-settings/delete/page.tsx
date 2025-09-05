"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function AccountDeletePage() {
  const router = useRouter()
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = () => {
    if (!isConfirmed) {
      alert("탈퇴 전 주의사항을 확인해주세요.")
      return
    }
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    setIsDeleting(true)
    
    // 계정 삭제 시뮬레이션
    setTimeout(() => {
      // 모든 로컬 스토리지 데이터 삭제
      localStorage.clear()
      
      // 메인 페이지로 리다이렉트
      router.push('/')
    }, 2000)
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
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

      <div className="max-w-2xl mx-auto p-4">
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">계정 탈퇴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-destructive">탈퇴 시 주의사항</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 모든 개인정보가 즉시 삭제됩니다</li>
                <li>• 저장된 데이터는 복구할 수 없습니다</li>
                <li>• 동의한 서비스 연결이 모두 해제됩니다</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="confirm-delete" 
                className="rounded" 
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
              />
              <Label htmlFor="confirm-delete" className="text-sm">
                해당 정보를 확인했습니다
              </Label>
            </div>

            <div className="flex space-x-2">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  취소하기
                </Button>
              </Link>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                탈퇴하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div></div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeleting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center space-y-4">
              {/* 경고 아이콘 */}
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  정말로 계정을 삭제하시겠습니까?
                </h3>
                <p className="text-sm text-gray-600">
                  이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
                </p>
              </div>

              {isDeleting && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    <p className="text-sm text-red-800">계정을 삭제하는 중입니다...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제하기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import Link from "next/link"

export default function AccountDeletePage() {
  const router = useRouter()
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // Firebase Auth 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
      } else {
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleDeleteAccount = () => {
    if (!isConfirmed) {
      setToastMessage("탈퇴 전 주의사항을 확인해주세요.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      return
    }
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!currentUser) {
      setErrorMessage("사용자 정보를 찾을 수 없습니다.")
      return
    }

    setIsDeleting(true)
    setErrorMessage("")

    try {
      // API를 통해 서버에서 계정 삭제
      console.log('계정 삭제 요청:', { uid: currentUser.uid, email: currentUser.email });

      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          uid: currentUser.uid,
          email: currentUser.email 
        }),
      })

      console.log('응답 상태:', response.status, response.statusText);
      const data = await response.json()
      console.log('응답 데이터:', data);

      if (response.ok) {
        // 로컬 스토리지 데이터 삭제
        localStorage.clear()
        sessionStorage.clear()
        
        // Firebase Auth에서 로그아웃
        try {
          await signOut(auth)
          console.log('Firebase Auth 로그아웃 완료')
        } catch (error) {
          console.log('Firebase Auth 로그아웃 오류 (무시):', error)
        }
        
        // 성공 메시지 표시 후 메인 로그인 페이지로 이동
        alert("계정이 성공적으로 삭제되었습니다.")
        router.push('/')
      } else {
        console.error('계정 삭제 실패:', data)
        setErrorMessage(data.error || "계정 삭제에 실패했습니다.")
        setShowDeleteModal(false)
      }

    } catch (error: any) {
      console.error('계정 삭제 오류:', error)
      setErrorMessage("계정 삭제 중 오류가 발생했습니다. 고객센터에 문의해주세요.")
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
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

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

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
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "탈퇴 중..." : "탈퇴하기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                삭제하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

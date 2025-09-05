"use client"

import { useState, useEffect } from "react"
import { User, Database, FileText, LogOut, HelpCircle, ChevronRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")
  const [emailUsername, setEmailUsername] = useState<string>("")
  const router = useRouter()
  const { toast } = useToast()
  
  // Firebase Auth 상태 확인 및 사용자 정보 가져오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Firebase Auth 상태 변경:', user)
      if (user && user.email) {
        console.log('사용자 이메일:', user.email)
        setUserEmail(user.email)
        // 이메일에서 @ 앞부분 추출
        const username = user.email.split('@')[0]
        setEmailUsername(username)
        console.log('추출된 사용자명:', username)
      } else {
        console.log('사용자가 로그인되지 않음')
        // 로그인되지 않은 경우 메인 페이지(로그인)로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  // 로컬 스토리지에서 개인정보 설정 완료 상태 확인
  useEffect(() => {
    const profileCompleted = localStorage.getItem('profileCompleted')
    if (profileCompleted === 'true') {
      setHasCompletedProfile(true)
    }
  }, [])

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      })
      router.push('/')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-center">
            <h1 className="text-lg font-bold text-primary">SSDM</h1>
            <p className="text-xs text-muted-foreground">개인정보보호</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/support">
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                고객센터
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Warning Alert */}
        {!hasCompletedProfile && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-yellow-800">
                  서비스 이용을 위한 개인정보 설정이 필요합니다
                </h3>
              </div>
              <div className="ml-4">
                <Link href="/profile-setup">
                  <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    지금 설정하기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            <span className="text-primary">{emailUsername}</span>
            <span className="text-black">님, 안녕하세요!</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 전체 동의 현황 */}
            <Link href="/service-consent?filter=all">
              <Card className="bg-blue-500 text-white cursor-pointer hover:bg-blue-600 transition-colors p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm opacity-90">전체 동의 현황</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">3개</div>
                    <div className="text-sm opacity-80">활성화된 서비스 동의</div>
                  </div>
                  <ChevronRight className="h-6 w-6" />
                </div>
              </Card>
            </Link>

            {/* 만료 예정 */}
            <Link href="/service-consent?filter=expiring">
              <Card className="bg-orange-500 text-white cursor-pointer hover:bg-orange-600 transition-colors p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm opacity-90">만료 예정</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">1개</div>
                    <div className="text-sm opacity-80">7일 이내 만료 예정</div>
                  </div>
                  <ChevronRight className="h-6 w-6" />
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Main Menu Sections */}
        <div className="space-y-6">
          {/* Account Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <User className="h-5 w-5 mr-2 text-primary" />
                계정관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {hasCompletedProfile ? (
                  <Link href="/account-settings/profile">
                    <Card className="border cursor-pointer p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">개인정보 수정</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                ) : (
                  <Link href="/profile-setup">
                    <Card className="border cursor-pointer p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">개인정보 관리</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                )}
              </div>
              <div>
                <Link href="/account-settings/password">
                  <Card className="border cursor-pointer p-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">비밀번호 변경</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Storage Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Database className="h-5 w-5 mr-2 text-primary" />
                저장소관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/storage-management">
                <Card className="border cursor-pointer p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">분산 저장소 설정</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            </CardContent>
          </Card>

          {/* Personal Information Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                개인정보 제공 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link href="/service-consent?filter=all">
                  <Card className="border cursor-pointer p-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">연결된 서비스 관리</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              </div>
              <div>
                <Link href="/privacy-log?filter=1month">
                  <Card className="border cursor-pointer p-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">개인정보 제공 내역</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

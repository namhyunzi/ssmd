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
import { getUserProfile, createDefaultProfile, Users } from "@/lib/user-profile"
import { getUserServiceConsents, calculateConsentStats, UserConsents, createTestServiceConsents, createTestProvisionLogs } from "@/lib/service-consent"

export default function DashboardPage() {
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")
  const [emailUsername, setEmailUsername] = useState<string>("")
  const [userProfile, setUserProfile] = useState<Users | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [serviceConsents, setServiceConsents] = useState<UserConsents[]>([])
  const [consentStats, setConsentStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0 })
  const [isSocialLogin, setIsSocialLogin] = useState(false)
  const router = useRouter()
  
  // 커스텀 토스트 상태
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastSubMessage, setToastSubMessage] = useState("")
  
  // 테스트 데이터 생성 함수
  const handleCreateTestData = async () => {
    if (!currentUser) return;
    
    try {
      // 서비스 동의 데이터와 개인정보 제공내역 데이터를 모두 생성
      const [consentsSuccess, logsSuccess] = await Promise.all([
        createTestServiceConsents(currentUser),
        createTestProvisionLogs(currentUser)
      ]);
      
      if (consentsSuccess && logsSuccess) {
        // 서비스 동의 데이터 다시 로드
        const consents = await getUserServiceConsents(currentUser);
        setServiceConsents(consents);
        setConsentStats(calculateConsentStats(consents));
        
        setToastMessage("테스트 데이터 생성 완료")
        setToastSubMessage("8개 서비스 동의 + 10개 개인정보 제공내역이 생성되었습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else {
        setToastMessage("테스트 데이터 생성 실패")
        setToastSubMessage("데이터 생성 중 오류가 발생했습니다.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } catch (error) {
      console.error('테스트 데이터 생성 오류:', error);
      setToastMessage("테스트 데이터 생성 실패")
      setToastSubMessage("데이터 생성 중 오류가 발생했습니다.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }
  
  // Firebase Auth 상태 확인 및 사용자 정보 가져오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser(user)
        setUserEmail(user.email)
        // 이메일에서 @ 앞부분 추출
        const username = user.email.split('@')[0]
        setEmailUsername(username)
        console.log('추출된 사용자명:', username)
        
        // 소셜 로그인 사용자인지 확인
        const socialLogin = user.providerData.some(provider => 
          provider.providerId === 'google.com' || 
          provider.providerId === 'facebook.com' ||
          provider.providerId === 'twitter.com'
        )
        setIsSocialLogin(socialLogin)
        
        // Firebase에서 사용자 프로필 로드
        setIsLoadingProfile(true)
        let profile = await getUserProfile(user)
        
        // 프로필이 없으면 기본 프로필 생성
        if (!profile) {
          console.log('프로필이 없어서 기본 프로필 생성')
          const created = await createDefaultProfile(user)
          if (created) {
            profile = await getUserProfile(user)
          }
        }
        
        if (profile) {
          setUserProfile(profile)
          setHasCompletedProfile(profile.profileCompleted || 
            !!(profile.name || profile.phone || profile.address || profile.detailAddress))
        }
        
        // 서비스 동의 데이터 로드
        try {
          const consents = await getUserServiceConsents(user)
          console.log('=== 대시보드 - 서비스 동의 데이터 ===')
          console.log('로드된 동의 데이터 개수:', consents.length)
          console.log('동의 데이터:', consents)
          setServiceConsents(consents)
          const stats = calculateConsentStats(consents)
          setConsentStats(stats)
        } catch (error) {
          console.error('Error loading service consents:', error)
        }
        
        setIsLoadingProfile(false)
      } else {
        console.log('사용자가 로그인되지 않음')
        // 로그인되지 않은 경우 메인 페이지(로그인)로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])


  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await signOut(auth)
      setToastMessage("로그아웃 완료")
      setToastSubMessage("안전하게 로그아웃되었습니다.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      router.push('/')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      setToastMessage("로그아웃 실패")
      setToastSubMessage("로그아웃 중 오류가 발생했습니다.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
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
          <h2 className="text-xl font-semibold tracking-wide">
            <span className="text-primary">
              {(() => {
                // 소셜 로그인인지 확인 (Google 로그인)
                const isSocialLogin = currentUser?.providerData?.some((provider: any) => 
                  provider.providerId === 'google.com'
                )
                
                if (isSocialLogin) {
                  // 소셜 로그인: displayName 사용
                  return currentUser?.displayName || emailUsername || "사용자"
                } else {
                  // 일반 로그인: 이메일 아이디 부분 사용
                  return emailUsername || "사용자"
                }
              })()}
            </span>
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
                    <div className="text-2xl font-bold mb-1">{consentStats.total}개</div>
                    <div className="text-sm opacity-80">전체 서비스 동의</div>
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
                    <div className="text-2xl font-bold mb-1">{consentStats.expiring}개</div>
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
              {/* 소셜 로그인 사용자가 아닌 경우에만 비밀번호 변경 메뉴 표시 */}
              {!isSocialLogin && (
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
              )}
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
              
              {/* 테스트 데이터 생성 버튼 */}
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  onClick={handleCreateTestData}
                >
                  🧪 테스트 데이터 생성 (8개 서비스 + 10개 제공내역)
                </Button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  현재 서비스 동의: {serviceConsents.length}개
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-sm font-medium">{toastMessage}</p>
              {toastSubMessage && (
                <p className="text-xs mt-1 text-gray-300">{toastSubMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

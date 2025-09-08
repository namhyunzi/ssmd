"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Store, Settings, Unlink, Filter, AlertTriangle, X, Shield, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserProfile, Users } from '@/lib/user-profile'
import { getUserServiceConsents, calculateConsentStatus, deleteServiceConsent, UserConsents } from '@/lib/service-consent'
import { loadProfileFromLocal } from '@/lib/data-storage'

// ServiceConsent 타입을 lib에서 import하므로 중복 제거

function ServiceConsentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedConsent, setSelectedConsent] = useState<UserConsents | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedConsentType, setSelectedConsentType] = useState<string>("")
  const [consents, setConsents] = useState<UserConsents[]>([])
  const [userProfile, setUserProfile] = useState<Users | null>(null)
  const [localProfile, setLocalProfile] = useState<any>(null)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Firebase Auth 상태 확인 및 사용자 프로필 로딩
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user)
          setUserProfile(profile)
          
          // 로컬 저장소에서 실제 개인정보 데이터 로드
          const localData = loadProfileFromLocal()
          if (localData && localData.profile) {
            setLocalProfile(localData.profile)
          }
          
          // 서비스 동의 데이터 로드
          const userConsents = await getUserServiceConsents(user)
          setConsents(userConsents)
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      } else {
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  // URL 파라미터에서 필터 상태 확인
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam && ['active', 'expiring', 'expired'].includes(filterParam)) {
      setActiveFilter(filterParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (selectedConsent) {
      setSelectedConsentType(selectedConsent.consentType)
    }
  }, [selectedConsent])

  const handleComplete = () => {
    if (selectedConsent) {
      // 자동 허용 동의만 관리되므로 별도 업데이트 불필요
      // 목록으로 돌아가기
      setSelectedConsent(null)
    }
  }

  const handleDeleteConsent = () => {
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (selectedConsent) {
      setIsDeleting(true)
      try {
        const success = await deleteServiceConsent(selectedConsent.id)
        if (success) {
          // 해당 서비스 동의 내역 삭제
          setConsents(prev => prev.filter(consent => consent.id !== selectedConsent.id))
          setShowDeleteModal(false)
          setSelectedConsent(null) // 목록으로 돌아가기
        }
      } catch (error) {
        console.error('Error deleting consent:', error)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  // 필터링된 동의 내역 (상태를 실시간으로 계산)
  const filteredConsents = activeFilter === "all" 
    ? consents 
    : consents.filter(consent => calculateConsentStatus(consent.expiryDate) === activeFilter)

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredConsents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedConsents = filteredConsents.slice(startIndex, endIndex)

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter])

  const getFilterText = (filter: string) => {
    switch (filter) {
      case "active":
        return "활성화"
      case "expiring":
        return "만료예정"
      case "expired":
        return "만료됨"
      default:
        return "전체"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">활성</Badge>
      case "expiring":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">만료예정</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">만료됨</Badge>
      default:
        return null
    }
  }

  const getConsentTypeText = (type: string) => {
    switch (type) {
      case "always":
        return "자동 허용 (6개월)"
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => selectedConsent ? setSelectedConsent(null) : router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => router.push('/dashboard')}
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

      <div className="max-w-3xl mx-auto p-4">
        {!selectedConsent ? (
          /* Consent List View */
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">연결된 서비스 관리</CardTitle>
              <p className="text-sm text-muted-foreground">개인정보 제공에 동의한 서비스들을 관리하세요</p>
            </CardHeader>
            <CardContent>
              {/* Filter Buttons */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex gap-2 items-center">
                  <div className="flex items-center space-x-2 mr-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">필터:</span>
                  </div>
                  {["all", "active", "expiring", "expired"].map((filter) => (
                    <Button
                      key={filter}
                      variant={activeFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className="text-sm"
                    >
                      {getFilterText(filter)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredConsents.length > 0 ? (
                  paginatedConsents.map((consent) => (
                  <div
                    key={consent.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedConsent(consent)}
                  >
                    <div className="flex items-center space-x-3">
                      <Store className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">{consent.serviceName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {consent.startDate} ~ {consent.expiryDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(calculateConsentStatus(consent.expiryDate))}
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <Store className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">연결된 서비스가 없습니다</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        외부 서비스에서 개인정보 제공 동의를 하면 여기에 표시됩니다
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 페이지네이션 */}
              {filteredConsents.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-center pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Consent Detail View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2 text-primary" />
                {selectedConsent.serviceName}
                <div className="ml-3">{getStatusBadge(calculateConsentStatus(selectedConsent.expiryDate))}</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">동의 시작일</Label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm">{selectedConsent.startDate}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-1">
                    <Label className="text-sm font-medium">만료일</Label>
                    <div className="relative group">
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-700/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        기본 제공 기간: 6개월
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm">{selectedConsent.expiryDate}</p>
                  </div>
                </div>
              </div>

              {/* Provided Information */}
              <div className="space-y-3">
                <Label className="text-base font-medium">제공 정보</Label>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="text-sm">이름</Label>
                    <p className="text-sm">{localProfile?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">휴대폰 번호</Label>
                    <p className="text-sm">{localProfile?.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">주소</Label>
                    <p className="text-sm">{localProfile?.address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">이메일</Label>
                    <p className="text-sm">{localProfile?.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 안내 콜아웃 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    만료일까지 정보가 제공되며, 이후 자동으로 종료됩니다. 필요시 연결해제를 통해 언제든 중단할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button variant="destructive" className="flex-1" onClick={handleDeleteConsent}>
                  <Unlink className="h-4 w-4 mr-2" />
                  연결해제
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleComplete}>확인</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 연결해제 확인 모달 */}
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
                    정말로 연결을 해제하시겠습니까?
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedConsent?.serviceName}과의 개인정보 제공 동의가 해제되며,<br />
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>

                {isDeleting && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      <p className="text-sm text-red-800">연결을 해제하는 중입니다...</p>
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
                  <Unlink className="h-4 w-4 mr-2" />
                  연결해제
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ServiceConsentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ServiceConsentContent />
    </Suspense>
  )
}

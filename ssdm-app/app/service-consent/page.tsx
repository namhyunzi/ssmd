"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Store, Settings, Unlink, Filter, AlertTriangle, X, Shield, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Users } from '@/lib/user-profile'
import { getUserServiceConsents, calculateConsentStatus, UserConsents } from '@/lib/service-consent'
import { getUserProfile, getUserMappings, getMallServiceConsents, getUserProvisionLogs } from '@/lib/data-storage'

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
  const [userMappings, setUserMappings] = useState<any[]>([])
  const [mallConsents, setMallConsents] = useState<any[]>([])
  const [provisionLogs, setProvisionLogs] = useState<any[]>([])
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Firebase Auth 상태 확인 및 사용자 프로필 로딩
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        try {
          const profile = await getUserProfile(user)
          if (profile) {
            setUserProfile({
              uid: user.uid,
              email: user.email || '',
              createdAt: user.metadata.creationTime || new Date().toISOString(),
              updatedAt: user.metadata.lastSignInTime || new Date().toISOString(),
              profile: profile
            })
          }
          
          // SSDM 중개 원칙: 개인정보를 상태에 저장하지 않음
          // Firebase에 개인정보가 있는지만 확인
          const userProfileData = await getUserProfile(user)
          setLocalProfile(userProfileData ? { hasData: true } : { hasData: false })
          
          // 서비스 동의 데이터 로드
          const userConsents = await getUserServiceConsents(user)
          setConsents(userConsents)
        } catch (error) {
          console.error('Error loading user data:', error)
        }
        
        // 연결된 쇼핑몰 계정 및 동의 내역 로드
        try {
          const mappings = await getUserMappings()
          console.log('로드된 userMappings:', mappings)
          setUserMappings(mappings)
          
          // 각 쇼핑몰별 동의 내역 조회
          const allMallConsents = []
          for (const mapping of mappings) {
            const mallConsents = await getMallServiceConsents(mapping.mappedUid)
            allMallConsents.push(...mallConsents.map(consent => ({
              ...consent,
              mallId: mapping.mallId,
              shopId: mapping.shopId
            })))
          }
          setMallConsents(allMallConsents)
          console.log('쇼핑몰 동의 내역:', allMallConsents)
          console.log('mallConsents 필터링 전:', allMallConsents)
          console.log('mallConsents 필터링 전:', allMallConsents)
          console.log('mallConsents 필터링 후 (always만):', allMallConsents.filter(consent => consent.consentType === 'always'))
        } catch (error) {
          console.error('Error loading mall consents:', error)
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
        // Firebase에서 mallServiceConsents의 isActive를 false로 업데이트
        const { realtimeDb } = await import('@/lib/firebase')
        const { ref, update } = await import('firebase/database')
        
        // userMappings에서 mappedUid 찾기
        const { auth } = await import('@/lib/firebase')
        if (auth.currentUser) {
          const firebaseUid = auth.currentUser.uid
          const mappingRef = ref(realtimeDb, `userMappings/${selectedConsent.mallId}/${firebaseUid}/${selectedConsent.shopId}`)
          const { get } = await import('firebase/database')
          const mappingSnapshot = await get(mappingRef)
          
          if (mappingSnapshot.exists()) {
            const mappingData = mappingSnapshot.val()
            const mappedUid = mappingData.mappedUid
            
            // mallServiceConsents에서 isActive를 false로 업데이트
            const consentRef = ref(realtimeDb, `mallServiceConsents/${mappedUid}/${selectedConsent.mallId}/${selectedConsent.shopId}`)
            await update(consentRef, { isActive: false })
            
            console.log('연결해제 완료:', selectedConsent.mallId, selectedConsent.shopId, 'mappedUid:', mappedUid)
          }
        }
        
        // 로컬 상태에서도 제거
        setUserMappings(prev => prev.filter(mapping => 
          !(mapping.mallId === selectedConsent.mallId && mapping.shopId === selectedConsent.shopId)
        ))
        
        // mallConsents에서도 해당 항목 제거 (isActive: false로 변경된 항목)
        setMallConsents(prev => prev.filter(consent => 
          !(consent.mallId === selectedConsent.mallId && consent.shopId === selectedConsent.shopId)
        ))
        
        setShowDeleteModal(false)
        setSelectedConsent(null) // 목록으로 돌아가기
      } catch (error) {
        console.error('Error deleting consent:', error)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  // 만료일 계산 함수
  const calculateExpirationStatus = (consent: any) => {
    const now = new Date()
    const provisionDate = new Date(consent.timestamp || consent.createdAt || consent.date)
    const expiresAt = new Date(provisionDate.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)) // 6개월 후
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    
    if (daysUntilExpiry <= 0) {
      return 'expired'
    } else if (daysUntilExpiry <= 30) {
      return 'expiring'
    } else {
      return 'active'
    }
  }

  // 필터링된 동의 내역 (always 타입만 표시)
  const alwaysConsents = consents.filter(consent => consent.consentType === 'always')
  
  const filteredConsents = activeFilter === "all" 
    ? alwaysConsents 
    : alwaysConsents.filter(consent => calculateConsentStatus(consent.expiryDate) === activeFilter)

  // 필터링된 쇼핑몰 동의 내역
  const getFilteredMallConsents = () => {
    const alwaysConsents = mallConsents.filter(consent => 
      consent.consentType === 'always' && 
      consent.mallId && 
      consent.shopId && 
      consent.mallId !== '~' && 
      consent.shopId !== '~' &&
      consent.isActive !== false // isActive가 false인 항목 제외
    )
    
    if (activeFilter === "all") {
      return alwaysConsents
    }
    
    return alwaysConsents.filter(consent => {
      const status = calculateExpirationStatus(consent)
      return status === activeFilter
    })
  }

  const filteredMallConsents = getFilteredMallConsents()

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
      case "all":
        return "전체"
      case "active":
        return "활성"
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

              {/* 연결된 쇼핑몰 계정 섹션 - 숨김 처리 */}
              {false && userMappings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">연결된 쇼핑몰 계정</h3>
                  <div className="space-y-3">
                    {userMappings
                      .filter(mapping => {
                        console.log('매핑 데이터 확인:', mapping)
                        return mapping.mallId && mapping.shopId && mapping.mappedUid && mapping.mallId !== '~' && mapping.shopId !== '~' && mapping.isActive !== false
                      }) // 빈 데이터 필터링 강화 및 비활성 항목 제외
                      .map((mapping, index) => (
                      <div key={`${mapping.mallId}-${mapping.shopId}`} className="border rounded-lg p-4 hover:bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <Store className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-primary">{mapping.mallId}</div>
                              <div className="text-xs text-muted-foreground">연결된 계정: {mapping.shopId}</div>
                              <div className="text-xs text-muted-foreground">
                                연결일: {new Date(mapping.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={mapping.isActive ? "default" : "secondary"} className={mapping.isActive ? "bg-primary text-white" : "bg-gray-500 text-white"}>
                              {mapping.isActive ? "활성" : "비활성"}
                            </Badge>
                            <button 
                              onClick={async () => {
                                try {
                                  // 실제 사용자 프로필 데이터 가져오기
                                  const { auth } = await import('@/lib/firebase')
                                  const { getUserProfile } = await import('@/lib/data-storage')
                                  
                                  if (auth.currentUser) {
                                    const userProfile = await getUserProfile(auth.currentUser)
                                    
                                    // 쇼핑몰 상세 정보를 위한 consent 객체 생성
                                    const mockConsent = {
                                      id: `${mapping.mallId}-${mapping.shopId}`,
                                      serviceName: mapping.mallId,
                                      startDate: new Date(mapping.createdAt).toLocaleDateString(),
                                      expiryDate: mapping.isActive ? '항상 허용' : '비활성',
                                      consentType: mapping.isActive ? 'always' : 'inactive',
                                      providedFields: ['name', 'phone', 'address', 'email'],
                                      mallId: mapping.mallId,
                                      shopId: mapping.shopId,
                                      userProfile: userProfile // 실제 사용자 데이터 추가
                                    }
                                    setSelectedConsent(mockConsent)
                                    
                                    // localProfile도 업데이트
                                    setLocalProfile(userProfile)
                                  }
                                } catch (error) {
                                  console.error('사용자 프로필 로드 실패:', error)
                                }
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Settings className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 쇼핑몰 동의 내역 섹션 (always 동의만 표시) - 통합된 목록으로 변경 */}
              {filteredMallConsents.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">쇼핑몰 항상허용 동의 내역</h3>
                  <div className="space-y-3">
                    {filteredMallConsents
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((consent, index) => {
                      const expirationStatus = calculateExpirationStatus(consent)
                      const provisionDate = new Date(consent.timestamp || consent.createdAt || consent.date)
                      const expiresAt = new Date(provisionDate.getTime() + (6 * 30 * 24 * 60 * 60 * 1000))
                      
                      return (
                      <div 
                        key={`${consent.mallId}-${consent.shopId}-${index}`} 
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Store className="h-6 w-6 text-primary" />
                          <div>
                            <p className="font-medium">쇼핑몰: {consent.mallId}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                상점: {consent.shopId}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {provisionDate.toLocaleDateString()} ~ {expiresAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(expirationStatus)}
                          <button 
                            onClick={async () => {
                              try {
                                // 사용자 프로필 데이터 가져오기
                                const { auth } = await import('@/lib/firebase')
                                const { getUserProfile } = await import('@/lib/data-storage')
                                
                                if (auth.currentUser) {
                                  const userProfile = await getUserProfile(auth.currentUser)
                                  
                                  // 실제 제공 내역 로드
                                  const logs = await getUserProvisionLogs(auth.currentUser.uid)
                                  console.log('로드된 제공 내역:', logs)
                                  setProvisionLogs(logs)
                                  
                                  // 쇼핑몰 상세 정보를 위한 consent 객체 생성
                                  const mockConsent = {
                                    id: `${consent.mallId}-${consent.shopId}`,
                                    serviceName: consent.mallId,
                                    startDate: provisionDate.toLocaleDateString(),
                                    expiryDate: expiresAt.toLocaleDateString(),
                                    consentType: consent.consentType,
                                    providedFields: ['name', 'phone', 'address', 'email'],
                                    mallId: consent.mallId,
                                    shopId: consent.shopId,
                                    userProfile: userProfile
                                  }
                                  setSelectedConsent(mockConsent)
                                  
                                  // localProfile도 업데이트
                                  setLocalProfile(userProfile)
                                }
                              } catch (error) {
                                console.error('사용자 프로필 로드 실패:', error)
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>
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

              {/* 기존 서비스 목록은 제거 - 쇼핑몰 동의 내역만 표시 */}

              {/* 페이지네이션 - 쇼핑몰 동의 내역용 */}
              {filteredMallConsents.length > 0 && Math.ceil(filteredMallConsents.length / itemsPerPage) > 1 && (
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
                      {Array.from({ length: Math.ceil(filteredMallConsents.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredMallConsents.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredMallConsents.length / itemsPerPage)}
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
                    <p className="text-sm">{formatPhoneNumber(localProfile?.phone || '')}</p>
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

// 휴대폰 번호 포맷팅 함수
const formatPhoneNumber = (phone: string) => {
  if (!phone) return '-'
  
  const numbers = phone.replace(/\D/g, '')
  
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  } else if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }
  
  return phone
}

export default function ServiceConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>페이지를 로드하는 중...</p>
        </div>
      </div>
    }>
      <ServiceConsentContent />
    </Suspense>
  )
}

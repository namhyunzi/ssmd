"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Store, Filter, Shield, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { ref, get } from "firebase/database"
import { realtimeDb } from "@/lib/firebase"

interface UserLogs {
  id: string
  serviceName: string
  provisionDateTime: string
  providedInfo: string[]
}

function PrivacyLogContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<string>("1month")
  const [logs, setLogs] = useState<UserLogs[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Firebase Auth 상태 확인 및 개인정보 제공내역 로드
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        await loadProvisionLogs(user.uid)
      } else {
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  // 개인정보 제공내역 로드 함수
  const loadProvisionLogs = async (userId: string) => {
    try {
      setIsLoading(true)
      const logsRef = ref(realtimeDb, `userLogs/${userId}`)
      const snapshot = await get(logsRef)
      
      console.log('=== 개인정보 제공내역 로드 ===')
      console.log('사용자 ID:', userId)
      console.log('스냅샷 존재:', snapshot.exists())
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        console.log('로드된 데이터:', data)
        
        const logsList: UserLogs[] = []
        Object.keys(data).forEach((key) => {
          logsList.push({
            id: key,
            ...data[key]
          } as UserLogs)
        })
        
        console.log('변환된 로그 목록:', logsList)
        setLogs(logsList)
      } else {
        console.log('개인정보 제공내역 데이터가 없습니다.')
        setLogs([])
      }
    } catch (error) {
      console.error('개인정보 제공내역 로드 오류:', error)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  // URL 파라미터에서 필터 상태 확인
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam && ['1month', '2month', '3month'].includes(filterParam)) {
      setActiveFilter(filterParam)
    }
  }, [searchParams])

  // 필터링된 로그
  const getFilteredLogs = () => {
    // 간단하게 모든 로그를 최신순으로 정렬해서 반환
    return logs.sort((a, b) => new Date(b.provisionDateTime).getTime() - new Date(a.provisionDateTime).getTime())
  }

  const filteredLogs = getFilteredLogs()

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter])

  const getFilterText = (filter: string) => {
    switch (filter) {
      case "1month":
        return "1개월"
      case "2month":
        return "2개월"
      case "3month":
        return "3개월"
      default:
        return "1개월"
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' })
    
    const hour = date.getHours()
    const minute = date.getMinutes().toString().padStart(2, '0')
    const ampm = hour < 12 ? '오전' : '오후'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    
    return `${year}년 ${month}월 ${day}일 (${weekday}) ${ampm} ${displayHour}:${minute}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">개인정보 제공 내역</CardTitle>
            <p className="text-sm text-muted-foreground">외부 서비스에 개인정보를 제공한 내역을 확인하세요</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <div className="flex items-start space-x-2">
                <svg className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800">개인정보 제공 기록은 최대 3개월간 보관됩니다.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Buttons */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex gap-2 items-center">
                <div className="flex items-center space-x-2 mr-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">기간:</span>
                </div>
                {["1month", "2month", "3month"].map((filter) => (
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
              {isLoading ? (
                <div className="text-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">개인정보 제공내역을 불러오는 중...</p>
                </div>
              ) : filteredLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30"
                >
                  <div className="flex items-center space-x-3">
                    <Store className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">{log.serviceName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(log.provisionDateTime)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className="text-xs text-muted-foreground">제공정보:</span>
                        {log.providedInfo.map((info, index) => (
                          <Badge key={index} className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">
                            {info}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">개인정보 제공 내역이 없습니다</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      외부 서비스에 개인정보를 제공하면 여기에 내역이 표시됩니다
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {filteredLogs.length > 0 && totalPages > 1 && (
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
      </div>
    </div>
  )
}

export default function PrivacyLogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>페이지를 로드하는 중...</p>
        </div>
      </div>
    }>
      <PrivacyLogContent />
    </Suspense>
  )
}

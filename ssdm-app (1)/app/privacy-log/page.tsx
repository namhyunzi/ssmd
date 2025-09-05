"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Store, Filter, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProvisionLog {
  id: string
  serviceName: string
  provisionDate: string
  provisionTime: string
  providedInfo: string[]
}

function PrivacyLogContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<string>("1month")
  const [logs, setLogs] = useState<ProvisionLog[]>([
    {
      id: "1",
      serviceName: "네이버 쇼핑몰",
      provisionDate: "2024-12-28",
      provisionTime: "14:32",
      providedInfo: ["이름", "연락처", "주소"]
    },
    {
      id: "2",
      serviceName: "쿠팡",
      provisionDate: "2024-12-27",
      provisionTime: "09:15",
      providedInfo: ["이름", "연락처"]
    }
  ])

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
    return logs.sort((a, b) => new Date(b.provisionDate).getTime() - new Date(a.provisionDate).getTime())
  }

  const filteredLogs = getFilteredLogs()

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    })
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
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
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
                          {formatDate(log.provisionDate)} {log.provisionTime}
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
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {getFilterText(activeFilter)} 기간 동안 개인정보 제공 기록이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PrivacyLogPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrivacyLogContent />
    </Suspense>
  )
}

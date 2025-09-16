"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Key, Trash2, Mail, MailCheck, MailX, Settings, Users, Shield, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import ApiKeyModal from "@/components/popups/api-key-modal"

interface Mall {
  mallId: string;
  mallName: string;
  allowedFields: string[];
  contactEmail?: string;
  description?: string;
  allowedDomains?: string[];
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  isActive: boolean;
}

export default function MallManagementPage() {
  const [malls, setMalls] = useState<Mall[]>([])
  const [filteredMalls, setFilteredMalls] = useState<Mall[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [apiKeyModal, setApiKeyModal] = useState<{
    isOpen: boolean
    apiKey: string
    mallName: string
    expiresAt: string
    isReissue: boolean
  }>({
    isOpen: false,
    apiKey: '',
    mallName: '',
    expiresAt: '',
    isReissue: false
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [emailFilter, setEmailFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)
  const [newMall, setNewMall] = useState({
    mallName: '',
    allowedFields: [] as string[],
    contactEmail: '',
    description: '',
    allowedDomains: [] as string[],
    sendEmailImmediately: true
  })
  const [emailError, setEmailError] = useState("")

  const fieldOptions = [
    { id: 'name', label: '이름' },
    { id: 'phone', label: '휴대폰번호' },
    { id: 'address', label: '주소' },
    { id: 'email', label: '이메일' }
  ]

  useEffect(() => {
    loadMalls()
  }, [])

  useEffect(() => {
    filterMalls()
  }, [malls, searchTerm, emailFilter, statusFilter])

  const loadMalls = async () => {
    try {
      const response = await fetch('/api/register-mall')
      const data = await response.json()
      if (data.success) {
        setMalls(data.malls)
      }
    } catch (error) {
      console.error('쇼핑몰 목록 로드 오류:', error)
    }
  }

  const filterMalls = () => {
    let filtered = malls

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(mall =>
        mall.mallName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mall.mallId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mall.contactEmail && mall.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 이메일 발송 상태 필터
    if (emailFilter !== "all") {
      if (emailFilter === "sent") {
        filtered = filtered.filter(mall => mall.emailSent)
      } else if (emailFilter === "pending") {
        filtered = filtered.filter(mall => !mall.emailSent && mall.contactEmail)
      } else if (emailFilter === "no-email") {
        filtered = filtered.filter(mall => !mall.contactEmail)
      }
    }

    // 활성 상태 필터
    if (statusFilter !== "all") {
      filtered = filtered.filter(mall => 
        statusFilter === "active" ? mall.isActive : !mall.isActive
      )
    }

    setFilteredMalls(filtered)
    setCurrentPage(1) // 필터 변경 시 첫 페이지로
  }

  // 이메일 유효성 검사 함수
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("")
      return true
    }
    
    // 기본 이메일 정규식 (d@n.n 형태도 허용)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{1,}$/
    if (!emailRegex.test(email)) {
      setEmailError("이메일 형식이 올바르지 않습니다.")
      return false
    }
    
    setEmailError("")
    return true
  }

  const handleRegisterMall = async () => {
    try {
      // 이메일 유효성 검사
      if (newMall.contactEmail && newMall.contactEmail.trim()) {
        if (!validateEmail(newMall.contactEmail)) {
          return;
        }
      }

      // 허용 도메인 검증
      if (newMall.allowedDomains.length === 0) {
        alert('최소 하나 이상의 허용 도메인을 입력해주세요.');
        return;
      }

      // 빈 도메인 체크
      const emptyDomains = newMall.allowedDomains.filter(domain => !domain.trim());
      if (emptyDomains.length > 0) {
        alert('빈 도메인이 있습니다. 모든 도메인을 입력해주세요.');
        return;
      }

      const response = await fetch('/api/register-mall', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin_secret_key_12345'
        },
        body: JSON.stringify({
          mallName: newMall.mallName,
          requiredFields: newMall.allowedFields,
          contactEmail: newMall.contactEmail,
          description: newMall.description,
          allowedDomains: newMall.allowedDomains
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // 이메일이 입력되고 즉시 발송이 체크된 경우 API Key 자동 발송
        if (newMall.contactEmail && newMall.contactEmail.trim() && newMall.sendEmailImmediately) {
          try {
            const emailResponse = await fetch('/api/send-apikey', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toEmail: newMall.contactEmail,
                mallName: newMall.mallName,
                mallId: result.mallId,
                apiKey: result.apiKey,
                allowedFields: result.allowedFields
              })
            })
            
            if (emailResponse.ok) {
              // 이메일 발송 상태 업데이트
              await fetch('/api/update-email-status', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin_secret_key_12345'
                },
                body: JSON.stringify({
                  mallId: result.mallId,
                  emailSent: true
                })
              })
              
              alert(`쇼핑몰 등록 완료!\n\n📧 ${newMall.contactEmail}로 연동 정보를 발송했습니다.`)
            } else {
              alert(`쇼핑몰 등록 완료!\n\n⚠️ 이메일 발송에 실패했습니다. 쇼핑몰 목록에서 수동으로 발송해주세요.`)
            }
          } catch (emailError) {
            alert(`쇼핑몰 등록 완료!\n\n⚠️ 이메일 발송 중 오류가 발생했습니다. 쇼핑몰 목록에서 수동으로 발송해주세요.`)
          }
        } else if (newMall.contactEmail && newMall.contactEmail.trim()) {
          setApiKeyModal({
            isOpen: true,
            apiKey: result.apiKey,
            mallName: newMall.mallName,
            expiresAt: result.expiresAt,
            isReissue: false
          })
        } else {
          setApiKeyModal({
            isOpen: true,
            apiKey: result.apiKey,
            mallName: newMall.mallName,
            expiresAt: result.expiresAt,
            isReissue: false
          })
        }
        
        setIsDialogOpen(false)
        setNewMall({ mallName: '', allowedFields: [], contactEmail: '', description: '', allowedDomains: [], sendEmailImmediately: true })
        loadMalls()
      } else {
        const error = await response.json()
        alert(`등록 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('쇼핑몰 등록 오류:', error)
      alert('등록 중 오류가 발생했습니다.')
    }
  }

  const handleSendEmail = async (mall: Mall) => {
    // API Key가 Firebase에 저장되지 않으므로 수동 이메일 발송 불가능
    alert('API Key가 환경변수로만 관리되므로 수동 이메일 발송이 불가능합니다.\n등록/재발급 시에만 이메일 발송이 가능합니다.')
  }

  const handleFieldChange = (fieldId: string, checked: boolean) => {
    if (checked) {
      setNewMall(prev => ({
        ...prev,
        allowedFields: [...prev.allowedFields, fieldId]
      }))
    } else {
      setNewMall(prev => ({
        ...prev,
        allowedFields: prev.allowedFields.filter(f => f !== fieldId)
      }))
    }
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredMalls.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMalls = filteredMalls.slice(startIndex, endIndex)

  const getEmailStatusBadge = (mall: Mall) => {
    if (!mall.contactEmail) {
      return <Badge variant="secondary" className="text-xs"><MailX className="h-3 w-3 mr-1" />이메일 없음</Badge>
    }
    if (mall.emailSent) {
      return <Badge variant="default" className="text-xs bg-green-500"><MailCheck className="h-3 w-3 mr-1" />발송완료</Badge>
    }
    return <Badge variant="destructive" className="text-xs"><Mail className="h-3 w-3 mr-1" />미발송</Badge>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="text-center">
                <h1 className="text-lg font-bold text-primary">SSDM</h1>
                <p className="text-xs text-muted-foreground">개인정보보호</p>
              </div>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h2 className="text-lg font-semibold text-foreground">쇼핑몰 관리</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
              대시보드
            </Link>
            <Link href="/delivery-test" className="text-sm text-muted-foreground hover:text-foreground">
              택배사 테스트
            </Link>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>관리자</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* 컨트롤 영역 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="쇼핑몰명, ID, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-white"
              />
            </div>
            
            <Select value={emailFilter} onValueChange={setEmailFilter}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="sent">발송완료</SelectItem>
                <SelectItem value="pending">미발송</SelectItem>
                <SelectItem value="no-email">이메일없음</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                쇼핑몰 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>새 쇼핑몰 등록</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mallName">쇼핑몰 이름</Label>
                  <Input
                    id="mallName"
                    value={newMall.mallName}
                    onChange={(e) => setNewMall(prev => ({ ...prev, mallName: e.target.value }))}
                    placeholder="예: 북스토어"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactEmail">담당자 이메일 (선택)</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={newMall.contactEmail}
                    onChange={(e) => {
                      setNewMall(prev => ({ ...prev, contactEmail: e.target.value }))
                      // 실시간 이메일 유효성 검사
                      if (e.target.value) {
                        validateEmail(e.target.value)
                      } else {
                        setEmailError("")
                      }
                    }}
                    onBlur={() => {
                      if (newMall.contactEmail) {
                        validateEmail(newMall.contactEmail)
                      }
                    }}
                    placeholder="cs@bookstore.com"
                    className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-primary focus:ring-primary"}
                  />
                  {emailError && (
                    <p className="text-sm text-red-600 mt-1">{emailError}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="allowedDomains">허용 도메인 (필수)</Label>
                  <div className="space-y-2">
                    {newMall.allowedDomains.length === 0 && (
                      <div className="text-sm text-gray-500">
                        허용 도메인을 추가해주세요.
                      </div>
                    )}
                    {newMall.allowedDomains.map((domain, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={domain}
                          onChange={(e) => {
                            const newDomains = [...newMall.allowedDomains]
                            newDomains[index] = e.target.value
                            setNewMall(prev => ({ ...prev, allowedDomains: newDomains }))
                          }}
                          onBlur={(e) => {
                            // URL에서 도메인 자동 추출
                            const extractDomain = (input: string) => {
                              try {
                                // URL 형태인지 확인하고 도메인 추출
                                if (input.includes('://')) {
                                  const url = new URL(input)
                                  return url.host
                                }
                                // 프로토콜 없이 시작하는 경우 (www.example.com 등)
                                if (input.startsWith('www.') || input.includes('.')) {
                                  return input.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '')
                                }
                                return input
                              } catch {
                                // URL 파싱 실패시 원본 반환
                                return input.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '')
                              }
                            }

                            const extractedDomain = extractDomain(e.target.value.trim())
                            if (extractedDomain !== e.target.value) {
                              const newDomains = [...newMall.allowedDomains]
                              newDomains[index] = extractedDomain
                              setNewMall(prev => ({ ...prev, allowedDomains: newDomains }))
                            }
                          }}
                          placeholder="bookstore.com 또는 https://bookstore.com"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newDomains = newMall.allowedDomains.filter((_, i) => i !== index)
                            setNewMall(prev => ({ ...prev, allowedDomains: newDomains }))
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewMall(prev => ({ ...prev, allowedDomains: [...prev.allowedDomains, ''] }))
                      }}
                    >
                      + 도메인 추가
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    SSDM 연동 후 리다이렉트를 허용할 도메인들입니다. URL 전체를 복사해서 붙여넣어도 자동으로 도메인만 추출됩니다.<br/>
                    (예: bookstore.com, shop.bookstore.com, https://morebooks.vercel.app/)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="description">설명 (선택)</Label>
                  <Input
                    id="description"
                    value={newMall.description}
                    onChange={(e) => setNewMall(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="온라인 서점, 도서 판매"
                  />
                </div>

                {/* 이메일 발송 옵션 - 항상 표시 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendEmailImmediately"
                      checked={newMall.sendEmailImmediately}
                      disabled={!newMall.contactEmail || !newMall.contactEmail.trim()}
                      onCheckedChange={(checked) => 
                        setNewMall(prev => ({ ...prev, sendEmailImmediately: !!checked }))
                      }
                    />
                    <Label 
                      htmlFor="sendEmailImmediately" 
                      className={`text-sm font-medium ${
                        newMall.contactEmail && newMall.contactEmail.trim() 
                          ? 'text-blue-800' 
                          : 'text-gray-400'
                      }`}
                    >
                      등록 완료 후 즉시 API Key 이메일 발송
                    </Label>
                  </div>
                  <p className={`text-xs mt-1 ml-6 ${
                    newMall.contactEmail && newMall.contactEmail.trim() 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                  }`}>
                    {newMall.contactEmail && newMall.contactEmail.trim() 
                      ? '체크 해제 시 나중에 수동으로 발송할 수 있습니다.'
                      : '이메일을 입력하면 자동 발송 옵션이 활성화됩니다.'
                    }
                  </p>
                </div>
                
                <div>
                  <Label>제공 가능한 개인정보</Label>
                  <div className="space-y-2 mt-2">
                    {fieldOptions.map(field => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={newMall.allowedFields.includes(field.id)}
                          onCheckedChange={(checked) => handleFieldChange(field.id, !!checked)}
                        />
                        <Label htmlFor={field.id}>{field.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleRegisterMall}
                  disabled={!newMall.mallName || newMall.allowedFields.length === 0 || !!emailError}
                  className="w-full"
                >
                  등록하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 통계 섹션 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">쇼핑몰 현황</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">전체 쇼핑몰</p>
                  <p className="text-2xl font-bold text-gray-900">{malls.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MailCheck className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">이메일 발송완료</p>
                  <p className="text-2xl font-bold text-gray-900">{malls.filter(m => m.emailSent).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Mail className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">이메일 미발송</p>
                  <p className="text-2xl font-bold text-gray-900">{malls.filter(m => !m.emailSent && m.contactEmail).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <MailX className="h-5 w-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">이메일 없음</p>
                  <p className="text-2xl font-bold text-gray-900">{malls.filter(m => !m.contactEmail).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* 쇼핑몰 목록 섹션 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">등록된 쇼핑몰</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentMalls.map(mall => (
            <Card key={mall.mallId} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{mall.mallName}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {getEmailStatusBadge(mall)}
                    <Badge variant={mall.isActive ? "default" : "secondary"} className="text-xs">
                      {mall.isActive ? '활성' : '비활성'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Mall ID</Label>
                  <p className="font-mono text-sm">{mall.mallId}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">API Key</Label>
                  <p className="text-sm text-gray-600">환경변수로 관리됨</p>
                </div>

                {mall.contactEmail && (
                  <div>
                    <Label className="text-xs text-gray-500">담당자 이메일</Label>
                    <p className="text-sm">{mall.contactEmail}</p>
                  </div>
                )}

                {mall.description && (
                  <div>
                    <Label className="text-xs text-gray-500">설명</Label>
                    <p className="text-sm text-gray-600">{mall.description}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs text-gray-500">제공 정보</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mall.allowedFields.map(field => (
                      <span key={field} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {fieldOptions.find(f => f.id === field)?.label}
                      </span>
                    ))}
                  </div>
                </div>

                {mall.emailSentAt && (
                  <div>
                    <Label className="text-xs text-gray-500">이메일 발송일</Label>
                    <p className="text-xs text-gray-600">{new Date(mall.emailSentAt).toLocaleString('ko-KR')}</p>
                  </div>
                )}
                
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    상세
                  </Button>
                  
                  {mall.contactEmail && !mall.emailSent && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleSendEmail(mall)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      이메일 발송
                    </Button>
                  )}
                  
                  <Button size="sm" variant="outline" className="flex-1">
                    <Key className="h-3 w-3 mr-1" />
                    재발급
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-8">
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
                  className="w-8 h-8"
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
        )}

        {/* 빈 상태 */}
        {filteredMalls.length === 0 && (
          <Card className="mt-6">
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 쇼핑몰이 없습니다</h3>
              <p className="text-gray-500 mb-4">첫 번째 쇼핑몰을 등록해보세요.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                쇼핑몰 등록
              </Button>
            </CardContent>
          </Card>
        )}

      </div>

      {/* API Key 모달 */}
      <ApiKeyModal
        isOpen={apiKeyModal.isOpen}
        onClose={() => setApiKeyModal(prev => ({ ...prev, isOpen: false }))}
        apiKey={apiKeyModal.apiKey}
        mallName={apiKeyModal.mallName}
        expiresAt={apiKeyModal.expiresAt}
        isReissue={apiKeyModal.isReissue}
      />
    </div>
  )
}
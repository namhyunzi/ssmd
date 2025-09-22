"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Key, Trash2, Mail, MailCheck, Settings, Users, Shield, ChevronLeft, ChevronRight, Search, Filter, AlertTriangle, XCircle, AlertOctagon, Clock, X, Ban, AlertCircle, Skull, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  mallId: string;           // 영문 식별자 (키로 사용)
  mallName: string;
  allowedFields: string[];
  allowedDomains?: string[]; // 허용 도메인 목록
  contactEmail?: string;
  description?: string;
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  expiresAt: string;        // API Key 만료일
  isActive: boolean;
}

export default function AdminPage() {
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
  const [dialogMode, setDialogMode] = useState<'create' | 'reissue'>('create')
  const [editingMall, setEditingMall] = useState<Mall | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)
  const [newMall, setNewMall] = useState({
    mallName: '',
    englishId: '',
    allowedFields: [] as string[],
    allowedDomains: [] as string[],
    contactEmail: '',
    description: ''
  })
  const [emailError, setEmailError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

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
  }, [malls, searchTerm, statusFilter])

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
    
    // 기본 이메일 정규식 (dd@n.n 형태도 허용)
    const emailRegex = /^[a-zA-Z0-9._%+-]{2,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{1,}$/
    if (!emailRegex.test(email)) {
      setEmailError("이메일 형식이 올바르지 않습니다.")
      return false
    }
    
    setEmailError("")
    return true
  }

  const handleSubmit = async () => {
    try {
      // 이메일 유효성 검사
      if (newMall.contactEmail && newMall.contactEmail.trim()) {
        if (!validateEmail(newMall.contactEmail)) {
          return;
        }
      }

      // 처리 시작
      setIsProcessing(true)

      if (dialogMode === 'create') {
        await handleCreateMall();
      } else {
        await handleReissueMall();
      }
    } catch (error) {
      console.error('처리 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateMall = async () => {
    const response = await fetch('/api/register-mall', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin_secret_key_12345'
      },
      body: JSON.stringify({
        mallName: newMall.mallName,
        englishId: newMall.englishId,
        requiredFields: newMall.allowedFields,
        allowedDomains: newMall.allowedDomains.filter(domain => domain.trim() !== ''),
        contactEmail: newMall.contactEmail,
        description: newMall.description
      })
    })

    if (response.ok) {
      const result = await response.json()
      
      // 이메일이 입력되고 즉시 발송이 체크된 경우 API Key 자동 발송
      if (newMall.contactEmail && newMall.contactEmail.trim()) {
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
            
            // 상태 업데이트 후 쇼핑몰 목록 새로고침
            await loadMalls()
            
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
            alert('⚠️ 이메일 발송에 실패했습니다. 수동으로 전달해주세요.')
          }
        } catch (emailError) {
          setApiKeyModal({
            isOpen: true,
            apiKey: result.apiKey,
            mallName: newMall.mallName,
            expiresAt: result.expiresAt,
            isReissue: false
          })
          alert('⚠️ 이메일 발송 중 오류가 발생했습니다.')
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
      
      closeDialog()
      loadMalls()
    } else {
      const error = await response.json()
      alert(`등록 실패: ${error.error}`)
    }
  }

  const handleReissueMall = async () => {
    if (!editingMall) return;

    const response = await fetch('/api/reissue-apikey', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin_secret_key_12345'
      },
      body: JSON.stringify({
        mallId: editingMall.mallId,
        contactEmail: newMall.contactEmail,
        description: newMall.description,
        allowedFields: newMall.allowedFields
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      
      // 이메일이 입력되고 즉시 발송이 체크된 경우 API Key 자동 발송
      if (newMall.contactEmail && newMall.contactEmail.trim()) {
        try {
          const emailResponse = await fetch('/api/send-apikey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toEmail: newMall.contactEmail,
              mallName: editingMall.mallName,
              mallId: editingMall.mallId,
              apiKey: result.apiKey,
              allowedFields: newMall.allowedFields
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
                mallId: editingMall.mallId,
                emailSent: true
              })
            })
            
            // 상태 업데이트 후 쇼핑몰 목록 새로고침
            await loadMalls()
            
            setApiKeyModal({
              isOpen: true,
              apiKey: result.apiKey,
              mallName: editingMall.mallName,
              expiresAt: result.expiresAt,
              isReissue: true
            })
          } else {
            setApiKeyModal({
              isOpen: true,
              apiKey: result.apiKey,
              mallName: editingMall.mallName,
              expiresAt: result.expiresAt,
              isReissue: true
            })
            alert('⚠️ 이메일 발송에 실패했습니다. 수동으로 전달해주세요.')
          }
        } catch (emailError) {
          setApiKeyModal({
            isOpen: true,
            apiKey: result.apiKey,
            mallName: editingMall.mallName,
            expiresAt: result.expiresAt,
            isReissue: true
          })
          alert('⚠️ 이메일 발송 중 오류가 발생했습니다.')
        }
      } else if (newMall.contactEmail && newMall.contactEmail.trim()) {
        setApiKeyModal({
          isOpen: true,
          apiKey: result.apiKey,
          mallName: editingMall.mallName,
          expiresAt: result.expiresAt,
          isReissue: true
        })
      } else {
        setApiKeyModal({
          isOpen: true,
          apiKey: result.apiKey,
          mallName: editingMall.mallName,
          expiresAt: result.expiresAt,
          isReissue: true
        })
      }
      
      closeDialog()
      loadMalls()
    } else {
      const error = await response.json()
      alert(`재발급 실패: ${error.error}`)
    }
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setDialogMode('create')
    setEditingMall(null)
    setNewMall({ mallName: '', englishId: '', allowedFields: [], allowedDomains: [], contactEmail: '', description: '' })
    setEmailError("")
  }



  const handleReissueApiKey = (mall: Mall) => {
    setDialogMode('reissue')
    setEditingMall(mall)
    setNewMall({
      mallName: mall.mallName,
      englishId: mall.mallId,  // mallId가 englishId와 동일
      allowedFields: mall.allowedFields,
      allowedDomains: mall.allowedDomains || [],
      contactEmail: mall.contactEmail || '',
      description: mall.description || '',
    })
    setIsDialogOpen(true)
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
            <h2 className="text-lg font-semibold text-foreground">관리자</h2>
          </div>
          
          <div className="flex items-center space-x-4">
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
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setDialogMode('create')
                  setEditingMall(null)
                  setNewMall({ mallName: '', englishId: '', allowedFields: [], allowedDomains: [], contactEmail: '', description: '' })
                  setEmailError("")
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                쇼핑몰 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === 'create' ? '새 쇼핑몰 등록' : 
                   `API Key 재발급 - ${editingMall?.mallName}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mallName">쇼핑몰 이름</Label>
                  <Input
                    id="mallName"
                    value={newMall.mallName}
                    onChange={(e) => setNewMall(prev => ({ ...prev, mallName: e.target.value }))}
                    placeholder="예: 북스토어"
                    disabled={dialogMode === 'reissue'}
                    className={dialogMode === 'reissue' ? 'bg-gray-100' : ''}
                  />
                </div>
                
                <div>
                  <Label htmlFor="englishId">영문 식별자</Label>
                  <Input
                    id="englishId"
                    value={newMall.englishId}
                    onChange={(e) => {
                      // 영문 소문자, 숫자, 하이픈만 허용하고 20자 제한
                      const value = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '') // 허용되지 않은 문자 제거
                        .slice(0, 20); // 20자 제한
                      setNewMall(prev => ({ ...prev, englishId: value }))
                    }}
                    placeholder="예: bookstore"
                    maxLength={20}
                    disabled={dialogMode === 'reissue'}
                    className={dialogMode === 'reissue' ? 'bg-gray-100' : ''}
                  />
                  {dialogMode === 'create' && (
                    <p className="text-xs text-gray-500 mt-1">
                      3-20자, 영문 소문자/숫자/하이픈만 가능 ({newMall.englishId.length}/20)
                    </p>
                  )}
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
                    className={
                      emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : 
                      "focus:border-primary focus:ring-primary"
                    }
                  />
                  {emailError && (
                    <p className="text-sm text-red-600 mt-1">{emailError}</p>
                  )}
                    <p className="text-sm text-blue-600 mt-1">이메일을 입력해주세요.</p>
                  )}
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

                {/* 이메일 발송 옵션 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendEmailImmediately"
                        checked={true}
                        disabled={true}
                        onCheckedChange={() => {}}
                      />
                      <Label 
                        htmlFor="sendEmailImmediately" 
                        className="text-sm font-medium text-gray-500"
                      >
                        {dialogMode === 'create' ? '등록 완료 후 즉시 API Key 이메일 발송 (자동)' : '재발급 완료 후 즉시 API Key 이메일 발송 (자동)'}
                      </Label>
                    </div>
                    <p className={`text-xs mt-1 ml-6 ${
                      newMall.contactEmail && newMall.contactEmail.trim() 
                        ? 'text-blue-600' 
                        : 'text-gray-400'
                    }`}>
                      {newMall.contactEmail && newMall.contactEmail.trim() 
                        ? (dialogMode === 'create' 
                            ? 'API Key가 발급되어 담당자 이메일로 즉시 전송됩니다.'
                            : 'API Key가 재발급되어 담당자 이메일로 즉시 전송됩니다.')
                        : '이메일을 입력하면 자동 발송 옵션이 활성화됩니다.'
                      }
                    </p>
                  </div>
                )}
                
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
                )}

                  <div>
                    <Label>허용 도메인 목록</Label>
                    <p className="text-xs text-gray-500 mb-2">사용자 리디렉션에 허용할 도메인을 추가하세요</p>
                    <div className="space-y-2">
                      {newMall.allowedDomains.map((domain, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={domain}
                            onChange={(e) => {
                              const newDomains = [...newMall.allowedDomains]
                              newDomains[index] = e.target.value
                              setNewMall(prev => ({ ...prev, allowedDomains: newDomains }))
                            }}
                            placeholder="예: example.com"
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
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewMall(prev => ({ 
                            ...prev, 
                            allowedDomains: [...prev.allowedDomains, ''] 
                          }))
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        도메인 추가
                      </Button>
                    </div>
                  </div>
                )}

                
                <Button 
                  onClick={handleSubmit}
                  disabled={
                    isProcessing ||
                    (!newMall.mallName || !newMall.englishId || newMall.allowedFields.length === 0 || 
                      newMall.allowedDomains.filter(domain => domain.trim() !== '').length === 0 || 
                      !newMall.contactEmail || !!emailError)
                  }
                  className="w-full"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>API Key 발급 중...</span>
                    </div>
                  ) : (
                    dialogMode === 'create' ? '등록하기' : 
                    '재발급하기'
                  )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentMalls.map(mall => (
            <Card key={mall.mallId} className="hover:shadow-lg transition-shadow min-w-[400px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{mall.mallName}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const now = new Date();
                      const expiryDate = new Date(mall.expiresAt);
                      const isExpired = expiryDate <= now;
                      
                      return (
                        <Badge 
                          variant={mall.isActive && !isExpired ? "default" : "secondary"} 
                          className={`text-xs ${
                            mall.isActive && !isExpired 
                              ? 'bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {mall.isActive && !isExpired ? '활성' : '비활성'}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 만료 상태 콜아웃 */}
                {(() => {
                  const now = new Date();
                  const expiryDate = new Date(mall.expiresAt);
                  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  
                  if (expiryDate <= now) {
                    return (
                      <Alert className="border-red-200 bg-red-50 mb-4 w-full">
                        <Ban className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <AlertDescription className="text-red-700 flex-1">
                          <strong>API Key가 만료되었습니다!</strong><br />
                          서비스가 중단되었습니다. 즉시 재발급해주세요.
                        </AlertDescription>
                      </Alert>
                    );
                  } else if (expiryDate <= thirtyDaysFromNow) {
                    return (
                      <Alert className="border-amber-200 bg-amber-50 mb-4 w-full">
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <AlertDescription className="text-amber-700 flex-1">
                          <strong>API Key 만료 임박!</strong><br />
                          {Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))}일 후 만료됩니다.
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
                
                <div>
                  <Label className="text-xs text-gray-500">영문명</Label>
                  <p className="font-mono text-sm">{mall.mallId}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">API Key</Label>
                  <p className="text-sm text-gray-600">환경변수로 관리됨</p>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">만료일</Label>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${
                      (() => {
                        const now = new Date();
                        const expiryDate = new Date(mall.expiresAt);
                        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        
                        if (expiryDate <= now) {
                          return 'text-red-500 font-medium'; // 이미 만료됨
                        } else if (expiryDate <= thirtyDaysFromNow) {
                          return 'text-amber-500 font-medium'; // 만료 임박 (30일 이내)
                        } else {
                          return 'text-gray-600'; // 정상
                        }
                      })()
                    }`}>
                      {new Date(mall.expiresAt).toLocaleDateString('ko-KR')}
                    </p>
                    {(() => {
                      const now = new Date();
                      const expiryDate = new Date(mall.expiresAt);
                      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      
                      if (expiryDate <= now) {
                        return (
                          <div className="flex items-center gap-1 text-red-600">
                            <Ban className="h-4 w-4" />
                            <span className="text-xs font-medium">만료됨</span>
                          </div>
                        );
                      } else if (expiryDate <= thirtyDaysFromNow) {
                        return (
                          <div className="flex items-center gap-1 text-amber-500">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">만료임박</span>
                          </div>
                        );
                      } else {
                        return null; // 정상 - 아이콘 없음
                      }
                    })()}
                  </div>
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

                {mall.allowedDomains && mall.allowedDomains.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">허용 도메인</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mall.allowedDomains.map((domain, index) => (
                        <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {mall.emailSentAt && (
                  <div>
                    <Label className="text-xs text-gray-500">이메일 발송일</Label>
                    <p className="text-xs text-gray-600">{new Date(mall.emailSentAt).toLocaleString('ko-KR')}</p>
                  </div>
                )}
                
                <div className="flex space-x-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleReissueApiKey(mall)}
                  >
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
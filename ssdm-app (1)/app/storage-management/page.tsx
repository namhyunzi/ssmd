"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, HardDrive, Cloud, Plus, Trash2, CheckCircle, AlertTriangle, XCircle, Monitor, Usb, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface StorageItem {
  id: string
  name: string
  type: "local" | "cloud" | "device"
  status: "connected" | "warning" | "error"
  icon: any
}

export default function StorageManagementPage() {
  const router = useRouter()
  const [storages, setStorages] = useState<StorageItem[]>([
    {
      id: "1",
      name: "내 컴퓨터",
      type: "local",
      status: "connected",
      icon: HardDrive,
    },
    {
      id: "2",
      name: "구글 드라이브",
      type: "cloud",
      status: "warning",
      icon: Cloud,
    },
    {
      id: "3",
      name: "USB 저장소",
      type: "device",
      status: "warning",
      icon: Usb,
    },
  ])

  // 팝업 관련 상태
  const [showAddStorageModal, setShowAddStorageModal] = useState(false)
  const [selectedAddStorage, setSelectedAddStorage] = useState("")
  const [showGoogleModal, setShowGoogleModal] = useState(false) // 재연결 및 추가용 통합
  const [isConnecting, setIsConnecting] = useState(false)
  const [addGoogleConnected, setAddGoogleConnected] = useState(false) // 팝업 내 구글 연결 상태

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            연결됨
          </Badge>
        )
      case "warning":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            다시 연결 필요
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            연결 안됨
          </Badge>
        )
      default:
        return null
    }
  }

  const handleDeleteStorage = (id: string) => {
    if (storages.length > 1) {
      setStorages(storages.filter((storage) => storage.id !== id))
    }
  }

  const handleReconnectGoogle = () => {
    setShowGoogleModal(true)
    setIsConnecting(true)
    
    setTimeout(() => {
      setStorages(prev => prev.map(storage => 
        storage.id === "2" ? { ...storage, status: "connected" } : storage
      ))
      setIsConnecting(false)
      setShowGoogleModal(false)
    }, 3000)
  }

  const handleAddStorage = () => {
    setShowAddStorageModal(true)
    setSelectedAddStorage("")
  }

  const handleGoogleConnectFromModal = () => {
    // 팝업에서 구글 계정 연결 클릭 시 (추가 저장소용)
    setShowAddStorageModal(false) // 먼저 저장소 추가 팝업 닫기
    setShowGoogleModal(true)      // 구글 연결 모달 열기
    setIsConnecting(true)
    
    setTimeout(() => {
      setIsConnecting(false)
      setAddGoogleConnected(true)
      setShowGoogleModal(false)
      setShowAddStorageModal(true) // 연결 완료 후 저장소 추가 팝업 다시 열기
    }, 3000)
  }

  const handleAddStorageConfirm = () => {
    if (selectedAddStorage) {
      if (selectedAddStorage === "google-drive-add" && addGoogleConnected) {
        // 구글 드라이브 연결된 상태에서 추가
        const newStorage: StorageItem = {
          id: Date.now().toString(),
          name: "구글 드라이브",
          type: "cloud",
          status: "connected",
          icon: Cloud,
        }
        setStorages(prev => [...prev, newStorage])
        setShowAddStorageModal(false)
        setSelectedAddStorage("")
        setAddGoogleConnected(false)
      } else if (selectedAddStorage !== "google-drive-add") {
        // 다른 저장소 추가
        const storageMap = {
          "local-add": { name: "이 컴퓨터", icon: Monitor },
          "usb-add": { name: "USB 저장소", icon: Usb },
        }
        
        const selectedConfig = storageMap[selectedAddStorage as keyof typeof storageMap]
        if (selectedConfig) {
          const newStorage: StorageItem = {
            id: Date.now().toString(),
            name: selectedConfig.name,
            type: selectedAddStorage === "usb-add" ? "device" : "local",
            status: "connected",
            icon: selectedConfig.icon,
          }
          setStorages(prev => [...prev, newStorage])
        }
        
        setShowAddStorageModal(false)
        setSelectedAddStorage("")
      }
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
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">저장소 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storage List */}
            <div className="space-y-3">
              {storages.map((storage) => {
                const IconComponent = storage.icon
                return (
                  <div key={storage.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <IconComponent className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">{storage.name}</p>
                        <div className="mt-1">{getStatusBadge(storage.status)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {storage.status === "warning" && storage.name === "구글 드라이브" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary hover:bg-primary/10"
                          onClick={handleReconnectGoogle}
                        >
                          다시 연결
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={storages.length <= 1}
                        className="text-destructive hover:text-destructive bg-transparent"
                        onClick={() => handleDeleteStorage(storage.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {storages.length === 1 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">현재 연결된 저장소가 1개이므로 삭제할 수 없습니다.</p>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full bg-transparent"
              onClick={handleAddStorage}
            >
              <Plus className="h-4 w-4 mr-2" />
              저장소 추가하기
            </Button>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  취소
                </Button>
              </Link>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90">설정완료</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 구글 연결 모달 */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center space-y-4">
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
                <p className="text-lg font-medium">구글 드라이브에 연결하는 중...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-medium">연결이 완료되었습니다!</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* 구글 연결 모달 - 재연결 및 추가용 통합 */}
      {showGoogleModal && isConnecting && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <h3 className="text-lg font-medium">구글 계정 연결 중...</h3>
              <p className="text-sm text-muted-foreground">
                잠시만 기다려주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 저장소 추가 팝업 */}
      {showAddStorageModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">저장소 추가</h3>
                <button 
                  onClick={() => {
                    setShowAddStorageModal(false)
                    setSelectedAddStorage("")
                    setAddGoogleConnected(false) // 취소 시 구글 연결 상태 롤백
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                추가로 연결할 저장소를 선택해주세요.
              </p>

              <RadioGroup value={selectedAddStorage} onValueChange={setSelectedAddStorage} className="space-y-3">
                {/* 이 컴퓨터 Option */}
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="local-add" id="local-add" />
                  <Monitor className="h-6 w-6 text-primary" />
                  <Label htmlFor="local-add" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">이 컴퓨터</p>
                      <p className="text-sm text-muted-foreground">이 컴퓨터에 저장됩니다</p>
                    </div>
                  </Label>
                </div>

                {/* 구글 드라이브 Option */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="google-drive-add" id="google-drive-add" />
                    <Cloud className="h-6 w-6 text-primary" />
                    <Label htmlFor="google-drive-add" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">구글 드라이브</p>
                          <p className="text-sm text-muted-foreground">구글 드라이브 연동 후 저장됩니다</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {addGoogleConnected && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              연결됨 ✓
                            </Badge>
                          )}
                          {selectedAddStorage === "google-drive-add" && !addGoogleConnected && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              연결 필요
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Google Connect Section - 구글 드라이브 바로 아래 */}
                  {selectedAddStorage === "google-drive-add" && !addGoogleConnected && (
                    <div className="ml-9 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg" style={{ marginTop: '24px' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-orange-800 font-medium">
                          Google 계정을 연결해 저장소를 활성화하세요.
                        </p>
                        <Button 
                          onClick={handleGoogleConnectFromModal}
                          className="bg-primary hover:bg-primary/90 text-white ml-4"
                        >
                          구글 계정 연결
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Google Connected Info - 팝업에서 연결됨 상태 */}
                  {selectedAddStorage === "google-drive-add" && addGoogleConnected && (
                    <div className="ml-9 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg" style={{ marginTop: '24px' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">U</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800">user@gmail.com</p>
                            <p className="text-xs text-green-600">연결된 Google 계정</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 text-sm text-primary border border-border rounded hover:bg-muted/50 bg-transparent">
                          계정 변경
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* USB 저장소 Option */}
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="usb-add" id="usb-add" />
                  <Usb className="h-6 w-6 text-primary" />
                  <Label htmlFor="usb-add" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">USB 저장소</p>
                      <p className="text-sm text-muted-foreground">USB 디바이스에 저장됩니다</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddStorageModal(false)
                    setSelectedAddStorage("")
                    setAddGoogleConnected(false) // 취소 시 구글 연결 상태 롤백
                  }}
                >
                  취소
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddStorageConfirm}
                  disabled={!selectedAddStorage || (selectedAddStorage === "google-drive-add" && !addGoogleConnected)}
                >
                  추가하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

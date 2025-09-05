"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Cloud, Monitor, Check, Usb, Trash2, Shield, Smartphone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { updateStorageMetadata, saveProfileWithMetadata, testEncryptionDecryption } from "@/lib/data-storage"
import { updateUserProfile } from "@/lib/user-profile"
import Link from "next/link"

export default function StorageSetupPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedStorage, setSelectedStorage] = useState("local")
  const [deviceType] = useState<"desktop" | "mobile">("desktop") // This would be detected
  const [googleConnected, setGoogleConnected] = useState(false)
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showAddStorageModal, setShowAddStorageModal] = useState(false)
  const [connectedStorages, setConnectedStorages] = useState<string[]>([])
  const [selectedAddStorage, setSelectedAddStorage] = useState("")
  const [addGoogleConnected, setAddGoogleConnected] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success")

  // 토스트 표시 함수
  const showToastMessage = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000) // 3초 후 자동 숨김
  }

  // Firebase Auth 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        console.log('사용자 정보:', user)
        console.log('Firebase Auth 상태: 연결됨')
        
        // 암호화/복호화 테스트 실행
        console.log('=== 암호화/복호화 테스트 시작 ===')
        const testResult = testEncryptionDecryption()
        console.log('=== 암호화/복호화 테스트 완료 ===', testResult ? '성공' : '실패')
      } else {
        console.log('Firebase Auth 상태: 로그인되지 않음')
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleGoogleConnect = () => {
    setShowGoogleModal(true)
    setIsConnecting(true)
    
    // 시뮬레이션: 3초 후 연결 완료
    setTimeout(() => {
      setIsConnecting(false)
      setGoogleConnected(true)
      setShowGoogleModal(false)
    }, 3000)
  }

  const handleAddStorage = () => {
    setShowAddStorageModal(true)
    setSelectedAddStorage("")
  }

  const handleRemoveStorage = (storageId: string) => {
    setConnectedStorages(prev => prev.filter(id => id !== storageId))
    if (storageId === "google-drive-add") {
      setAddGoogleConnected(false)
    }
  }

  const handleAddStorageConfirm = () => {
    if (selectedAddStorage) {
      if (selectedAddStorage === "google-drive-add") {
        if (addGoogleConnected) {
          // 구글 드라이브가 이미 연결되어 있으면 바로 추가
          setConnectedStorages(prev => [...prev, "google-drive-add"])
          setShowAddStorageModal(false)
          setAddGoogleConnected(false) // 상태 초기화
        } else {
          // 구글 드라이브가 연결되지 않았으면 연결 먼저
          setShowGoogleModal(true)
          setIsConnecting(true)
          
          setTimeout(() => {
            setIsConnecting(false)
            setAddGoogleConnected(true)
            setShowGoogleModal(false)
            // 연결 완료 후 추가 저장소 모달은 유지됨
          }, 3000)
        }
      } else {
        // 다른 저장소는 바로 추가
        setConnectedStorages(prev => [...prev, selectedAddStorage])
        setShowAddStorageModal(false)
      }
    }
  }

  const handleGoogleConnectFromModal = () => {
    // 팝업에서 구글 계정 연결 클릭 시 (추가 저장소용)
    console.log('구글 연결 시작')
    setShowGoogleModal(true)
    setIsConnecting(true)
    
    setTimeout(() => {
      console.log('구글 연결 완료')
      setIsConnecting(false)
      setAddGoogleConnected(true)
      setShowGoogleModal(false)
      // 연결 완료 후 추가 저장소 모달은 유지됨
    }, 3000)
  }

  // 설정완료 버튼 핸들러
  const handleStorageSetupComplete = async () => {
    console.log('=== 설정완료 버튼 클릭 ===')
    console.log('currentUser:', currentUser)
    console.log('selectedStorage:', selectedStorage)
    
    if (!currentUser) {
      console.log('사용자가 로그인되지 않음')
      return
    }

    setIsSaving(true)
    console.log('저장 시작...')
    
    try {
      // 현재는 "이 컴퓨터" 저장만 구현
      if (selectedStorage === "local") {
        // 1. 세션에서 임시 프로필 데이터 가져오기
        const profileData = {
          name: sessionStorage.getItem('temp_profile_name') || '',
          phone: sessionStorage.getItem('temp_profile_phone') || '',
          address: sessionStorage.getItem('temp_profile_address') || '',
          detailAddress: sessionStorage.getItem('temp_profile_detailAddress') || '',
          zipCode: sessionStorage.getItem('temp_profile_zipCode') || '',
          email: sessionStorage.getItem('temp_profile_email') || undefined
        }
        
        console.log('저장할 프로필 데이터:', profileData)
        console.log('임시 데이터 확인:')
        console.log('- name:', sessionStorage.getItem('temp_profile_name'))
        console.log('- phone:', sessionStorage.getItem('temp_profile_phone'))
        console.log('- address:', sessionStorage.getItem('temp_profile_address'))
        console.log('- detailAddress:', sessionStorage.getItem('temp_profile_detailAddress'))
        console.log('- zipCode:', sessionStorage.getItem('temp_profile_zipCode'))
        console.log('- email:', sessionStorage.getItem('temp_profile_email'))
        
        // 2. 로컬 DB에 대칭키로 암호화하여 저장하고 Firebase에 메타데이터 저장
        console.log('saveProfileWithMetadata 호출 시작...')
        const saved = await saveProfileWithMetadata(currentUser, profileData)
        console.log('saveProfileWithMetadata 결과:', saved)
        
        if (saved) {
          console.log('프로필 저장 성공, Firebase 메타데이터 업데이트 시작...')
          
          // 3. Firebase에 프로필 완료 상태 저장 (메타데이터)
          const profileStatus = {
            profileCompleted: true,
            storageType: 'local',
            fragments: 1, // 현재는 조각 1개
            lastUpdated: new Date().toISOString()
          }
          
          const profileUpdated = await updateUserProfile(currentUser, profileStatus)
          console.log('Firebase 프로필 업데이트 결과:', profileUpdated)
          
          // 4. 임시 데이터 정리
          sessionStorage.removeItem('temp_profile_name')
          sessionStorage.removeItem('temp_profile_phone')
          sessionStorage.removeItem('temp_profile_address')
          sessionStorage.removeItem('temp_profile_detailAddress')
          sessionStorage.removeItem('temp_profile_zipCode')
          sessionStorage.removeItem('temp_profile_email')
          
          console.log('저장 완료 - 로컬 DB에 암호화된 데이터 저장, Firebase에 메타데이터 저장')
          
          // 성공 토스트 표시 후 즉시 대시보드로 이동
          showToastMessage("개인정보가 로컬에 암호화되어 안전하게 저장되었습니다.", "success")
          
          // 토스트 표시 후 1초 뒤 대시보드로 이동
          setTimeout(() => {
            console.log('대시보드로 이동...')
            router.push('/dashboard')
          }, 1000)
        } else {
          console.log('프로필 저장 실패')
          throw new Error('프로필 저장 실패')
        }
      } else {
        // 다른 저장소는 아직 구현되지 않음
        console.log('지원되지 않는 저장소 타입:', selectedStorage)
        showToastMessage("현재는 '이 컴퓨터' 저장만 지원됩니다.", "info")
      }
    } catch (error) {
      console.error('설정 오류:', error)
      showToastMessage("설정 중 오류가 발생했습니다.", "error")
    } finally {
      setIsSaving(false)
      console.log('저장 프로세스 완료')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => {
            // 뒤로가기 시 임시 데이터는 유지하고 profile-setup으로 이동
            router.push('/profile-setup')
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
              router.push('/dashboard')
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
            <CardTitle className="text-center text-xl">분산 저장소 설정</CardTitle>
            <p className="text-center text-sm text-muted-foreground">데이터를 안전하게 저장할 위치를 선택해주세요</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storage Options */}
            <RadioGroup value={selectedStorage} onValueChange={setSelectedStorage} className="space-y-4">
              {deviceType === "desktop" ? (
                <>
                  {/* Desktop Options */}
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="local" id="local" />
                    <Monitor className="h-6 w-6 text-primary" />
                    <Label htmlFor="local" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">이 컴퓨터</p>
                        <p className="text-sm text-muted-foreground">이 컴퓨터에 저장됩니다</p>
                      </div>
                    </Label>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                      <RadioGroupItem value="google-drive" id="google-drive" />
                      <Cloud className="h-6 w-6 text-primary" />
                      <Label htmlFor="google-drive" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">구글 드라이브</p>
                            <p className="text-sm text-muted-foreground">구글 드라이브 연동 후 저장됩니다</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {googleConnected && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                연결됨 ✓
                              </Badge>
                            )}
                            {selectedStorage === "google-drive" && !googleConnected && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                연결 필요
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* Google Connect Section */}
                    {selectedStorage === "google-drive" && !googleConnected && (
                      <div className="ml-9 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg" style={{ marginTop: '24px' }}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-orange-800 font-medium">
                            Google 계정을 연결해 저장소를 활성화하세요.
                          </p>
                          <Button 
                            onClick={handleGoogleConnect}
                            className="bg-primary hover:bg-primary/90 text-white ml-4"
                          >
                            구글 계정 연결
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Google Connected Info */}
                    {selectedStorage === "google-drive" && googleConnected && (
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

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="usb" id="usb" />
                    <Usb className="h-6 w-6 text-primary" />
                    <Label htmlFor="usb" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">USB 저장소</p>
                        <p className="text-sm text-muted-foreground">USB 디바이스에 저장됩니다</p>
                      </div>
                    </Label>
                  </div>

                  {/* 추가된 저장소들 표시 */}
                  {connectedStorages.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">추가 저장소</h4>
                      <div className="space-y-3">
                        {connectedStorages.map((storage) => (
                          <div key={storage} className="flex items-center space-x-3 p-4 bg-white border rounded-lg shadow-sm">
                            {storage === "google-drive-add" && <Cloud className="h-6 w-6 text-primary" />}
                            {storage === "local-add" && <Monitor className="h-6 w-6 text-primary" />}
                            {storage === "usb-add" && <Usb className="h-6 w-6 text-primary" />}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {storage === "google-drive-add" && "구글 드라이브"}
                                    {storage === "local-add" && "이 컴퓨터"}
                                    {storage === "usb-add" && "USB 저장소"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {storage === "google-drive-add" && "구글 드라이브 연동 후 저장됩니다"}
                                    {storage === "local-add" && "이 컴퓨터에 저장됩니다"}
                                    {storage === "usb-add" && "USB 디바이스에 저장됩니다"}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    연결됨 ✓
                                  </Badge>
                                  <button
                                    onClick={() => handleRemoveStorage(storage)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                    title="저장소 제거"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Mobile Options */}
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="device" id="device" />
                    <Smartphone className="h-6 w-6 text-primary" />
                    <Label htmlFor="device" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">이 기기 (모바일 저장소)</p>
                        <p className="text-sm text-muted-foreground">기기 내부 저장소에 암호화하여 저장</p>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="google-drive-mobile" id="google-drive-mobile" />
                    <Cloud className="h-6 w-6 text-primary" />
                    <Label htmlFor="google-drive-mobile" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">구글 드라이브</p>
                        <p className="text-sm text-muted-foreground">클라우드 저장소에 암호화하여 저장</p>
                      </div>
                    </Label>
                  </div>
                </>
              )}
            </RadioGroup>

            {/* Security Notice */}
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">보안 안내</p>
                  <p className="text-muted-foreground mt-1">
                    데이터는 암호화되어 저장됩니다. 여러 곳에 저장하면 보안이 강화됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full bg-transparent"
                onClick={handleAddStorage}
              >
                저장소 추가하기
              </Button>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleStorageSetupComplete}
                disabled={isSaving || !currentUser}
              >
                설정
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google Connection Modal */}
      {showGoogleModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[60]" 
          style={{ 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-4">
              {isConnecting ? (
                <>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">구글 계정 연결 중...</h3>
                  <p className="text-sm text-gray-600">잠시만 기다려주세요.</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <Check className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">연결 완료!</h3>
                  <p className="text-sm text-gray-600">구글 드라이브가 성공적으로 연결되었습니다.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Storage Modal */}
      {showAddStorageModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">저장소 추가</h3>
                <button 
                  onClick={() => setShowAddStorageModal(false)}
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
                {!connectedStorages.includes("local-add") && (
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
                )}

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
                {!connectedStorages.includes("usb-add") && (
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
                )}
              </RadioGroup>

              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowAddStorageModal(false)}
                >
                  취소
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleAddStorageConfirm}
                  disabled={
                    !selectedAddStorage || 
                    (selectedAddStorage === "google-drive-add" && !addGoogleConnected)
                  }
                >
                  추가하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg ${
            toastType === "success" ? "bg-green-600 text-white" :
            toastType === "error" ? "bg-red-600 text-white" :
            "bg-blue-600 text-white"
          }`}>
            <div className="text-center">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

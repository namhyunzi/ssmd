"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, updateProfile, updateEmail } from "firebase/auth"
import { getUserProfile } from "@/lib/user-profile"
import { loadProfileFromLocal, saveProfileWithMetadata } from "@/lib/data-storage"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ProfileEditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [emailStep, setEmailStep] = useState<"initial" | "editing" | "verify" | "completed">("initial")
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180) // 3 minutes
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("gmail.com")
  const [fullEmail, setFullEmail] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const isValidEmail = emailUsername.length > 0 && emailDomain.length > 0

  // Firebase Auth 상태 확인 및 개인정보 로드
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        setIsLoading(true)
        
        try {
          // 1. Firebase에서 메타데이터 확인
          const profileMetadata = await getUserProfile(user)
          console.log('프로필 메타데이터:', profileMetadata)
          
          // 2. 로컬에서 실제 개인정보 데이터 로드
          const localProfileData = loadProfileFromLocal()
          console.log('로컬 프로필 데이터:', localProfileData)
          
          if (localProfileData) {
            // 로컬에서 복호화된 개인정보를 각 필드에 설정
            setName(localProfileData.name || "")
            
            // 전화번호 포맷팅 (010-1234-5678 형태)
            const phone = localProfileData.phone || ""
            if (phone && phone.length >= 10) {
              // 숫자만 추출
              const numbers = phone.replace(/\D/g, '')
              if (numbers.length === 11) {
                setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`)
              } else if (numbers.length === 10) {
                setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`)
              } else {
                setPhone(phone)
              }
            } else {
              setPhone(phone)
            }
            
            setAddress(localProfileData.address || "")
            setDetailAddress(localProfileData.detailAddress || "")
            setZipCode(localProfileData.zipCode || "")
          }
          
          // 3. 이메일 정보 설정
          if (user.email) {
            const [username, domain] = user.email.split('@')
            setEmailUsername(username)
            setEmailDomain(domain || 'gmail.com')
            setFullEmail(user.email)
          }
          
        } catch (error) {
          console.error('개인정보 로드 실패:', error)
          toast({
            title: "데이터 로드 실패",
            description: "개인정보를 불러오는 중 오류가 발생했습니다.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      } else {
        // 인증되지 않은 사용자는 메인 페이지(로그인)로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router, toast])

  const handleEmailChange = () => {
    if (emailStep === "initial") {
      setEmailStep("editing")
      // 현재 표시된 이메일을 fullEmail에 설정
      const currentEmail = emailUsername && emailDomain ? `${emailUsername}@${emailDomain}` : "hyunji3556@gmail.com"
      setFullEmail(currentEmail)
    }
  }

  const handleEmailVerification = () => {
    if (emailStep === "editing" && isValidEmail) {
      setEmailStep("verify")
      setTimer(180) // Reset timer
      // Start timer countdown
    } else if (emailStep === "verify" && verificationCode.length === 6) {
      // 인증 완료 후 바로 initial 상태로 돌아감
      setEmailStep("initial")
      setVerificationCode("")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
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
            <CardTitle>개인정보 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">개인정보를 불러오는 중...</div>
              </div>
            ) : (
              <>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input 
                id="name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                이메일<span className="text-red-500">*</span>
              </Label>

              <div className="space-y-3">
                {emailStep === "initial" && (
                  <>
                    <div className="bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {emailUsername && emailDomain ? `${emailUsername}@${emailDomain}` : "hyunji3556@gmail.com"}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={handleEmailChange}
                    >
                      이메일 변경하기
                    </Button>
                  </>
                )}

                {emailStep === "editing" && (
                  <div className="space-y-3">
                    <Input
                      value={fullEmail}
                      onChange={(e) => {
                        const emailValue = e.target.value
                        setFullEmail(emailValue)
                        
                        // 실시간으로 username과 domain 분리하여 유효성 검사용으로 사용
                        const atIndex = emailValue.lastIndexOf('@')
                        if (atIndex > -1) {
                          setEmailUsername(emailValue.substring(0, atIndex))
                          setEmailDomain(emailValue.substring(atIndex + 1))
                        } else {
                          setEmailUsername(emailValue)
                          setEmailDomain("")
                        }
                      }}
                      placeholder="이메일을 입력하세요"
                      className="w-full"
                    />
                    <Button
                      variant="outline"
                      className={`w-full ${
                        isValidEmail 
                          ? "bg-primary text-white hover:bg-primary/90" 
                          : "bg-gray-200 text-gray-500"
                      }`}
                      onClick={handleEmailVerification}
                      disabled={!isValidEmail}
                    >
                      이메일 인증하기
                    </Button>
                  </div>
                )}

                {emailStep === "verify" && (
                  <div className="space-y-3">
                    <div className="bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {emailUsername}@{emailDomain}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                      <div className="relative">
                        <Input
                          placeholder="인증코드 6자리"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          maxLength={6}
                          className="pr-24 bg-white"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <span className="text-red-500 text-sm font-mono">{formatTime(timer)}</span>
                          <button
                            onClick={handleEmailVerification}
                            disabled={verificationCode.length !== 6}
                            className={`text-sm font-medium ${
                              verificationCode.length === 6 
                                ? "text-primary hover:text-primary/80" 
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            확인
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        이메일을 받지 못하셨나요? <button className="text-primary hover:underline">이메일 재전송하기</button>
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">휴대폰 번호</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={phone}
                onChange={(e) => {
                  const value = e.target.value
                  // 숫자만 추출
                  const numbers = value.replace(/\D/g, '')
                  
                  // 포맷팅 적용
                  if (numbers.length <= 3) {
                    setPhone(numbers)
                  } else if (numbers.length <= 7) {
                    setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3)}`)
                  } else if (numbers.length <= 11) {
                    setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`)
                  } else {
                    // 11자리 초과 시 자르기
                    setPhone(`${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`)
                  }
                }}
                placeholder="010-1234-5678"
                maxLength={13}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input 
                id="address" 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="주소를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detailAddress">상세주소</Label>
              <Input 
                id="detailAddress" 
                type="text" 
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                placeholder="상세주소를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">우편번호</Label>
              <Input 
                id="zipCode" 
                type="text" 
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="우편번호를 입력하세요"
              />
            </div>

            <div className="pt-4">
              <Link href="/account-settings/delete" className="text-sm text-muted-foreground hover:text-foreground flex items-center">
                탈퇴하기 <span className="ml-1">&gt;</span>
              </Link>
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
              onClick={async () => {
                try {
                  if (currentUser) {
                    // Firebase Auth 프로필 업데이트 (이름만)
                    if (name) {
                      await updateProfile(currentUser, {
                        displayName: name
                      })
                    }
                    
                    // 로컬에 암호화하여 저장 (전체 개인정보)
                    // 포맷팅된 데이터를 원래 형태로 변환
                    const cleanPhone = phone.replace(/\D/g, '') // 숫자만 추출
                    
                    const profileData = {
                      name,
                      phone: cleanPhone,
                      address,
                      detailAddress,
                      zipCode,
                      email: currentUser.email
                    }
                    
                    // saveProfileWithMetadata 함수를 사용하여 로컬에 암호화하여 저장
                    const saved = await saveProfileWithMetadata(currentUser, profileData)
                    
                    if (!saved) {
                      throw new Error('개인정보 저장 실패')
                    }
                  }
                  router.push('/dashboard')
                } catch (error) {
                  console.error('프로필 저장 실패:', error)
                  toast({
                    title: "저장 실패",
                    description: "프로필 저장 중 오류가 발생했습니다.",
                    variant: "destructive",
                  })
                }
              }}
            >
              완료
            </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

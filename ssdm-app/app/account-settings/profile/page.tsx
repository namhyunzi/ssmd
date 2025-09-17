"use client"

import { useState, useEffect } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, updateProfile } from "firebase/auth"
import { Users } from "@/lib/user-profile"
import { getUserProfile, saveUserProfile } from "@/lib/data-storage"
import Link from "next/link"

// Daum 우편번호 API 타입 정의
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
          userSelectedType: 'R' | 'J';
          bname: string;
          buildingName: string;
          apartment: string;
        }) => void;
      }) => {
        open: () => void;
      };
    };
  }
}

export default function ProfileEditPage() {
  const router = useRouter()
  const [emailStep, setEmailStep] = useState<"initial" | "editing" | "verify">("initial")
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180) // 3 minutes
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("gmail.com")
  const [fullEmail, setFullEmail] = useState("")
  const [newEmail, setNewEmail] = useState("") // 인증 완료된 새 이메일
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  
  // 필드별 오류 상태
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    verificationCode: ""
  })

  // 커스텀 토스트 상태
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastSubMessage, setToastSubMessage] = useState("")

  // 필드 오류 설정 함수
  const setFieldError = (field: keyof typeof fieldErrors, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }))
  }

  // 필드 오류 초기화 함수
  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors(prev => ({ ...prev, [field]: "" }))
  }

  // 이메일 유효성 검사
  const validateEmail = (email: string) => {
    if (!email) {
      setFieldError("email", "꼭 입력해야 해요.")
      return false
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
      return false
    }
    
    // 기존 이메일과 동일한지 확인
    if (email === currentUser?.email) {
      setFieldError("email", "현재 이메일과 동일합니다. 다른 이메일을 입력해주세요.")
      return false
    }
    
    clearFieldError("email")
    return true
  }

  const isValidEmail = emailUsername.length > 0 && emailDomain.length > 0 && !fieldErrors.email
  const isEmailChanged = fullEmail !== currentUser?.email

  // 타이머 관리
  useEffect(() => {
    if (emailStep === "verify" && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setTimerInterval(interval)
      
      return () => clearInterval(interval)
    }
  }, [emailStep, timer])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [timerInterval])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

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
          
          // 2. Firebase에서 개인정보 조회
          const { getUserProfile } = await import('@/lib/data-storage')
          const userProfile = await getUserProfile(user)
          
          if (userProfile) {
            try {
              // Firebase에서 조회한 개인정보 사용
              console.log('Firebase에서 조회한 프로필 데이터:', userProfile)
              
              // 개인정보를 각 필드에 설정
              setName(userProfile.name || "")
              
              // 전화번호 포맷팅 (010-1234-5678 형태)
              const phone = userProfile.phone || ""
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
              
              setAddress(userProfile.address || "")
              setDetailAddress(userProfile.detailAddress || "")
              setZipCode(userProfile.zipCode || "")
            } catch (error) {
              console.error('개인정보 조회 실패:', error)
            }
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
          setToastMessage("데이터 로드 실패")
          setToastSubMessage("개인정보를 불러오는 중 오류가 발생했습니다.")
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        } finally {
          setIsLoading(false)
        }
      } else {
        // 인증되지 않은 사용자는 메인 페이지(로그인)로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleEmailChange = () => {
    if (emailStep === "initial") {
      setEmailStep("editing")
      // 현재 표시된 이메일을 fullEmail에 설정
      const currentEmail = newEmail || currentUser?.email || ""
      setFullEmail(currentEmail)
      // 이메일 입력란 활성화, 인증 버튼 비활성화
    }
  }

  const handleEmailVerification = async () => {
    if (emailStep === "editing") {
      // 이메일 유효성 검사
      if (!validateEmail(fullEmail)) {
        return
      }
      
      try {
        // 인증코드 전송 API 호출
        const response = await fetch('/api/send-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: fullEmail }),
        })
        
        const data = await response.json()
        
        if (response.ok) {
          setEmailStep("verify")
          setTimer(180) // 3분 타이머 시작
          setToastMessage("인증코드가 전송되었습니다.")
          setToastSubMessage("이메일을 확인해주세요.")
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        } else {
          setToastMessage(data.error || "인증코드 전송에 실패했습니다.")
          setToastSubMessage("다시 시도해주세요.")
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        }
      } catch (error) {
        console.error('인증코드 전송 오류:', error)
        setToastMessage("인증코드 전송 중 오류가 발생했습니다.")
        setToastSubMessage("다시 시도해주세요.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } else if (emailStep === "verify") {
      // 인증코드 확인
      if (verificationCode.length !== 6) {
        setFieldError("verificationCode", "인증코드 6자리를 입력해주세요.")
        return
      }
      
      setIsVerifying(true)
      
      try {
        const response = await fetch('/api/verify-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: fullEmail, 
            code: verificationCode 
          }),
        })
        
        const data = await response.json()
        
        if (response.ok) {
          // 인증 성공 - 바뀐 이메일을 상태에 저장
          setNewEmail(fullEmail)
          
          // 초기 상태로 돌아가기 (바뀐 이메일로)
          setEmailStep("initial")
          setVerificationCode("")
          setFullEmail("")
          clearFieldError("email")
          clearFieldError("verificationCode")
        } else {
          setFieldError("verificationCode", data.error || "인증코드가 올바르지 않습니다.")
        }
      } catch (error) {
        console.error('인증코드 확인 오류:', error)
        setFieldError("verificationCode", "인증코드 확인 중 오류가 발생했습니다.")
      } finally {
        setIsVerifying(false)
      }
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: fullEmail }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTimer(180) // 타이머 리셋
        setToastMessage("인증코드가 재전송되었습니다.")
        setToastSubMessage("이메일을 확인해주세요.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } else {
        setToastMessage(data.error || "인증코드 재전송에 실패했습니다.")
        setToastSubMessage("다시 시도해주세요.")
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } catch (error) {
      console.error('인증코드 재전송 오류:', error)
      setToastMessage("인증코드 재전송 중 오류가 발생했습니다.")
      setToastSubMessage("다시 시도해주세요.")
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setIsResending(false)
    }
  }

  // Daum 우편번호 API 주소 찾기 함수
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: function(data) {
          // 도로명 주소와 지번 주소 모두 사용 가능
          let addr = '';
          let extraAddr = '';

          // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다.
          if (data.userSelectedType === 'R') { // 사용자가 도로명 주소를 선택했을 경우
            addr = data.roadAddress;
          } else { // 사용자가 지번 주소를 선택했을 경우(J)
            addr = data.jibunAddress;
          }

          // 사용자가 선택한 주소가 도로명 타입일때 참고항목을 조합한다.
          if(data.userSelectedType === 'R'){
            // 법정동명이 있을 경우 추가한다. (법정리는 제외)
            // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다.
            if(data.bname !== '' && /[동|로|가]$/g.test(data.bname)){
              extraAddr += data.bname;
            }
            // 건물명이 있고, 공동주택일 경우 추가한다.
            if(data.buildingName !== '' && data.apartment === 'Y'){
              extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
            }
            // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
            if(extraAddr !== ''){
              extraAddr = ' (' + extraAddr + ')';
            }
          }

          // 우편번호와 주소 정보를 해당 필드에 넣는다.
          setZipCode(data.zonecode);
          setAddress(addr);
          // 참고항목 문자열이 있을 경우 해당 필드에 넣는다.
          if(extraAddr !== ''){
            setAddress(addr + extraAddr);
          }
        }
      }).open();
    } else {
      alert('우편번호 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Daum 우편번호 API 스크립트 로드 */}
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('Daum 우편번호 API 로드 완료');
        }}
      />
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
                      {newEmail || currentUser?.email}
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
                        
                        // 실시간 유효성 검사
                        if (emailValue) {
                          validateEmail(emailValue)
                        }
                      }}
                      onBlur={() => validateEmail(fullEmail)}
                      placeholder="이메일을 입력하세요"
                      className={`w-full ${
                        fieldErrors.email 
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                          : "focus:border-primary focus:ring-primary"
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-red-600">{fieldErrors.email}</p>
                    )}
                    <Button
                      variant="outline"
                      className={`w-full ${
                        isValidEmail && isEmailChanged
                          ? "bg-primary text-white hover:bg-primary/90" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={handleEmailVerification}
                      disabled={!isValidEmail || !isEmailChanged}
                    >
                      이메일 인증하기
                    </Button>
                  </div>
                )}

                {emailStep === "verify" && (
                  <div className="space-y-3">
                    <div className="bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {fullEmail}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setEmailStep("editing")
                        setVerificationCode("")
                        clearFieldError("verificationCode")
                      }}
                    >
                      이메일 변경하기
                    </Button>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                      <div className="relative">
                        <Input
                          placeholder="인증코드 6자리"
                          value={verificationCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '') // 숫자만 허용
                            if (value.length <= 6) {
                              setVerificationCode(value)
                              if (fieldErrors.verificationCode) {
                                clearFieldError("verificationCode")
                              }
                            }
                          }}
                          maxLength={6}
                          className={`pr-24 bg-white ${
                            fieldErrors.verificationCode 
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                              : "focus:border-primary focus:ring-primary"
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <span className="text-red-500 text-sm font-mono">{formatTime(timer)}</span>
                          <button
                            onClick={handleEmailVerification}
                            disabled={verificationCode.length !== 6 || isVerifying}
                            className={`text-sm font-medium ${
                              verificationCode.length === 6 && !isVerifying
                                ? "text-primary hover:text-primary/80" 
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            확인
                          </button>
                        </div>
                      </div>
                      {fieldErrors.verificationCode && (
                        <p className="text-sm text-red-600">{fieldErrors.verificationCode}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        이메일을 받지 못하셨나요? 
                        <button 
                          onClick={handleResendCode}
                          disabled={isResending}
                          className="text-primary hover:underline ml-1"
                        >
                          {isResending ? "재전송 중..." : "이메일 재전송하기"}
                        </button>
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
              <Label>주소</Label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="우편번호"
                    className="flex-1 focus:border-primary focus:ring-primary bg-muted"
                    disabled
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={handleAddressSearch}
                  >
                    주소찾기
                  </Button>
                </div>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="주소"
                  className="focus:border-primary focus:ring-primary bg-muted"
                  disabled
                />
                <Input
                  type="text"
                  placeholder="상세주소 입력"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="focus:border-primary focus:ring-primary"
                />
              </div>
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
                      email: newEmail || currentUser.email // 인증된 새 이메일 또는 기존 이메일
                    }
                    
                    console.log('=== 개인정보 수정 데이터 ===')
                    console.log('사용자 ID:', currentUser.uid)
                    console.log('수정할 개인정보 데이터:', profileData)
                    console.log('새 이메일 여부:', newEmail ? '새 이메일로 변경됨' : '기존 이메일 유지')
                    console.log('========================')
                    
                    // Firebase에 개인정보 저장
                    const saved = await saveUserProfile(currentUser, profileData)
                    
                    if (!saved) {
                      throw new Error('개인정보 저장 실패')
                    }
                  }
                  router.push('/dashboard')
                } catch (error) {
                  console.error('프로필 저장 실패:', error)
                  setToastMessage("저장 실패")
                  setToastSubMessage("프로필 저장 중 오류가 발생했습니다.")
                  setShowToast(true)
                  setTimeout(() => setShowToast(false), 3000)
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

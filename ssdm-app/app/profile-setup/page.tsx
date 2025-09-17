"use client"

import { useState, useEffect } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { saveUserProfile } from "@/lib/data-storage"
import { useToast } from "@/hooks/use-toast"
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

export default function ProfileSetupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [phonePrefix, setPhonePrefix] = useState("010") // 드롭박스 선택값
  const [address, setAddress] = useState("")
  const [detailAddress, setDetailAddress] = useState("")
  const [zipCode, setZipCode] = useState("")
  
  // 이메일 관련 state
  const [emailOption, setEmailOption] = useState("same") // "same" | "different"
  const [emailUsername, setEmailUsername] = useState("")
  const [emailDomain, setEmailDomain] = useState("")
  const [isDomainInputMode, setIsDomainInputMode] = useState(false)
  const [customDomain, setCustomDomain] = useState("")
  const [emailVerificationStep, setEmailVerificationStep] = useState("initial") // "initial" | "code-sent" | "verified"
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  
  // 필드별 오류 상태
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    verificationCode: ""
  })

  // Firebase Auth 상태 확인 및 임시 세션 데이터 복원
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        
        // 임시 세션에서 데이터 복원 (뒤로 버튼으로 돌아온 경우)
        const tempName = sessionStorage.getItem('temp_profile_name')
        const tempPhone = sessionStorage.getItem('temp_profile_phone')
        const tempAddress = sessionStorage.getItem('temp_profile_address')
        const tempDetailAddress = sessionStorage.getItem('temp_profile_detailAddress')
        const tempZipCode = sessionStorage.getItem('temp_profile_zipCode')
        const tempEmail = sessionStorage.getItem('temp_profile_email')
        
        if (tempName) setName(tempName)
        if (tempPhone) {
          // 전화번호에서 지역번호와 나머지 분리
          if (tempPhone.startsWith('010')) {
            setPhonePrefix('010')
            setPhone(tempPhone.substring(3))
          } else if (tempPhone.startsWith('011')) {
            setPhonePrefix('011')
            setPhone(tempPhone.substring(3))
          } else if (tempPhone.startsWith('016')) {
            setPhonePrefix('016')
            setPhone(tempPhone.substring(3))
          } else if (tempPhone.startsWith('017')) {
            setPhonePrefix('017')
            setPhone(tempPhone.substring(3))
          } else if (tempPhone.startsWith('018')) {
            setPhonePrefix('018')
            setPhone(tempPhone.substring(3))
          } else if (tempPhone.startsWith('019')) {
            setPhonePrefix('019')
            setPhone(tempPhone.substring(3))
          }
        }
        if (tempAddress) setAddress(tempAddress)
        if (tempDetailAddress) setDetailAddress(tempDetailAddress)
        if (tempZipCode) setZipCode(tempZipCode)
        
        // 이메일 복원
        if (tempEmail && tempEmail !== user.email) {
          setEmailOption("different")
          const [username, domain] = tempEmail.split('@')
          setEmailUsername(username)
          setEmailDomain(domain)
          setEmailVerificationStep("verified") // 이미 인증된 상태로 복원
        }
        
        console.log('임시 세션 데이터 복원 완료')
      } else {
        // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  // 필드 오류 설정 함수
  const setFieldError = (field: keyof typeof fieldErrors, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }))
  }

  // 필드 오류 초기화 함수
  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors(prev => ({ ...prev, [field]: "" }))
  }

  // 디바운싱된 이메일 검증 (중복 확인 없음)
  const debouncedEmailValidation = (email: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    const newTimer = setTimeout(async () => {
      await validateEmail(email)
    }, 500)
    
    setDebounceTimer(newTimer)
  }

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [timerInterval, debounceTimer])

  // 페이지를 벗어날 때 임시 데이터 정리 (필요시에만)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 브라우저 탭을 닫거나 새로고침할 때
      // 임시 데이터가 있다면 정리
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // 이메일 유효성 검사 (형식만 확인, 중복 확인 없음)
  const validateEmail = async (email: string) => {
    if (!email) {
      setFieldError("email", "꼭 입력해야 해요.")
      return false
    }
    
    // 더 엄격한 이메일 정규식
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
      return false
    }
    
    // 도메인 부분 검증 (최소 d.dd 형태)
    const domain = email.split('@')[1]
    if (domain) {
      // 더 엄격한 도메인 검증: 최소 d.dd 형태 (영문 1개 + 점 + 영문 2개 이상)
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/
      if (!domainRegex.test(domain)) {
        setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
        return false
      }
      
      // 도메인 부분이 최소 d.dd 형태인지 확인
      const parts = domain.split('.')
      if (parts.length < 2) {
        setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
        return false
      }
      
      // 각 부분이 최소 1자 이상인지 확인
      for (const part of parts) {
        if (part.length < 1) {
          setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
          return false
        }
      }
      
      // 마지막 부분(최상위 도메인)이 최소 2자 이상인지 확인
      if (parts[parts.length - 1].length < 2) {
        setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
        return false
      }
    }
    
    clearFieldError("email")
    return true
  }

  // 인증코드 검증
  const validateVerificationCode = (code: string) => {
    if (!code) {
      setFieldError("verificationCode", "인증코드를 입력해주세요.")
      return false
    }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setFieldError("verificationCode", "올바른 인증코드를 입력해주세요.")
      return false
    }
    clearFieldError("verificationCode")
    return true
  }

  // 타이머 시작 함수
  const startTimer = () => {
    // 기존 타이머가 있다면 정리
    if (timerInterval) {
      clearInterval(timerInterval)
    }
    
    setTimer(180) // 3분으로 초기화
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimerInterval(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setTimerInterval(interval)
  }

  // 이메일 재전송 함수
  const handleResendEmail = async () => {
    setIsResending(true)
    setError("")
    
    const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: fullEmail }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // 타이머 재시작
        startTimer()
        setVerificationCode("") // 입력된 코드 초기화
      } else {
        setError(data.error || "이메일 재전송에 실패했습니다.")
      }
    } catch (error) {
      console.error("이메일 재전송 오류:", error)
      setError("이메일 재전송 중 오류가 발생했습니다.")
    } finally {
      setIsResending(false)
    }
  }

  const handleEmailVerification = async () => {
    if (emailVerificationStep === "initial" && emailUsername && (emailDomain || customDomain)) {
      const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
      
      // 이메일 유효성 검사 (형식만 확인)
      if (!(await validateEmail(fullEmail))) {
        return
      }
      
      setIsLoading(true)
      setError("")
      
      try {
        // API를 통해 이메일 발송
        const response = await fetch('/api/send-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: fullEmail }),
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          setEmailVerificationStep("code-sent")
          startTimer()
        } else {
          setError(data.error || "이메일 발송에 실패했습니다.")
        }
      } catch (error) {
        console.error("이메일 발송 오류:", error)
        setError("이메일 발송 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleCodeVerification = async () => {
    // 인증코드 유효성 검사
    if (!validateVerificationCode(verificationCode)) {
      return
    }
    
    setIsVerifying(true)
    setError("")
    
    const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
      
    try {
      // API를 통해 인증코드 검증
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
      
      if (response.ok && data.success) {
        setEmailVerificationStep("verified")
        setError("")
        clearFieldError("verificationCode")
      } else {
        setFieldError("verificationCode", data.error || "인증에 실패했습니다.")
      }
    } catch (error) {
      console.error("인증코드 검증 오류:", error)
      setError("인증 처리 중 오류가 발생했습니다.")
    } finally {
      setIsVerifying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 핸드폰 번호 포맷팅 함수 (8자리 뒷자리만 입력)
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 길이에 따라 포맷팅 (8자리 뒷자리만)
    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 8) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}`;
    }
  };

  // 핸드폰 번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };


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
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => {
 // 임시 세션 삭제
            router.push('/dashboard')
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
 // 임시 세션 삭제
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
            <CardTitle className="text-center text-xl">개인정보 입력</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              필요한 정보만 입력해주세요. 여러 서비스에서 편리하게 이용할 수 있습니다
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">휴대폰 번호</Label>
                <div className="flex space-x-2">
                  <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="010">010</SelectItem>
                      <SelectItem value="011">011</SelectItem>
                      <SelectItem value="016">016</SelectItem>
                      <SelectItem value="017">017</SelectItem>
                      <SelectItem value="018">018</SelectItem>
                      <SelectItem value="019">019</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={9}
                    className="flex-1 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>이메일</Label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <RadioGroup value={emailOption} onValueChange={setEmailOption} className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="same" id="same-email" />
                      <Label htmlFor="same-email">계정 이메일과 동일</Label>
                    </div>
                    {emailOption === "same" && (
                      <div className="relative">
                        <Input
                          value={currentUser?.email || ''}
                          disabled
                          className="bg-muted cursor-not-allowed pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="different" id="different-email" />
                      <Label htmlFor="different-email">다른 이메일 사용</Label>
                    </div>
                    {emailOption === "different" && (
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <Input
                            type="text"
                            placeholder="이메일"
                            value={emailUsername}
                            onChange={(e) => {
                              setEmailUsername(e.target.value)
                              // 실시간 검증 (디바운싱 적용)
                              if (e.target.value) {
                                if (emailDomain || customDomain) {
                                  const fullEmail = `${e.target.value}@${isDomainInputMode ? customDomain : emailDomain}`
                                  // 즉시 형식 검사
                                  validateEmail(fullEmail)
                                  // 디바운싱된 검사
                                  debouncedEmailValidation(fullEmail)
                                } else {
                                  // 도메인이 선택되지 않은 경우 형식 오류 표시
                                  setFieldError("email", "이메일 주소 형식에 맞게 입력해 주세요.")
                                }
                              } else if (fieldErrors.email) {
                                clearFieldError("email")
                              }
                            }}
                            onBlur={() => {
                              if (!emailUsername) {
                                setFieldError("email", "꼭 입력해야 해요.")
                              } else if (emailUsername && (emailDomain || customDomain)) {
                                const fullEmail = `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}`
                                validateEmail(fullEmail) // blur에서는 형식만 검사
                              }
                            }}
                            disabled={emailVerificationStep === "verified"}
                            className={`flex-1 ${
                              emailVerificationStep === "verified" 
                                ? "bg-muted cursor-not-allowed" 
                                : fieldErrors.email 
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                                  : "focus:border-primary focus:ring-primary"
                            }`}
                          />
                          <span className="flex items-center text-muted-foreground">@</span>
                          
                          {!isDomainInputMode ? (
                            <Select 
                              value={emailDomain} 
                              onValueChange={(value) => {
                                if (value === "direct") {
                                  setIsDomainInputMode(true)
                                  setEmailDomain("")
                                } else {
                                  setEmailDomain(value)
                                  // 실시간 검증 (디바운싱 적용)
                                  if (emailUsername && value) {
                                    const fullEmail = `${emailUsername}@${value}`
                                    // 즉시 형식 검사
                                    validateEmail(fullEmail)
                                    // 디바운싱된 검사
                                    debouncedEmailValidation(fullEmail)
                                  } else if (fieldErrors.email) {
                                    clearFieldError("email")
                                  }
                                }
                              }} 
                              disabled={emailVerificationStep === "verified"}
                            >
                              <SelectTrigger className={`w-40 ${
                                emailVerificationStep === "verified" 
                                  ? "bg-muted cursor-not-allowed" 
                                  : fieldErrors.email 
                                    ? "border-red-500 focus:border-red-500" 
                                    : ""
                              }`}>
                                <SelectValue placeholder="선택해주세요" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gmail.com">gmail.com</SelectItem>
                                <SelectItem value="naver.com">naver.com</SelectItem>
                                <SelectItem value="knou.ac.kr">knou.ac.kr</SelectItem>
                                <SelectItem value="direct">직접입력</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="relative w-40">
                              <Input
                                type="text"
                                placeholder="입력해주세요"
                                value={customDomain}
                                onChange={(e) => {
                                  setCustomDomain(e.target.value)
                                  // 실시간 검증 (디바운싱 적용)
                                  if (emailUsername && e.target.value) {
                                    const fullEmail = `${emailUsername}@${e.target.value}`
                                    // 즉시 형식 검사
                                    validateEmail(fullEmail)
                                    // 디바운싱된 검사
                                    debouncedEmailValidation(fullEmail)
                                  } else if (fieldErrors.email) {
                                    clearFieldError("email")
                                  }
                                }}
                                onBlur={() => {
                                  if (emailUsername && customDomain) {
                                    const fullEmail = `${emailUsername}@${customDomain}`
                                    validateEmail(fullEmail) // blur에서는 형식만 검사
                                  }
                                }}
                                disabled={emailVerificationStep === "verified"}
                                className={`w-full pr-8 ${
                                  emailVerificationStep === "verified" 
                                    ? "bg-muted cursor-not-allowed" 
                                    : fieldErrors.email 
                                      ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                                      : "focus:border-primary focus:ring-primary"
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDomainInputMode(false)
                                  setCustomDomain("")
                                  if (fieldErrors.email) {
                                    clearFieldError("email")
                                  }
                                }}
                                disabled={emailVerificationStep === "verified"}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 에러 메시지 표시 */}
                        {error && (
                          <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start space-x-2">
                            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                          </div>
                        )}
                        {fieldErrors.email && (
                          <p className="text-sm text-red-600">{fieldErrors.email}</p>
                        )}

                        <Button
                          variant="outline"
                          className={`w-full ${
                            emailVerificationStep === "initial" && emailUsername && (emailDomain || customDomain) && !isLoading
                              ? "bg-primary hover:bg-primary/90 text-white"
                              : emailVerificationStep === "code-sent"
                                ? "bg-gray-200 text-gray-500"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-500"
                          }`}
                          onClick={handleEmailVerification}
                          disabled={emailVerificationStep !== "initial" || !emailUsername || (!emailDomain && !customDomain) || isLoading || !!fieldErrors.email}
                        >
                          {emailVerificationStep === "initial" && "이메일 인증하기"}
                          {emailVerificationStep === "code-sent" && "이메일 인증하기"}
                          {emailVerificationStep === "verified" && "이메일 인증 완료"}
                        </Button>

                        {emailVerificationStep === "code-sent" && (
                          <div className="space-y-3 pt-4">
                            <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="인증코드 6자리"
                                value={verificationCode}
                                onChange={(e) => {
                                  // 숫자만 입력 허용하고 6자리 제한
                                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                                  setVerificationCode(value)
                                  if (fieldErrors.verificationCode) {
                                    clearFieldError("verificationCode")
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // 숫자, 백스페이스, 삭제, 탭, 화살표 키만 허용
                                  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
                                  if (!allowedKeys.includes(e.key) && !/[0-9]/.test(e.key)) {
                                    e.preventDefault()
                                  }
                                }}
                                maxLength={6}
                                className="pr-24 bg-white focus:border-primary focus:ring-primary"
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                                <span className="text-red-500 text-sm font-mono">{formatTime(timer)}</span>
                                <button
                                  onClick={handleCodeVerification}
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
                                onClick={handleResendEmail}
                                disabled={isResending}
                                className={`ml-1 ${
                                  isResending
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-primary hover:underline"
                                }`}
                              >
                                이메일 재전송하기
                              </button>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>
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

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-transparent"
                onClick={() => {
 // 임시 세션 삭제
                  router.push('/dashboard')
                }}
              >
                다음에 하기
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={async () => {
                  if (!currentUser) return
                  
                  try {
                    // 개인정보를 Firebase에 직접 저장
                    const phoneSuffix = phone.replace(/\D/g, '')
                    const fullPhone = phoneSuffix ? phonePrefix + phoneSuffix : "" // 핸드폰 번호가 없으면 빈 문자열
                    const email = emailOption === "same" ? currentUser?.email : 
                                 (emailOption === "different" && emailVerificationStep === "verified") ? 
                                 `${emailUsername}@${isDomainInputMode ? customDomain : emailDomain}` : currentUser?.email
                    
                    const profileData = {
                      name: name,
                      phone: fullPhone,
                      address: address,
                      detailAddress: detailAddress,
                      zipCode: zipCode,
                      email: email
                    }
                    
                    const success = await saveUserProfile(currentUser, profileData)
                    
                    if (success) {
                      console.log('Firebase에 개인정보 저장 완료')
                      // 분산저장소 설정 페이지로 이동
                      router.push('/storage-setup')
                    } else {
                      alert('개인정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
                    }
                    
                  } catch (error) {
                    console.error('개인정보 저장 오류:', error)
                    alert('개인정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
                  }
                }}
                disabled={
                  !currentUser ||
                  (emailOption === "different" && emailVerificationStep !== "verified")
                }
              >
                저장 후 계속
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">개인정보 보호</p>
                  <p className="text-muted-foreground mt-1">
                    개인정보는 암호화되어 안전하게 보관되며, 제공 시에는 본인의 동의가 필요합니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
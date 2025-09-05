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
import { updateUserProfile } from "@/lib/user-profile"
import { saveProfileWithMetadata, loadProfileFromLocal } from "@/lib/data-storage"
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
  const [emailVerificationStep, setEmailVerificationStep] = useState("initial") // "initial" | "code-sent" | "verified"
  const [verificationCode, setVerificationCode] = useState("")
  const [timer, setTimer] = useState(180)

  // Firebase Auth 상태 확인 및 로컬 데이터 로드
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        
        // 1. 먼저 임시 저장된 데이터 확인 (뒤로가기 시)
        const tempName = sessionStorage.getItem('temp_profile_name')
        const tempPhone = sessionStorage.getItem('temp_profile_phone')
        const tempAddress = sessionStorage.getItem('temp_profile_address')
        const tempDetailAddress = sessionStorage.getItem('temp_profile_detailAddress')
        const tempZipCode = sessionStorage.getItem('temp_profile_zipCode')
        const tempEmail = sessionStorage.getItem('temp_profile_email')
        
        if (tempName || tempPhone || tempAddress || tempDetailAddress || tempZipCode || tempEmail) {
          // 임시 데이터가 있으면 임시 데이터 로드
          setName(tempName || '')
          // 핸드폰 번호 분리: 앞 3자리와 뒷자리 (8자리)
          console.log('임시 핸드폰 번호:', tempPhone)
          if (tempPhone && tempPhone.length >= 3) {
            const prefix = tempPhone.substring(0, 3)
            const suffix = tempPhone.substring(3)
            console.log('분리된 번호 - 앞:', prefix, '뒤:', suffix)
            setPhonePrefix(prefix) // 앞 3자리
            setPhone(formatPhoneNumber(suffix)) // 뒷자리 8자리 포맷팅
          } else {
            setPhonePrefix("010") // 기본값
            setPhone('')
          }
          setAddress(tempAddress || '')
          setDetailAddress(tempDetailAddress || '')
          setZipCode(tempZipCode || '')
          
          // 이메일 설정
          if (tempEmail && tempEmail !== user.email) {
            setEmailOption("different")
            const [username, domain] = tempEmail.split('@')
            setEmailUsername(username || '')
            setEmailDomain(domain || '')
            setEmailVerificationStep("verified")
          } else {
            setEmailOption("same")
          }
        } else {
          // 2. 임시 데이터가 없으면 기존 저장된 프로필 데이터 로드
          const localData = loadProfileFromLocal()
          if (localData && localData.profile) {
            const profile = localData.profile
            setName(profile.name || '')
            // 핸드폰 번호 분리: 앞 3자리와 뒷자리 (8자리)
            if (profile.phone && profile.phone.length >= 3) {
              setPhonePrefix(profile.phone.substring(0, 3)) // 앞 3자리
              setPhone(formatPhoneNumber(profile.phone.substring(3))) // 뒷자리 8자리 포맷팅
            } else {
              setPhonePrefix("010") // 기본값
              setPhone('')
            }
            setAddress(profile.address || '')
            setDetailAddress(profile.detailAddress || '')
            setZipCode(profile.zipCode || '')
          }
        }
      } else {
        // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
        router.push('/')
      }
    })

    return () => unsubscribe()
  }, [router])

  // 페이지를 벗어날 때 임시 데이터 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 브라우저 탭을 닫거나 새로고침할 때
      clearTempData()
    }

    const handleRouteChange = () => {
      // 다른 페이지로 이동할 때 (뒤로가기 제외)
      clearTempData()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleEmailVerification = () => {
    if (emailVerificationStep === "initial") {
      setEmailVerificationStep("code-sent")
    } else if (emailVerificationStep === "code-sent" && verificationCode.length === 6) {
      setEmailVerificationStep("verified")
    }
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

  // 임시 sessionStorage 정리 함수
  const clearTempData = () => {
    sessionStorage.removeItem('temp_profile_name')
    sessionStorage.removeItem('temp_profile_phone')
    sessionStorage.removeItem('temp_profile_address')
    sessionStorage.removeItem('temp_profile_detailAddress')
    sessionStorage.removeItem('temp_profile_zipCode')
    sessionStorage.removeItem('temp_profile_email')
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
            clearTempData() // 임시 데이터 정리
            router.push('/dashboard')
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
              clearTempData() // 임시 데이터 정리
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
                            onChange={(e) => setEmailUsername(e.target.value)}
                            disabled={emailVerificationStep === "verified"}
                            className={`flex-1 focus:border-primary focus:ring-primary ${
                              emailVerificationStep === "verified" ? "bg-muted cursor-not-allowed" : ""
                            }`}
                          />
                          <span className="flex items-center text-muted-foreground">@</span>
                          <Select value={emailDomain} onValueChange={setEmailDomain} disabled={emailVerificationStep === "verified"}>
                            <SelectTrigger className={`w-32 ${
                              emailVerificationStep === "verified" ? "bg-muted cursor-not-allowed" : ""
                            }`}>
                              <SelectValue placeholder="선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gmail.com">gmail.com</SelectItem>
                              <SelectItem value="naver.com">naver.com</SelectItem>
                              <SelectItem value="knou.ac.kr">knou.ac.kr</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="outline"
                          className={`w-full ${
                            emailVerificationStep === "initial" && emailUsername && emailDomain
                              ? "bg-primary hover:bg-primary/90 text-white"
                              : emailVerificationStep === "code-sent"
                                ? "bg-gray-200 text-gray-500"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-500"
                          }`}
                          onClick={handleEmailVerification}
                          disabled={emailVerificationStep !== "initial" || !emailUsername || !emailDomain}
                        >
                          {emailVerificationStep === "initial" && "이메일 인증하기"}
                          {emailVerificationStep === "code-sent" && "이메일 인증하기"}
                          {emailVerificationStep === "verified" && "이메일 인증 완료"}
                        </Button>

                        {emailVerificationStep === "code-sent" && (
                          <div className="space-y-3 pt-4">
                            <p className="text-sm text-muted-foreground">이메일로 받은 인증코드를 입력해주세요.</p>
                            <div className="flex space-x-2 items-center">
                              <Input
                                type="text"
                                placeholder="인증코드 6자리"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                                className="flex-1 focus:border-primary focus:ring-primary"
                              />
                              <span className="text-red-500 text-sm font-mono min-w-[50px]">
                                {Math.floor(timer / 60)
                                  .toString()
                                  .padStart(2, "0")}
                                :{(timer % 60).toString().padStart(2, "0")}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEmailVerification}
                                disabled={verificationCode.length !== 6}
                                className="whitespace-nowrap"
                              >
                                확인
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              이메일을 받지 못하셨나요? <button className="text-primary hover:underline">이메일 재전송하기</button>
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
                  clearTempData() // 임시 데이터 정리
                  router.push('/dashboard')
                }}
              >
                다음에 하기
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  // 임시로 sessionStorage에 데이터 저장 (실제 저장은 분산저장소 설정에서)
                  sessionStorage.setItem('temp_profile_name', name)
                  // 핸드폰 번호: 드롭박스 선택값 + 입력한 뒷자리 (대시 제거, 8자리)
                  const phoneSuffix = phone.replace(/\D/g, '')
                  const fullPhone = phonePrefix + phoneSuffix
                  sessionStorage.setItem('temp_profile_phone', fullPhone)
                  sessionStorage.setItem('temp_profile_address', address)
                  sessionStorage.setItem('temp_profile_detailAddress', detailAddress)
                  sessionStorage.setItem('temp_profile_zipCode', zipCode)
                  
                  const email = emailOption === "same" ? currentUser?.email : 
                               (emailOption === "different" && emailVerificationStep === "verified") ? 
                               `${emailUsername}@${emailDomain}` : undefined
                  if (email) {
                    sessionStorage.setItem('temp_profile_email', email)
                  }
                  
                  router.push('/storage-setup')
                }}
                disabled={
                  !currentUser ||
                  (!name && 
                  !phone && 
                  !detailAddress &&
                  emailOption === "different" && emailVerificationStep !== "verified")
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
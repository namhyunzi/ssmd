"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordNewPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isChanging, setIsChanging] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")

  // 실시간 비밀번호 유효성 검사
  const validatePasswordRealtime = (password: string) => {
    if (!password) {
      setPasswordError("필수 입력 항목입니다.")
      return false
    }
    
    if (password.length < 8) {
      setPasswordError("비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다.")
      return false
    }
    
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    if (!hasLetter || !hasNumber) {
      setPasswordError("비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다.")
      return false
    }
    
    setPasswordError("")
    return true
  }

  // 실시간 비밀번호 확인 검사
  const validateConfirmPasswordRealtime = (password: string, confirm: string) => {
    if (!confirm) {
      setConfirmPasswordError("비밀번호 확인을 입력해주세요.")
      return false
    }
    
    if (password !== confirm) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.")
      return false
    }
    
    setConfirmPasswordError("")
    return true
  }

  // 비밀번호 유효성 검사 (회원가입 페이지와 동일한 규칙)
  const validatePassword = (password: string) => {
    if (!password) {
      setErrorMessage("필수 입력 항목입니다.")
      return false
    }
    
    if (password.length < 8) {
      setErrorMessage("비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다.")
      return false
    }
    
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    if (!hasLetter || !hasNumber) {
      setErrorMessage("비밀번호는 영문, 숫자를 포함하여 8자 이상이어야 합니다.")
      return false
    }
    
    setErrorMessage("")
    return true
  }

  // 비밀번호 확인 검사
  const validateConfirmPassword = (password: string, confirm: string) => {
    if (!confirm) {
      setErrorMessage("비밀번호 확인을 입력해주세요.")
      return false
    }
    
    if (password !== confirm) {
      setErrorMessage("비밀번호가 일치하지 않습니다.")
      return false
    }
    
    setErrorMessage("")
    return true
  }

  // 비밀번호 변경 처리
  const handlePasswordChange = async () => {
    // 실시간 유효성 검사 실행
    const isPasswordValid = validatePasswordRealtime(newPassword)
    const isConfirmValid = validateConfirmPasswordRealtime(newPassword, confirmPassword)
    
    if (!isPasswordValid || !isConfirmValid) {
      return
    }

    setIsChanging(true)
    
    try {
      const email = sessionStorage.getItem('resetEmail')
      
      if (!email) {
        setErrorMessage("이메일 정보를 찾을 수 없습니다.")
        return
      }

      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          newPassword: newPassword 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // sessionStorage에서 이메일 정보 삭제
        sessionStorage.removeItem('resetEmail')
        alert("비밀번호가 성공적으로 변경되었습니다.")
        window.location.href = "/"
      } else {
        setErrorMessage(data.error || "비밀번호 변경에 실패했습니다.")
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error)
      setErrorMessage("비밀번호 변경 중 오류가 발생했습니다.")
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <Link href="/" className="text-center">
            <h1 className="text-2xl font-bold text-primary">SSDM</h1>
            <p className="text-sm text-muted-foreground">개인정보보호</p>
          </Link>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="새 비밀번호"
              value={newPassword}
              onChange={(e) => {
                const value = e.target.value
                setNewPassword(value)
                // 실시간 유효성 검사
                validatePasswordRealtime(value)
                // 비밀번호 확인도 다시 검사
                if (confirmPassword) {
                  validateConfirmPasswordRealtime(value, confirmPassword)
                }
              }}
              className="w-full focus:border-primary focus:ring-primary"
            />
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}

            <Input
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => {
                const value = e.target.value
                setConfirmPassword(value)
                // 실시간 유효성 검사
                validateConfirmPasswordRealtime(newPassword, value)
              }}
              className="w-full focus:border-primary focus:ring-primary"
            />
            {confirmPasswordError && (
              <p className="text-sm text-red-600">{confirmPasswordError}</p>
            )}

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handlePasswordChange}
              disabled={isChanging}
            >
              비밀번호 변경하기
            </Button>
          </div>

          <div className="text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">
                회원가입 시 입력한 정보가 기억나지 않는다면?
              </p>
              <Link href="/support" className="text-primary hover:underline text-sm">
                고객센터 문의하기(1670-0876)
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

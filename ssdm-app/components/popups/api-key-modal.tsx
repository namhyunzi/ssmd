"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Key, AlertTriangle, FileText } from "lucide-react"

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  apiKey: string
  mallName: string
  expiresAt: string
  isReissue?: boolean
}

export default function ApiKeyModal({ 
  isOpen, 
  onClose, 
  apiKey, 
  mallName, 
  expiresAt,
  isReissue = false
}: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  const handleClose = () => {
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {isReissue ? 'API Key 재발급 완료' : 'API Key 발급 완료'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 쇼핑몰 정보 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">쇼핑몰</span>
                  <Badge variant="outline">{mallName}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">만료일</span>
                  <span className="text-sm text-gray-600">
                    {new Date(expiresAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-gray-50 rounded-md border font-mono text-sm break-all">
                {apiKey}
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-600">복사되었습니다!</p>
            )}
          </div>

          {/* 환경변수 설정 가이드 */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800">
                    환경변수 설정 필요
                  </p>
                  <div className="text-xs text-amber-700 space-y-1">
                    <p>1. .env 파일에 다음 내용 추가:</p>
                    <div className="bg-amber-100 p-2 rounded font-mono text-xs">
                      API_KEY={apiKey}
                    </div>
                    <p>2. 서버 재시작</p>
                    {isReissue && (
                      <p className="font-medium">⚠️ 기존 키는 무효화되었습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 안내 메시지 */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">중요 안내</p>
              <p>
                이 API Key는 이번에만 표시됩니다. 
                복사 후 환경변수에 저장하세요.
              </p>
            </div>
          </div>

          {/* 확인 버튼 */}
          <Button onClick={handleClose} className="w-full">
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


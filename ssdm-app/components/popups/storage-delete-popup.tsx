"use client"

import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StorageDeletePopupProps {
  isOpen: boolean
  onClose: () => void
  storageName: string
}

export default function StorageDeletePopup({ isOpen, onClose, storageName }: StorageDeletePopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-destructive">저장소 삭제</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{storageName}</span>을(를) 삭제하시겠습니까?
            </p>
            <div className="bg-destructive/10 p-3 rounded-lg text-sm">
              <p className="text-destructive font-medium mb-2">삭제 시 주의사항:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• 조각은 다른 저장소로 옮겨진 후 삭제됨</li>
                <li>• 로컬 파일은 사용자 직접 삭제</li>
              </ul>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              취소
            </Button>
            <Button variant="destructive" className="flex-1">
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

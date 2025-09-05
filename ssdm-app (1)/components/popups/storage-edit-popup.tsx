"use client"

import { useState } from "react"
import { Cloud, Monitor, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface StorageEditPopupProps {
  isOpen: boolean
  onClose: () => void
  currentStorage: string
}

export default function StorageEditPopup({ isOpen, onClose, currentStorage }: StorageEditPopupProps) {
  const [selectedStorage, setSelectedStorage] = useState(currentStorage)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>저장소 수정</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-3">
            현재선택: <span className="font-medium">GoogleDrive</span>
          </div>

          <RadioGroup value={selectedStorage} onValueChange={setSelectedStorage} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="local" id="edit-local" />
              <Monitor className="h-5 w-5 text-primary" />
              <Label htmlFor="edit-local" className="flex-1 cursor-pointer">
                이 컴퓨터 (내 문서)
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="google-drive" id="edit-google-drive" />
              <Cloud className="h-5 w-5 text-primary" />
              <Label htmlFor="edit-google-drive" className="flex-1 cursor-pointer">
                구글 드라이브
              </Label>
            </div>
          </RadioGroup>

          <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-800">* 저장 시 기존 교체 및 조각 재분배</div>

          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              취소
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90">저장</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

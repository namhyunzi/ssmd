"use client"

import { useState } from "react"
import { Cloud, Monitor, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface StorageAddPopupProps {
  isOpen: boolean
  onClose: () => void
  deviceType?: "desktop" | "mobile"
}

export default function StorageAddPopup({ isOpen, onClose, deviceType = "desktop" }: StorageAddPopupProps) {
  const [selectedStorage, setSelectedStorage] = useState("")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>저장소 추가하기</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedStorage} onValueChange={setSelectedStorage} className="space-y-3">
            {deviceType === "desktop" ? (
              <>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="local" id="popup-local" />
                  <Monitor className="h-5 w-5 text-primary" />
                  <Label htmlFor="popup-local" className="flex-1 cursor-pointer">
                    이 컴퓨터 (내 문서)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="google-drive" id="popup-google-drive" />
                  <Cloud className="h-5 w-5 text-primary" />
                  <Label htmlFor="popup-google-drive" className="flex-1 cursor-pointer">
                    구글 드라이브
                  </Label>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="device" id="popup-device" />
                  <Smartphone className="h-5 w-5 text-primary" />
                  <Label htmlFor="popup-device" className="flex-1 cursor-pointer">
                    이 기기 (모바일 저장소)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="google-drive-mobile" id="popup-google-drive-mobile" />
                  <Cloud className="h-5 w-5 text-primary" />
                  <Label htmlFor="popup-google-drive-mobile" className="flex-1 cursor-pointer">
                    구글 드라이브
                  </Label>
                </div>
              </>
            )}
          </RadioGroup>

          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              취소
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" disabled={!selectedStorage}>
              추가
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Shield, HardDrive, Cloud, Usb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function StorageAddPopup() {
  const [selectedStorage, setSelectedStorage] = useState("")

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">SSDM</h1>
              <p className="text-sm text-muted-foreground">개인 정보 보호</p>
            </div>
          </div>
          <CardTitle className="text-lg font-semibold">저장소 추가하기</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <RadioGroup value={selectedStorage} onValueChange={setSelectedStorage}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="computer" id="computer" />
              <Label htmlFor="computer" className="flex items-center space-x-2 cursor-pointer">
                <HardDrive className="h-4 w-4" />
                <span>이 컴퓨터 (내 문서)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cloud" id="cloud" />
              <Label htmlFor="cloud" className="flex items-center space-x-2 cursor-pointer">
                <Cloud className="h-4 w-4" />
                <span>클라우드 저장소 연결 (Google Drive, Dropbox…)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="external" id="external" />
              <Label htmlFor="external" className="flex items-center space-x-2 cursor-pointer">
                <Usb className="h-4 w-4" />
                <span>외장 하드/USB</span>
              </Label>
            </div>
          </RadioGroup>

          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1 bg-transparent" asChild>
              <Link href="/storage-management">취소</Link>
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" disabled={!selectedStorage} asChild>
              <Link href="/storage-management">추가</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

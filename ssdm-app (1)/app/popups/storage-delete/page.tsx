"use client"

import { Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function StorageDeletePopup() {
  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">저장소 삭제</CardTitle>
          <Link href="/storage-management">
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <Shield className="h-12 w-12 text-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-sm">이 저장소에 저장된 데이터 조각은</p>
              <p className="text-sm">다른 저장소로 옮겨진 후 삭제됩니다.</p>
              <p className="text-xs text-muted-foreground mt-3">
                ※ 로컬(이 컴퓨터/USB)의 실제 파일은
                <br />
                사용자가 직접 삭제해야 합니다.
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Link href="/storage-management" className="flex-1">
              <Button variant="outline" className="w-full bg-transparent">
                취소
              </Button>
            </Link>
            <Link href="/storage-management" className="flex-1">
              <Button className="w-full bg-destructive hover:bg-destructive/90 text-white">삭제</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

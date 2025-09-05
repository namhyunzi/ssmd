import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Link from "next/link"

export default function ResetPasswordNewPage() {
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
              className="w-full focus:border-primary focus:ring-primary"
            />

            <Input
              type="password"
              placeholder="새 비밀번호 확인"
              className="w-full focus:border-primary focus:ring-primary"
            />

            <Link href="/">
              <Button className="w-full bg-primary hover:bg-primary/90">비밀번호 변경하기</Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              회원가입 시 입력한 정보가 기억나지 않는다면?
              <br />
              <Link href="/support" className="text-primary hover:underline">
                고객센터 문의하기(1670-0876)
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

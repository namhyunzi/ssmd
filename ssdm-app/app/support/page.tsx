"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Phone, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FAQItem {
  id: string
  question: string
  answer: string
}

export default function SupportPage() {
  const router = useRouter()
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [faqs] = useState<FAQItem[]>([
    {
      id: "1",
      question: "SSDM이 무엇인가요?",
      answer:
        "SSDM(Self-Sovereign Data Management)은 개인이 자신의 데이터를 직접 관리하고 통제할 수 있도록 하는 시스템입니다. 중앙화된 서버 없이 분산 저장소를 통해 개인정보를 안전하게 보호합니다.",
    },
    {
      id: "2",
      question: "데이터는 어떻게 보호되나요?",
      answer:
        "모든 데이터는 AES-256 암호화를 통해 보호되며, 분산 저장소에 조각화되어 저장됩니다. 개인키는 사용자만이 소유하므로 제3자가 데이터에 접근할 수 없습니다.",
    },
    {
      id: "3",
      question: "저장소를 여러 개 연결하는 이유는 무엇인가요?",
      answer:
        "여러 저장소에 데이터를 분산 저장하면 보안이 강화되고, 하나의 저장소에 문제가 생겨도 데이터 손실을 방지할 수 있습니다. 또한 접근성도 향상됩니다.",
    },
    {
      id: "4",
      question: "서비스 동의를 철회하려면 어떻게 하나요?",
      answer:
        "서비스 동의 내역 페이지에서 해당 서비스를 선택한 후 '연결해제' 버튼을 클릭하면 즉시 동의가 철회되고 데이터 제공이 중단됩니다.",
    },
    {
      id: "5",
      question: "계정을 삭제하면 데이터는 어떻게 되나요?",
      answer:
        "계정 삭제 시 모든 개인정보가 즉시 삭제되며, 분산 저장소의 데이터도 함께 제거됩니다. 단, 로컬 저장소의 파일은 사용자가 직접 삭제해야 합니다.",
    },
  ])

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
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

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2 text-primary" />
              고객센터
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-primary/10 rounded-lg">
              <Phone className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-lg font-semibold text-primary">1670-0876</p>
              <p className="text-sm text-muted-foreground mt-1">평일 09:00 - 18:00 (주말, 공휴일 휴무)</p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>회원가입 시 입력한 정보가 기억나지 않는다면?</p>
              <Button variant="link" className="text-primary p-0 h-auto">
                고객센터 문의하기(1670-0876)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>자주 묻는 질문</CardTitle>
            <p className="text-sm text-muted-foreground">궁금한 내용을 확인해보세요</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.id} className="border rounded-lg">
                  <button
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/30"
                    onClick={() => toggleFAQ(faq.id)}
                  >
                    <span className="font-medium">{faq.question}</span>
                    {expandedFAQ === faq.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground border-t bg-muted/20">
                      <p className="pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

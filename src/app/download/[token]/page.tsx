import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ShieldCheck } from 'lucide-react'

export default async function DownloadTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const href = `/api/profileforge/download-token/${encodeURIComponent(token)}`

  return (
    <main className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-950 dark:to-fuchsia-950/30 flex items-center justify-center px-4 py-10">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardContent className="pt-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
            <Download className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">프로필 이미지가 준비되었습니다</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              아래 버튼을 누르면 보안 다운로드 링크가 확인되고 이미지 저장이 시작됩니다. 링크는 만료 후 복구할 수 없습니다.
            </p>
          </div>
          <Button asChild className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-rose-500">
            <a href={href} rel="noreferrer" referrerPolicy="no-referrer">
              <Download className="w-4 h-4 mr-2" />
              이미지 다운로드
            </a>
          </Button>
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              생성 결과는 private storage에 임시 보관되며, 다운로드 링크 만료 후 삭제됩니다.
            </p>
          </div>
          <Link href="/" className="block text-xs text-muted-foreground hover:text-foreground">
            ProfileForge로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

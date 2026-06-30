import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ShieldCheck, AlertTriangle } from 'lucide-react'
import { peekDownloadToken } from '@/lib/profileforge/download-tokens'

export default async function DownloadTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let tokenState: Awaited<ReturnType<typeof peekDownloadToken>> | null = null
  let lookupFailed = false
  try {
    tokenState = await peekDownloadToken(token)
  } catch (error) {
    lookupFailed = true
    console.error('[download-page] token lookup failed', error)
  }
  const now = new Date()
  const isValid = Boolean(tokenState && tokenState.status === 'active' && !tokenState.revokedAt && tokenState.expiresAt > now)
  const images = tokenState?.job.images.filter((image) => image.expiresAt > now) ?? []
  const href = `/api/profileforge/download-token/${encodeURIComponent(token)}`

  if (lookupFailed) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-950 dark:to-fuchsia-950/30 flex items-center justify-center px-4 py-10">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="pt-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">다운로드 상태를 확인하지 못했습니다</h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                일시적인 서버 문제일 수 있습니다. 잠시 후 다시 열어주세요.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full h-11">
              <Link href="/">ProfileForge로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!isValid || images.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 dark:from-slate-950 dark:via-slate-950 dark:to-fuchsia-950/30 flex items-center justify-center px-4 py-10">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="pt-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">다운로드 링크를 사용할 수 없습니다</h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                링크가 만료되었거나 생성 결과가 삭제되었습니다. 새 생성 요청을 진행해주세요.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full h-11">
              <Link href="/">ProfileForge로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

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
              생성된 {images.length}개 결과를 다운로드할 수 있습니다. 링크는 만료 후 복구할 수 없습니다.
            </p>
          </div>
          <div className="space-y-2">
            {images.map((image, index) => (
              <Button key={image.id} asChild className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-rose-500">
                <a href={`${href}?imageId=${encodeURIComponent(image.id)}`} rel="noreferrer" referrerPolicy="no-referrer">
                  <Download className="w-4 h-4 mr-2" />
                  이미지 {index + 1} 다운로드
                </a>
              </Button>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              생성 결과는 보안 저장소에 임시 보관되며, 다운로드 링크 만료 후 삭제됩니다.
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

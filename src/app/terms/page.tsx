import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '이용약관 | ProfileForge AI',
  description: 'ProfileForge AI 서비스 이용 조건, 사용자 책임, 금지 행위, AI 생성 결과의 한계와 삭제 정책을 안내합니다.',
  alternates: { canonical: '/terms' },
}

const updatedAt = '2026년 7월 1일'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-8">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-fuchsia-600 hover:underline">
            ← ProfileForge AI 홈
          </Link>
          <p className="text-xs font-medium text-muted-foreground">시행일 및 최종 업데이트: {updatedAt}</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">이용약관</h1>
          <p className="text-muted-foreground leading-relaxed">
            본 약관은 ProfileForge AI가 제공하는 AI 프로필 이미지 생성 서비스의 이용 조건과 사용자 책임을 정합니다.
            서비스를 이용하면 본 약관과 개인정보처리방침에 동의한 것으로 봅니다.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. 서비스 개요</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ProfileForge AI는 사용자가 업로드한 본인 또는 권한 있는 인물의 사진을 바탕으로 이력서, LinkedIn, SNS,
            창작용 프로필 이미지를 생성하는 웹 서비스입니다. 생성 작업은 서버 대기열에서 처리되며 완료된 이미지는 로그인한
            Google 이메일로 첨부 발송됩니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. 계정 및 로그인</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>서비스 이용에는 Google 로그인이 필요합니다.</li>
            <li>ProfileForge AI가 서버에 지속 저장하는 회원 식별 개인정보는 Google 이메일 주소입니다.</li>
            <li>사용자는 본인의 계정 접근 권한을 안전하게 관리해야 합니다.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. 사용자가 업로드할 수 있는 이미지</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>본인 사진 또는 생성·편집 권한을 명확히 가진 인물 사진만 업로드할 수 있습니다.</li>
            <li>타인, 유명인, 미성년자의 부적절한 이미지, 동의 없는 얼굴 사진은 업로드할 수 없습니다.</li>
            <li>불법 촬영물, 혐오·폭력·성적 착취 이미지, 권리 침해 이미지 사용은 금지됩니다.</li>
            <li>업로드 이미지에 관한 권리와 동의 확보 책임은 사용자에게 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. 금지 행위</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>타인을 사칭하거나 신분을 기만하기 위한 이미지 생성</li>
            <li>공식 신분증, 여권, 면허증, 출입증 등 공문서 제출을 목적으로 한 결과 사용</li>
            <li>의사, 군인, 경찰, 공무원 등 공적 권한이 있는 직업으로 오인될 수 있는 기만적 사용</li>
            <li>자동화 도구를 이용한 과도한 요청, 보안 우회, 대기열 조작</li>
            <li>서비스 결과물을 이용한 명예훼손, 사기, 스팸, 피싱, 불법 광고</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. AI 생성 결과의 한계</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AI 생성 이미지는 원본과 다르게 보일 수 있으며, 얼굴·피부·의상·배경·텍스트 등이 부정확할 수 있습니다.
            ProfileForge AI의 결과는 프로필 스타일 참고와 창작 용도를 위한 것이며, 공식 문서 제출용 신분사진이나
            사실 증명 자료가 아닙니다. 중요한 용도에 사용하기 전 사용자가 직접 검토해야 합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. 데이터 보관과 삭제</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>업로드 원본은 생성 및 이메일 첨부 발송 직후 삭제됩니다.</li>
            <li>생성 결과는 로그인한 Google 이메일로 첨부파일 발송된 직후 서버에서 삭제됩니다.</li>
            <li>이메일 발송 실패 또는 장애 복구가 필요한 경우에만 재시도를 위해 임시 파일이 짧게 남을 수 있습니다.</li>
            <li>사용자는 서비스 화면에서 즉시 삭제를 요청할 수 있습니다.</li>
            <li>작업 상태, 오류 코드, 사용량 제한용 해시 등 운영 기록은 장애 대응과 남용 방지를 위해 필요한 기간 보관될 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. 서비스 변경 및 중단</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ProfileForge AI는 운영, 보안, 장애 대응, 외부 이미지 생성 어댑터 상태에 따라 서비스 일부를 변경하거나 일시
            중단할 수 있습니다. 가능한 경우 주요 변경 사항을 서비스 화면을 통해 안내합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. 책임 제한</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            사용자가 약관을 위반하거나 권한 없는 이미지를 업로드하여 발생한 분쟁과 손해에 대한 책임은 사용자에게 있습니다.
            서비스는 AI 생성 결과의 정확성, 특정 목적 적합성, 공식 제출 가능성을 보장하지 않습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. 문의</h2>
          <p className="text-sm text-muted-foreground">
            약관 및 서비스 문의: <a className="text-fuchsia-600 hover:underline" href="mailto:support@profileforge.ponslink.com">support@profileforge.ponslink.com</a>
          </p>
        </section>
      </article>
    </main>
  )
}

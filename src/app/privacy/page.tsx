import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보처리방침 | ProfileForge AI',
  description: 'ProfileForge AI의 개인정보 처리 항목, 보관 기간, 임시 이미지 처리, Google 로그인 이메일 이용 목적을 안내합니다.',
  alternates: { canonical: '/privacy' },
}

const updatedAt = '2026년 7월 1일'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-8">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-fuchsia-600 hover:underline">
            ← ProfileForge AI 홈
          </Link>
          <p className="text-xs font-medium text-muted-foreground">시행일 및 최종 업데이트: {updatedAt}</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">개인정보처리방침</h1>
          <p className="text-muted-foreground leading-relaxed">
            ProfileForge AI는 AI 프로필 이미지 생성에 필요한 최소 정보만 처리합니다. 회원 식별과 결과 발송을 위해
            서버에 지속 저장하는 개인정보는 Google 로그인 이메일 주소가 전부입니다. 업로드 원본과 생성 결과 이미지는
            서비스 제공을 위한 임시 처리 파일이며 정해진 짧은 보관 기간 후 삭제됩니다.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. 처리하는 개인정보</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-semibold">구분</th>
                  <th className="p-3 font-semibold">항목</th>
                  <th className="p-3 font-semibold">목적</th>
                  <th className="p-3 font-semibold">보관</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3">Google 로그인</td>
                  <td className="p-3">Google 이메일 주소</td>
                  <td className="p-3">사용자 식별, 생성 결과 이메일 발송, 중복·남용 방지</td>
                  <td className="p-3">계정 또는 서비스 운영에 필요한 기간</td>
                </tr>
                <tr>
                  <td className="p-3">업로드 원본</td>
                  <td className="p-3">사용자가 업로드한 얼굴 사진 파일</td>
                  <td className="p-3">AI 프로필 이미지 생성 입력값</td>
                  <td className="p-3">기본 30분 임시 보관 후 삭제</td>
                </tr>
                <tr>
                  <td className="p-3">생성 결과</td>
                  <td className="p-3">AI가 생성한 프로필 이미지 파일</td>
                  <td className="p-3">미리보기, 다운로드, 이메일 첨부 발송</td>
                  <td className="p-3">기본 10분 임시 보관 후 삭제</td>
                </tr>
                <tr>
                  <td className="p-3">운영 기록</td>
                  <td className="p-3">작업 ID, 상태, 생성 옵션, 오류 코드, 다운로드 횟수, 일일 사용량 해시</td>
                  <td className="p-3">작업 처리, 장애 복구, 보안·남용 방지</td>
                  <td className="p-3">서비스 운영상 필요한 최소 기간</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Google 이메일 외의 이름, 전화번호, 주소, 결제정보, 주민등록번호 등은 요청하거나 저장하지 않습니다.
            Google 프로필 이름은 로그인 제공자가 전달할 수 있으나, 서비스 핵심 식별자는 이메일입니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. 이미지 처리와 보관 원칙</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>업로드 이미지는 생성 작업을 위해서만 사용하며 모델 학습에 사용하지 않습니다.</li>
            <li>생성 결과는 장기 공개 URL로 보관하지 않고, 짧은 시간 동안 API를 통해서만 임시 제공됩니다.</li>
            <li>완료된 결과는 로그인한 Google 이메일로 첨부파일 형태로 발송됩니다.</li>
            <li>사용자는 앱의 삭제 기능을 통해 업로드 원본과 생성 결과의 삭제를 요청할 수 있습니다.</li>
            <li>장애 복구 중인 작업은 중복 생성 방지와 정리를 위해 필요한 상태값만 유지합니다.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. 개인정보 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Google 로그인 기반 사용자 확인</li>
            <li>AI 프로필 이미지 생성 요청 접수 및 대기열 처리</li>
            <li>생성 완료 알림 및 결과 이미지 이메일 첨부 발송</li>
            <li>비정상 이용, 자동화 남용, 중복 요청, 과도한 사용량 방지</li>
            <li>오류 조사, 장애 복구, 서비스 품질 개선</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. 제3자 제공 및 외부 처리</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ProfileForge AI는 사용자의 개인정보를 판매하지 않습니다. 다만 서비스 제공을 위해 Google 로그인, 이메일 발송
            사업자, 이미지 생성 어댑터, 호스팅·스토리지 인프라가 사용될 수 있습니다. 이 경우 전달되는 정보는 로그인,
            결과 발송, 이미지 생성 처리에 필요한 범위로 제한됩니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. 쿠키 및 세션</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Google 로그인 상태 유지와 보안 처리를 위해 인증 쿠키 또는 세션 정보가 사용될 수 있습니다. 브라우저의 쿠키
            차단 설정을 사용하면 로그인 또는 이미지 생성 흐름이 정상 동작하지 않을 수 있습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. 이용자의 권리</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>업로드 원본 및 생성 결과 삭제 요청</li>
            <li>본인의 Google 이메일과 관련된 처리 내역 확인 요청</li>
            <li>서비스 이용 중단 및 관련 데이터 삭제 요청</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            문의: <a className="text-fuchsia-600 hover:underline" href="mailto:support@profileforge.ponslink.com">support@profileforge.ponslink.com</a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. 방침 변경</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            개인정보 처리 방식이 변경되는 경우 본 페이지를 통해 고지합니다. 중요한 변경 사항은 서비스 화면 또는 이메일로
            추가 안내할 수 있습니다.
          </p>
        </section>
      </article>
    </main>
  )
}

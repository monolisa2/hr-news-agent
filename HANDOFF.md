# 인수인계 — hr-news-agent

이 문서는 클로드코드에 그대로 넘기는 용도입니다. 압축 푼 폴더 루트에 두고 시작하세요.

---

## 1. 무엇을 만들고 있나

인사팀용 데일리 뉴스 브리핑 에이전트. 평일 아침 9시(KST)에 인사·노무 뉴스를 모아 요약하고, 팀원에게 메일을 보내고, 결과를 공개 아카이브 사이트에 쌓습니다.

사용자는 인사관리실 총괄. 개발 전담 인력 없이 AI 보조로 직접 코드를 다룹니다. 팀원 전체가 읽는 사내 공유용이고, 회사 업무용이지만 사이트 자체는 공개 뉴스 요약이라 비상업·공개로 운영합니다.

```
GitHub Actions (평일 09:00 KST)
  ├─ 구글뉴스 RSS + 정부 보도자료 수집 → 중복 제거
  ├─ LLM 요약·분류 (Gemini 무료 티어)
  ├─ Gmail SMTP로 팀원에게 BCC 발송
  ├─ content/YYYY-MM-DD.json 커밋   ← 이게 곧 아카이브
  └─ Next.js 정적 빌드 → GitHub Pages 배포
```

전부 무료 범위. 도메인만 안 사면 0원입니다.

---

## 2. 이미 정해진 결정 (뒤집지 말 것)

**DB를 쓰지 않는다.** `content/YYYY-MM-DD.json` 커밋이 곧 아카이브이고 git 히스토리가 곧 버전 관리입니다. Supabase나 다른 DB를 다시 제안하지 마세요.

**Vercel이 아니라 GitHub 하나로 끝낸다.** Vercel Hobby는 비상업 용도 약관 이슈가 있고 함수 실행시간 제한이 빡빡합니다. Actions는 6시간까지 되고 퍼블릭 저장소는 무제한입니다. 계정 하나로 수집·발송·저장·배포가 다 끝납니다.

**기사 전문을 저장하거나 표시하지 않는다.** 제목 + 자체 요약 3~4문장 + 원문 링크까지만. 저작권 문제라 타협 대상이 아닙니다. 요약 프롬프트에도 "원문을 옮기지 말고 자기 문장으로 다시 쓸 것"이 박혀 있습니다.

**링크와 제목은 LLM이 만들지 않는다.** `summarize.mjs`는 LLM에게 입력 배열의 인덱스(`id`)만 돌려받고, 제목·URL·매체는 원본 데이터에서 매핑합니다. 매일 무인으로 도는 시스템이라 링크 환각을 구조적으로 차단한 것입니다. **이 구조를 깨지 마세요.**

**접근 제한은 걸지 않는다.** 공개 뉴스 요약이고 코멘트 기능도 없어서 그냥 공개합니다.

---

## 3. 현재 상태

코드는 완성되어 있고 `npm run build` 정적 빌드까지 검증했습니다. 아직 **한 번도 실제 실행하지 않았습니다.** GitHub 설정과 첫 실행이 남아 있습니다.

```
scripts/
  sources.mjs    키워드·RSS 피드·카테고리 설정. 운영자가 제일 자주 건드리는 파일
  collect.mjs    RSS 수집 → HTML 제거 → 제목/매체 분리 → 토큰 겹침 65% 기준 중복 제거
  summarize.mjs  LLM 호출(Gemini/Anthropic 전환) → JSON 파싱 → 원본 매핑 → 카테고리 그룹핑
  email.mjs      nodemailer + Gmail SMTP. 인라인 스타일 HTML, BCC 발송
  run.mjs        오케스트레이션. KST 날짜 계산, 호수 산정, --dry-run / --no-mail

lib/content.ts   content/*.json 읽기 (빌드 타임 fs 직접 접근)
app/             Next.js App Router, output: 'export' 정적 빌드
components/      DateRail(발행 기록 눈금), BriefView(본문), ArchiveList(클라이언트 검색)
.github/workflows/daily.yml   cron '0 0 * * 1-5' = 평일 KST 09:00
package-lock.json             npm ci 가 이 파일을 요구합니다. 반드시 커밋되어야 합니다
```

기본 키워드 14개: 근로기준법, 노동위원회 판정, 부당해고, 중대재해처벌법, 최저임금, 정년연장, 임금체계 개편, 주52시간, 노사관계, 인사평가 제도, 채용 트렌드, HR 테크, 고용노동부, 직장 내 괴롭힘.

카테고리 4개: 법·제도 / 판례·노동위 / 노동시장·채용 / HR 트렌드.

---

## 4. 지금 해야 할 일

브라우저에서 해야 하는 것 (사람만 가능):

| 단계 | 위치 |
|---|---|
| Public 저장소 `hr-news-agent` 생성 | github.com |
| Settings → Pages → Source를 **GitHub Actions**로 | 저장소 설정 |
| Gemini API 키 발급 | aistudio.google.com/apikey |
| Gmail 앱 비밀번호 16자리 발급 (2단계 인증 선행) | myaccount.google.com/apppasswords |
| Secrets 4개 + Variables 1개 등록 | Settings → Secrets and variables → Actions |
| Actions → Daily HR Brief → Run workflow | 첫 실행 |

Secrets: `GEMINI_API_KEY`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`(쉼표 구분)
Variables: `SITE_URL` = `https://<아이디>.github.io/hr-news-agent/`

클로드코드가 할 일:

1. 이 폴더를 git 초기화하고 저장소에 push (`.github`, `.gitignore` 숨김 파일 포함 확인)
2. (완료) 레이아웃 확인용 샘플 content/2026-08-29.json 삭제 — 호수가 1호부터 시작하도록 첫 실행 전에 지웠습니다
3. 이후 키워드·카테고리 조정, 요약 프롬프트 튜닝

---

## 5. 알려진 주의점

**GitHub 크론은 5~20분 늦게 뜹니다.** 9시 정각이 중요하면 `daily.yml`의 cron을 `0 23 * * 0-4`(KST 08:00)로 당기세요.

**정부 보도자료 피드는 2026-08-30 기준 둘 다 죽어서 비워뒀습니다.** 고용노동부 `enewsList.do?rssYn=Y` 는 RSS 대신 HTML 을 반환하고, `korea.kr/rss/dept_moel.xml` 은 404 입니다. 새 주소를 찾으면 `sources.mjs` 의 `FEEDS` 에 다시 넣으세요. 지금은 구글뉴스만으로 돌아가며, 키워드 14개로 하루 60건 안팎이 걷힙니다.

**Gemini 모델명이 바뀝니다.** 기본값을 `gemini-3.6-flash` 로 잡아뒀습니다. `gemini-2.5-flash` 는 신규 API 키에서 이미 폐쇄되어 404 가 납니다(2026-08-30 확인). 요약 단계에서 404 가 나면 Variables 에 `GEMINI_MODEL` 을 추가해 교체하세요.

**60일간 커밋이 없으면 GitHub이 크론을 멈춥니다.** 이 워크플로는 매일 커밋을 만들어서 자동 유지되지만, 실패가 오래 이어졌다면 수동 실행으로 되살려야 합니다.

**앱 비밀번호가 틀리면 그날 작업 전체가 죽습니다.** Gmail 인증 거부 → run.mjs 가 exit 1 → 뒤따르는 커밋·빌드·배포 단계가 아예 실행되지 않습니다. 워크플로는 빨간 X 로 눈에 띄지만, 그날 브리핑이 아카이브에도 안 남습니다.

**진짜로 조용한 경우는 Secret 이 비어 있을 때입니다.** SMTP_USER / SMTP_PASS / MAIL_TO 중 하나라도 비면 email.mjs 가 "메일 설정이 없어 발송을 건너뜁니다" 한 줄만 남기고 넘어갑니다. 워크플로는 초록불, 사이트도 정상 갱신, 메일만 안 옵니다. 메일이 안 왔는데 초록불이면 Secret 이름 오타부터 확인하세요.

---

## 6. 디자인 시스템

`app/globals.css`의 CSS 변수를 따릅니다. 새 색이나 폰트를 임의로 추가하지 마세요.

- 종이 `#e9ecef` / 카드 `#ffffff` / 잉크 `#101820` / 보조 `#5a6673` / 괘선 `#c9d0d7` / 강조 `#275b4e`
- 디스플레이 나눔명조, 본문 Pretendard, 날짜·번호·라벨은 IBM Plex Mono
- 시그니처는 **날짜 레일** — 최근 90일 눈금, 높이가 그날 기사 수. "차곡차곡 쌓인다"는 게 이 사이트의 요점입니다.
- 모션 최소, `prefers-reduced-motion` 존중

---

## 7. 변경 후 검증

```bash
node --check scripts/*.mjs
npm run build
node --env-file=.env scripts/run.mjs --dry-run   # 파일 저장·메일 없이 파이프라인만 확인
```

---

## 8. 앞으로 예상되는 요청

- 키워드 추가/삭제 → `sources.mjs`의 `KEYWORDS`만 수정
- 카테고리 변경 → `sources.mjs`의 `CATEGORIES`. `key`가 프롬프트·필터·JSON에 함께 쓰이므로 셋을 같이 확인
- 발송 시각 변경 → `daily.yml`의 cron (UTC 기준)
- 노이즈 많은 키워드 정리 → 며칠 돌려본 뒤 결과 보고 조정
- 주간 요약 추가 → 금요일 별도 잡으로 그 주 `content/*.json`을 재요약. 새 파이프라인 만들지 말고 기존 요약기 재사용

---

## 첫 메시지로 쓸 프롬프트

> HANDOFF.md와 CLAUDE.md를 읽고 프로젝트 구조를 파악해줘.
> 그다음 이 폴더를 git 초기화해서 github.com/<내아이디>/hr-news-agent 에 push해줘.
> 숨김 파일(.github, .gitignore)이 빠지지 않았는지 확인하고,
> push 전에 커밋에 포함될 파일 목록을 먼저 보여줘.

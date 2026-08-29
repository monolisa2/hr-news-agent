# 인사 브리핑 (hr-news-agent)

매일 아침 9시(KST)에 인사·노무 뉴스를 모아 요약하고, 팀에 메일로 보낸 뒤, 공개 아카이브 사이트에 쌓아둡니다.

```
GitHub Actions (평일 09:00 KST)
  ├─ 구글뉴스 RSS + 정부 보도자료 수집 → 중복 제거
  ├─ LLM 요약·분류
  ├─ 팀원에게 메일 발송
  ├─ content/YYYY-MM-DD.json 커밋   ← 이게 곧 아카이브 (DB 없음)
  └─ Next.js 정적 빌드 → GitHub Pages 배포
```

전부 무료 범위에서 돕니다. Actions 퍼블릭 저장소 무제한, Pages 무료, Gemini 무료 티어, Gmail SMTP 무료.

---

## 설치 (약 20분)

### 1. 저장소 만들기

이 폴더를 **퍼블릭 저장소**로 올립니다. 퍼블릭이어야 Pages가 무료입니다.

```bash
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<아이디>/hr-news-agent.git
git push -u origin main
```

### 2. Pages 켜기

저장소 → **Settings → Pages → Source**를 `GitHub Actions`로 바꿉니다.
주소는 `https://<아이디>.github.io/hr-news-agent/` 가 됩니다.

### 3. Gemini API 키

[aistudio.google.com/apikey](https://aistudio.google.com/apikey) 에서 무료로 발급합니다. 하루 1회 호출이라 무료 한도 근처도 안 갑니다.

### 4. Gmail 앱 비밀번호

구글 계정에 2단계 인증을 켠 뒤 [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) 에서 16자리를 발급합니다. 평소 쓰는 계정 비밀번호가 아닙니다.

### 5. Secrets 등록

저장소 → **Settings → Secrets and variables → Actions → Secrets**

| 이름 | 값 |
|---|---|
| `GEMINI_API_KEY` | 3번에서 받은 키 |
| `SMTP_USER` | 발송용 Gmail 주소 |
| `SMTP_PASS` | 4번 앱 비밀번호 |
| `MAIL_TO` | 받는 사람 주소, 쉼표로 구분 |

같은 화면 **Variables** 탭:

| 이름 | 값 |
|---|---|
| `SITE_URL` | `https://<아이디>.github.io/hr-news-agent/` |

### 6. 첫 실행

**Actions → Daily HR Brief → Run workflow**. 2~4분 걸립니다.
끝나면 메일이 오고 사이트에 첫 호가 올라옵니다. 확인했으면 샘플 파일을 지우세요.

```bash
git pull && rm content/2026-08-29.json && git commit -am "샘플 제거" && git push
```

---

## 운영

### 키워드 바꾸기

`scripts/sources.mjs` 의 `KEYWORDS` 배열만 고치면 됩니다. 카테고리(`CATEGORIES`)와 브리핑당 기사 수(`MAX_ITEMS`)도 여기 있습니다.

### 로컬에서 미리 보기

```bash
cp .env.example .env
# .env 채운 뒤
node --env-file=.env scripts/run.mjs --dry-run   # 파일 저장·메일 없이 결과만 출력
npm run dev                                       # localhost:3000
```

### 발송 시각

`.github/workflows/daily.yml` 의 `cron: '0 0 * * 1-5'` — UTC 기준이라 `0 0` 이 KST 09:00, 평일만 발송입니다. 주말도 보내려면 `1-5` 를 `*` 로 바꾸세요.

GitHub 크론은 부하에 따라 **5~20분 늦게 시작될 수 있습니다.** 9시 정각을 맞춰야 하면 `0 23 * * 0-4` (KST 08:00)로 당겨두는 편이 낫습니다.

### 60일간 커밋이 없으면 크론이 멈춥니다

GitHub 정책입니다. 이 워크플로는 매일 커밋을 만들기 때문에 자동으로 유지되지만, 오래 실패가 이어졌다면 Actions 화면에서 한 번 수동 실행해 되살리세요.

---

## 저작권

기사 **제목 + 자체 요약 3~4문장 + 원문 링크**까지만 싣습니다. 본문 전문은 저장하지도 표시하지도 않습니다. 요약 프롬프트에도 "원문을 옮기지 말고 자기 문장으로 다시 쓸 것"이 명시돼 있고, 각 페이지 하단에 출처 확인 안내가 붙습니다.

## 비용

|  | 한도 | 실사용 |
|---|---|---|
| GitHub Actions | 퍼블릭 무제한 | 하루 약 3분 |
| GitHub Pages | 월 100GB 전송 | 팀 내부용이면 무시 가능 |
| Gemini 무료 티어 | 분당·일별 요청 제한 | 하루 1회 |
| Gmail SMTP | 하루 약 500통 | 하루 1통 (BCC) |

## 문제가 생기면

| 증상 | 확인할 곳 |
|---|---|
| 수집 0건 | Actions 로그의 `! 수집 실패` 줄. 정부 RSS 주소가 바뀌었으면 `FEEDS`에서 해당 항목 제거 |
| 요약 실패 | Gemini 모델명이 바뀌었을 수 있음. Variables에 `GEMINI_MODEL` 추가해 교체 |
| 메일 미발송 | 앱 비밀번호를 계정 비밀번호로 잘못 넣은 경우가 대부분 |
| 사이트 404 | Settings → Pages의 Source가 `GitHub Actions`인지 확인 |

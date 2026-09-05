import { CATEGORIES, MAX_ITEMS } from './sources.mjs';

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

function buildPrompt(items, dateLabel) {
  const catList = CATEGORIES.map((c) => `"${c.key}" (${c.name})`).join(', ');
  const list = items
    .map(
      (it, i) =>
        `[${i}] 제목: ${it.title}\n    매체: ${it.source}\n    발행: ${it.publishedAt}\n    요약원문: ${it.snippet}`
    )
    .join('\n');

  return `당신은 한국 기업의 인사팀을 위해 매일 뉴스 브리핑을 만드는 HR 애널리스트입니다.
오늘은 ${dateLabel} 이고, 아래는 지난 24시간 동안 수집된 기사 후보 목록입니다.

${list}

읽는 사람은 마케팅 SaaS 를 만드는 약 350명 규모 IT 회사의 인사팀입니다. 이 점을 선별과 시사점 작성에 반영하세요.

작업:
1. 이 인사팀에 실제로 의미 있는 기사만 최대 ${MAX_ITEMS}건 고르세요. 우선순위는 이렇습니다.
   - (가) 직종 불문 인사·노무 법제도 이슈. 어느 회사에나 적용되므로 반드시 챙깁니다.
   - (나) IT 업계 인사 이슈. 개발직 채용·보상·이직, 조직문화, AI 인재 확보 등.
     같은 값이면 일반 기사보다 IT 맥락이 있는 기사를 먼저 고르세요.
   - (다) SaaS·마케팅·광고대행 산업 동향. 인사 기사는 아니지만 사업 환경을 읽는 데 필요합니다.
     단 **최대 3건까지만** 고르고, 이 때문에 (가)(나)가 밀리면 안 됩니다.
   - 연예/스포츠/정치 공방/특정 기업 홍보성 기사, 실무와 무관한 기사는 제외합니다.
   - 같은 사건을 다룬 기사가 여러 건이면 가장 정보량이 많은 하나만 남깁니다.
   - 조건을 만족하는 기사가 적으면 억지로 채우지 말고 적게 골라도 됩니다.
2. 각 기사를 다음 카테고리 중 하나로 분류하세요: ${catList}
   - 산업 동향 기사는 "industry" 로 분류합니다. 인사·노무 기사를 여기에 넣지 마세요.
3. 각 기사에 대해:
   - summary: 3~4문장, 사실 위주로. 제공된 제목/요약원문에 없는 내용은 절대 지어내지 마세요.
     기사 본문을 그대로 옮기지 말고 반드시 자기 문장으로 다시 쓰세요.
   - impact: "인사팀 관점에서 무엇을 해야 하는가"를 한 문장으로. 추측이면 추측이라고 밝히세요.
     industry 카테고리는 사업 소식을 HR 로 연결해 한 문장으로 쓰세요.
     예: 경쟁 SaaS 의 AI 기능 확장 → 관련 엔지니어 채용 경쟁 심화 예상,
         업계 투자 위축 → 보상 설계에서 현금성 보상과 스톡옵션 선호 변화 주시.
4. headline: 오늘 브리핑 전체를 관통하는 한 줄(40자 이내).
5. lede: 오늘 브리핑의 흐름을 2~3문장으로 요약.
6. checkpoints: 오늘 고른 기사 전체를 종합해, 아래 다섯 파트 중 오늘 뉴스가
   실제로 행동거리를 주는 파트에만 체크포인트를 한 문장씩 쓰세요.
   - 인사기획(조직 설계·평가·KPI·인력 배치) / 급여·보상(보상 경쟁력·인상률·복리후생)
     / 채용(구직자 동향·이직 시장·경쟁사 채용) / 교육·육성(직무 스킬·AI 툴·리더십)
     / 노무(근로시간·유연근무·노동법 리스크)
   - part 값은 위 다섯 이름을 정확히 그대로 쓰세요.
   - 해당 없는 파트는 빼세요. 억지로 다섯 개를 채우지 마세요.
   - 반드시 오늘 고른 기사에 근거해 쓰고, 기사에 없는 내용을 지어내지 마세요.

반드시 아래 JSON 형식으로만 출력하세요. 마크다운 코드펜스, 설명 문장을 붙이지 마세요.
{
  "headline": "string",
  "lede": "string",
  "items": [
    { "id": 0, "category": "law", "summary": "string", "impact": "string" }
  ],
  "checkpoints": [
    { "part": "채용", "note": "string" }
  ]
}
id 는 위 목록의 대괄호 안 번호를 그대로 사용하세요. 새 번호나 새 URL을 만들지 마세요.`;
}

// 무료 티어는 혼잡 시간대에 503(UNAVAILABLE)을 자주 던집니다. 2026-09-03 과
// 09-04 아침 실행이 이걸로 이틀 연속 죽었습니다. 일시적 오류(아래 상태코드)는
// 기다렸다 다시 시도하고, 다 실패하면 예비 모델로 마지막 한 번을 시도합니다.
const RETRYABLE = new Set([0, 429, 500, 502, 503, 504]); // 0 = 네트워크 오류
const RETRY_WAITS_SEC = [30, 60, 120, 240];
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';

const sleep = (sec) => new Promise((r) => setTimeout(r, sec * 1000));

async function callGemini(prompt) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGeminiOnce(prompt, GEMINI_MODEL);
    } catch (err) {
      if (!RETRYABLE.has(err.status)) throw err;
      if (attempt >= RETRY_WAITS_SEC.length) {
        console.warn(`  ! ${GEMINI_MODEL} 이 계속 응답하지 못해 예비 모델(${GEMINI_FALLBACK_MODEL})로 시도합니다.`);
        return await callGeminiOnce(prompt, GEMINI_FALLBACK_MODEL);
      }
      const wait = RETRY_WAITS_SEC[attempt];
      console.warn(`  ! Gemini ${err.status || '네트워크'} 오류 — ${wait}초 뒤 다시 시도합니다 (${attempt + 1}/${RETRY_WAITS_SEC.length}).`);
      await sleep(wait);
    }
  }
}

async function callGeminiOnce(prompt, model) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다.');
  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          // Gemini 3.x 는 답하기 전 내부 사고(thoughts) 토큰이 이 한도를 같이 소모합니다.
          // 8192 로는 후보가 많은 날(월요일 3일치) 사고에 다 쓰고 JSON 이 잘렸습니다.
          // 2026-08-31 실행이 실제로 이렇게 죽었습니다. 줄이지 마세요.
          maxOutputTokens: 32768,
          responseMimeType: 'application/json',
        },
      }),
      }
    );
  } catch (e) {
    const err = new Error(`Gemini 네트워크 오류: ${e.message}`);
    err.status = 0;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Gemini ${res.status}: ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
}

// 모델이 문장 끝 마침표 뒤 공백을 빠뜨리는 경우가 잦아 후처리로 고칩니다.
// 마침표 뒤가 한글일 때만 넣으므로 소수점(4.5)이나 숫자는 건드리지 않습니다.
function fixSpacing(s = '') {
  return s.replace(/\.([가-힣])/g, '. $1').trim();
}

function parseJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSON 응답을 찾지 못했습니다.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// LLM 에 보내는 후보 수 상한. 월요일 3일치는 160건이 넘게 걷히는데,
// 후보가 많을수록 모델의 내부 사고가 길어져 응답이 잘릴 위험이 커집니다.
// collect 가 최신순으로 정렬해 주므로 앞에서 자르면 최신 기사가 남습니다.
const MAX_CANDIDATES = 120;

// 파트별 체크포인트에서 인정하는 파트 이름. 프롬프트의 다섯 이름과 같아야 합니다.
const CHECKPOINT_PARTS = ['인사기획', '급여·보상', '채용', '교육·육성', '노무'];

export async function summarize(items, dateLabel) {
  if (items.length === 0) {
    return { headline: '수집된 기사가 없습니다', lede: '', categories: [] };
  }

  // 이 아래로는 반드시 pool 만 씁니다. LLM 이 돌려주는 id 가 pool 의
  // 인덱스이므로, 원본 items 와 섞이면 링크가 어긋납니다.
  const pool = items.slice(0, MAX_CANDIDATES);
  if (items.length > pool.length) {
    console.log(`후보가 많아 최신 ${pool.length}건만 요약 대상으로 삼습니다 (수집 ${items.length}건).`);
  }

  const prompt = buildPrompt(pool, dateLabel);
  console.log(`요약 시작 (${PROVIDER}, 후보 ${pool.length}건)`);

  // 응답이 잘리거나 형식이 깨지는 날이 있어 한 번은 다시 시도합니다.
  let parsed;
  for (let attempt = 1; ; attempt++) {
    const raw = PROVIDER === 'anthropic' ? await callAnthropic(prompt) : await callGemini(prompt);
    try {
      parsed = parseJson(raw);
      break;
    } catch (err) {
      if (attempt >= 2) throw err;
      console.warn(`  ! 응답 파싱 실패(${err.message}) — 다시 시도합니다.`);
    }
  }

  // LLM이 만든 건 요약/분류뿐. 제목·링크·매체는 원본에서만 가져옵니다.
  // 분류 실패 시 마지막 카테고리로 보냅니다. 키를 하드코딩하면 CATEGORIES 변경 때 기사가 조용히 사라집니다.
  const fallbackCategory = CATEGORIES[CATEGORIES.length - 1].key;
  const seenUrls = new Set();

  const enriched = (parsed.items || [])
    .map((r) => {
      const src = pool[r.id];
      if (!src) return null;
      // LLM이 같은 기사를 두 번 고르는 경우가 있어 한 번만 싣습니다.
      if (seenUrls.has(src.url)) return null;
      seenUrls.add(src.url);
      return {
        title: src.title,
        source: src.source,
        url: src.url,
        publishedAt: src.publishedAt,
        category: CATEGORIES.some((c) => c.key === r.category) ? r.category : fallbackCategory,
        summary: fixSpacing(r.summary || ''),
        impact: fixSpacing(r.impact || ''),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  const categories = CATEGORIES.map((c) => ({
    key: c.key,
    name: c.name,
    items: enriched.filter((i) => i.category === c.key),
  })).filter((c) => c.items.length > 0);

  // 파트별 체크포인트. 파트 이름은 정해진 다섯 개만 인정하고("급여/보상" 같은
  // 표기 흔들림은 정규화해서 받음), 파트당 하나씩만 남깁니다.
  const seenParts = new Set();
  const checkpoints = (parsed.checkpoints || [])
    .map((c) => {
      const norm = String(c.part || '').replace(/[\s/·.]/g, '');
      const part = CHECKPOINT_PARTS.find((p) => p.replace(/[·]/g, '') === norm);
      return part ? { part, note: fixSpacing(c.note || '') } : null;
    })
    .filter((c) => c && c.note && !seenParts.has(c.part) && seenParts.add(c.part));

  console.log(`요약 완료: ${enriched.length}건 선별, 체크포인트 ${checkpoints.length}개`);
  return {
    headline: fixSpacing(parsed.headline || 'HR 데일리 브리핑'),
    lede: fixSpacing(parsed.lede || ''),
    categories,
    checkpoints,
  };
}

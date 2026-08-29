import { CATEGORIES, MAX_ITEMS } from './sources.mjs';

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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

작업:
1. 인사·노무 실무자에게 실제로 의미 있는 기사만 최대 ${MAX_ITEMS}건 고르세요.
   - 연예/스포츠/정치 공방/특정 기업 홍보성 기사, 실무와 무관한 기사는 제외합니다.
   - 같은 사건을 다룬 기사가 여러 건이면 가장 정보량이 많은 하나만 남깁니다.
   - 조건을 만족하는 기사가 적으면 억지로 채우지 말고 적게 골라도 됩니다.
2. 각 기사를 다음 카테고리 중 하나로 분류하세요: ${catList}
3. 각 기사에 대해:
   - summary: 3~4문장, 사실 위주로. 제공된 제목/요약원문에 없는 내용은 절대 지어내지 마세요.
     기사 본문을 그대로 옮기지 말고 반드시 자기 문장으로 다시 쓰세요.
   - impact: "인사팀 관점에서 무엇을 해야 하는가"를 한 문장으로. 추측이면 추측이라고 밝히세요.
4. headline: 오늘 브리핑 전체를 관통하는 한 줄(40자 이내).
5. lede: 오늘 브리핑의 흐름을 2~3문장으로 요약.

반드시 아래 JSON 형식으로만 출력하세요. 마크다운 코드펜스, 설명 문장을 붙이지 마세요.
{
  "headline": "string",
  "lede": "string",
  "items": [
    { "id": 0, "category": "law", "summary": "string", "impact": "string" }
  ]
}
id 는 위 목록의 대괄호 안 번호를 그대로 사용하세요. 새 번호나 새 URL을 만들지 마세요.`;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다.');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
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

function parseJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSON 응답을 찾지 못했습니다.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function summarize(items, dateLabel) {
  if (items.length === 0) {
    return { headline: '수집된 기사가 없습니다', lede: '', categories: [] };
  }

  const prompt = buildPrompt(items, dateLabel);
  console.log(`요약 시작 (${PROVIDER}, 후보 ${items.length}건)`);

  const raw = PROVIDER === 'anthropic' ? await callAnthropic(prompt) : await callGemini(prompt);
  const parsed = parseJson(raw);

  // LLM이 만든 건 요약/분류뿐. 제목·링크·매체는 원본에서만 가져옵니다.
  // 분류 실패 시 마지막 카테고리로 보냅니다. 키를 하드코딩하면 CATEGORIES 변경 때 기사가 조용히 사라집니다.
  const fallbackCategory = CATEGORIES[CATEGORIES.length - 1].key;
  const seenUrls = new Set();

  const enriched = (parsed.items || [])
    .map((r) => {
      const src = items[r.id];
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
        summary: r.summary || '',
        impact: r.impact || '',
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  const categories = CATEGORIES.map((c) => ({
    key: c.key,
    name: c.name,
    items: enriched.filter((i) => i.category === c.key),
  })).filter((c) => c.items.length > 0);

  console.log(`요약 완료: ${enriched.length}건 선별`);
  return {
    headline: parsed.headline || 'HR 데일리 브리핑',
    lede: parsed.lede || '',
    categories,
  };
}

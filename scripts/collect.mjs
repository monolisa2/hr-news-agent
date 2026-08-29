import Parser from 'rss-parser';
import { KEYWORDS, FEEDS, PER_KEYWORD, googleNewsUrl } from './sources.mjs';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; hr-news-agent/1.0; +https://github.com)',
  },
});

function stripHtml(s = '') {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// 구글뉴스 제목은 "제목 - 언론사" 형태로 옵니다.
function splitTitle(raw = '') {
  const idx = raw.lastIndexOf(' - ');
  if (idx > 10) {
    return { title: raw.slice(0, idx).trim(), source: raw.slice(idx + 3).trim() };
  }
  return { title: raw.trim(), source: '' };
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^\uac00-\ud7a3a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 같은 사건을 여러 매체가 받아쓴 경우를 걸러냅니다.
function isDuplicate(candidate, kept) {
  const a = new Set(normalize(candidate.title).split(' ').filter((t) => t.length > 1));
  if (a.size === 0) return true;
  for (const k of kept) {
    const b = new Set(normalize(k.title).split(' ').filter((t) => t.length > 1));
    let hit = 0;
    for (const t of a) if (b.has(t)) hit++;
    const overlap = hit / Math.min(a.size, b.size);
    if (overlap >= 0.65) return true;
  }
  return false;
}

async function readFeed(url, label) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((item) => {
      const { title, source } = splitTitle(item.title || '');
      return {
        title,
        source: source || label,
        url: item.link || '',
        snippet: stripHtml(item.contentSnippet || item.content || '').slice(0, 400),
        publishedAt: item.isoDate || item.pubDate || '',
        keyword: label,
      };
    });
  } catch (err) {
    console.warn(`  ! 수집 실패 [${label}] ${err.message}`);
    return [];
  }
}

export async function collect({ window = '1d' } = {}) {
  console.log('뉴스 수집 시작');
  const batches = await Promise.all([
    ...KEYWORDS.map(async (kw) => {
      const items = await readFeed(googleNewsUrl(kw, window), kw);
      console.log(`  · ${kw}: ${items.length}건`);
      return items.slice(0, PER_KEYWORD);
    }),
    ...FEEDS.map(async (f) => {
      const items = await readFeed(f.url, f.name);
      console.log(`  · ${f.name}: ${items.length}건`);
      return items.slice(0, PER_KEYWORD);
    }),
  ]);

  const all = batches.flat().filter((i) => i.title && i.url);

  // 최신순 정렬 후 중복 제거
  all.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const kept = [];
  const seenUrl = new Set();
  for (const item of all) {
    if (seenUrl.has(item.url)) continue;
    if (isDuplicate(item, kept)) continue;
    seenUrl.add(item.url);
    kept.push(item);
  }

  console.log(`수집 완료: 원본 ${all.length}건 → 중복 제거 후 ${kept.length}건`);
  return kept;
}

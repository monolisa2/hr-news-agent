// 수집 대상 설정. 이 파일만 고치면 브리핑 범위가 바뀝니다.

// 구글뉴스 RSS 검색 키워드. when:1d = 최근 24시간.
// 결과가 너무 적으면 when:2d 로, 너무 많으면 키워드를 줄이세요.
export const KEYWORDS = [
  '근로기준법',
  '노동위원회 판정',
  '부당해고',
  '중대재해처벌법',
  '최저임금',
  '정년연장',
  '임금체계 개편',
  '주52시간',
  '노사관계',
  '인사평가 제도',
  '채용 트렌드',
  'HR 테크',
  '고용노동부',
  '직장 내 괴롭힘',
];

// 원문 소스(보도자료 등). RSS 주소는 기관 사이트 개편 시 바뀔 수 있으니
// 실패 로그가 계속 뜨면 해당 항목을 지우거나 새 주소로 교체하세요.
export const FEEDS = [
  // 2026-08-30 확인: 아래 두 곳 모두 RSS 가 사라져 비웠습니다.
  //   고용노동부 enewsList.do?rssYn=Y → RSS 가 아니라 HTML 페이지를 반환
  //   korea.kr /rss/dept_moel.xml     → 404
  // 새 주소를 찾으면 { name, url } 형태로 다시 넣으면 됩니다.
];

// 브리핑에 실을 최대 기사 수
export const MAX_ITEMS = 12;

// 키워드 하나당 가져올 최대 기사 수 (수집 단계)
export const PER_KEYWORD = 8;

// 분류 카테고리. 순서대로 사이트/메일에 표시됩니다.
export const CATEGORIES = [
  { key: 'law', name: '법·제도' },
  { key: 'case', name: '판례·노동위' },
  { key: 'market', name: '노동시장·채용' },
  { key: 'trend', name: 'HR 트렌드' },
];

export function googleNewsUrl(keyword, window = '1d') {
  const q = encodeURIComponent(`${keyword} when:${window}`);
  return `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
}

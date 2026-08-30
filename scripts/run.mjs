import fs from 'node:fs';
import path from 'node:path';
import { collect } from './collect.mjs';
import { summarize } from './summarize.mjs';
import { sendEmail } from './email.mjs';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const dryRun = process.argv.includes('--dry-run');
const noMail = process.argv.includes('--no-mail') || dryRun;

// KST 기준 오늘 날짜 (YYYY-MM-DD)
function kstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

// KST 기준 요일 (0=일 … 1=월 … 6=토)
function kstWeekday() {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(new Date());
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(s);
}

function kstLabel(iso) {
  const [y, m, d] = iso.split('-');
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(new Date(`${iso}T03:00:00Z`));
  return `${y}년 ${Number(m)}월 ${Number(d)}일 (${weekday})`;
}

async function main() {
  const date = kstToday();
  const label = kstLabel(date);
  console.log(`\n=== 인사 브리핑 ${label} ===\n`);

  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const existing = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  const issue = existing.filter((f) => f !== `${date}.json`).length + 1;

  // 평일 10시 발송 기준으로, 월요일은 금요일 발송 이후 사흘(주말 포함)을 봅니다.
  // 나머지 요일은 전날 발송 이후 하루치입니다.
  const monday = kstWeekday() === 1;
  const base = monday ? '3d' : '1d';
  if (monday) console.log('월요일이라 주말을 포함해 3일치를 수집합니다.');

  let items = await collect({ window: base });
  if (items.length < 8) {
    const wider = monday ? '5d' : '2d';
    console.log(`기사가 적어 수집 범위를 ${wider} 로 넓힙니다.`);
    items = await collect({ window: wider });
  }
  if (items.length === 0) {
    console.log('수집된 기사가 없어 종료합니다.');
    return;
  }

  const brief = await summarize(items, label);
  const total = brief.categories.reduce((n, c) => n + c.items.length, 0);
  if (total === 0) {
    console.log('선별된 기사가 없어 종료합니다.');
    return;
  }

  const record = {
    date,
    label,
    issue,
    generatedAt: new Date().toISOString(),
    ...brief,
  };

  if (dryRun) {
    console.log('\n--- DRY RUN 결과 ---\n');
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  const file = path.join(CONTENT_DIR, `${date}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  console.log(`저장 완료: content/${date}.json`);

  if (!noMail) {
    await sendEmail(record, {
      date: label,
      issue,
      siteUrl: process.env.SITE_URL || '#',
    });
  }
}

main().catch((err) => {
  console.error('\n실패:', err.message);
  process.exit(1);
});

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

// 마지막 발행일 이후 며칠 지났는지로 수집 폭을 정합니다 (1~5일).
// 월요일이면 금요일 발행으로부터 3일 → 주말이 자연히 포함되고,
// 어느 날 실행이 실패해도 다음 날 자동으로 빈 기간을 메웁니다.
// 2026-08-31 실행이 실패해 하루가 비었을 때 요일 판정 대신 이 방식으로 바꿨습니다.
function daysSince(latestIso, todayIso) {
  const diff = (new Date(`${todayIso}T00:00:00Z`) - new Date(`${latestIso}T00:00:00Z`)) / 86400000;
  return Math.min(5, Math.max(1, Math.round(diff)));
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

  const latest = existing.filter((f) => f !== `${date}.json`).sort().at(-1);
  const days = latest ? daysSince(latest.replace('.json', ''), date) : 1;
  if (days > 1) {
    console.log(`마지막 발행(${latest ? latest.replace('.json', '') : '-'}) 이후 ${days}일이 지나 ${days}일치를 수집합니다.`);
  }

  let items = await collect({ window: `${days}d` });
  if (items.length < 8) {
    const wider = Math.min(days + 2, 7);
    console.log(`기사가 적어 수집 범위를 ${wider}일로 넓힙니다.`);
    items = await collect({ window: `${wider}d` });
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

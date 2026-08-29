import fs from 'node:fs';
import path from 'node:path';

export type BriefItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  summary: string;
  impact: string;
};

export type BriefCategory = { key: string; name: string; items: BriefItem[] };

export type Brief = {
  date: string;
  label: string;
  issue: number;
  generatedAt: string;
  headline: string;
  lede: string;
  categories: BriefCategory[];
  sample?: boolean;
};

const DIR = path.join(process.cwd(), 'content');

export function getAllBriefs(): Brief[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Brief)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBrief(date: string): Brief | null {
  return getAllBriefs().find((b) => b.date === date) ?? null;
}

export function countItems(b: Brief): number {
  return b.categories.reduce((n, c) => n + c.items.length, 0);
}

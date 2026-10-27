#!/usr/bin/env node
// 從 KanjiVG 下載假名 SVG，解析筆畫路徑與筆順編號位置，輸出 src/data/strokes.json。
// 純 Node，無第三方套件。已下載的檔案會跳過。
//
// 用法：
//   node scripts/build-strokes.mjs [--cache <dir>]
// 快取目錄預設為環境變數 KANJIVG_CACHE，否則為系統暫存目錄下的 kana5min-kanjivg。
// 資料來源：KanjiVG（CC BY-SA 3.0），見 assets/strokes/LICENSE-KanjiVG.txt。

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'src', 'data', 'strokes.json');

const argCache = process.argv.includes('--cache')
  ? process.argv[process.argv.indexOf('--cache') + 1]
  : null;
const cacheDir =
  argCache || process.env.KANJIVG_CACHE || path.join(tmpdir(), 'kana5min-kanjivg');

const BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

// ---- 字集 ----
const HIRA_BASIC = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const HIRA_VOICED = 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
const HIRA_SMALL = 'ゃゅょっ';

// 平假名轉片假名：碼點 +0x60
const toKata = (s) =>
  [...s].map((c) => String.fromCodePoint(c.codePointAt(0) + 0x60)).join('');

const chars = [
  ...HIRA_BASIC,
  ...HIRA_VOICED,
  ...HIRA_SMALL,
  ...toKata(HIRA_BASIC),
  ...toKata(HIRA_VOICED),
  ...toKata(HIRA_SMALL),
  'ー',
];

const fileName = (ch) => ch.codePointAt(0).toString(16).padStart(5, '0') + '.svg';

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function getSvg(ch) {
  const name = fileName(ch);
  const local = path.join(cacheDir, name);
  if (await exists(local)) return readFile(local, 'utf8');
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${name}`);
  const text = await res.text();
  await writeFile(local, text);
  return text;
}

// ---- 解析 ----
function parse(svg) {
  const viewBoxMatch = svg.match(/viewBox="\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*"/);
  const viewBox = viewBoxMatch ? Number(viewBoxMatch[1]) : 109;

  const numIdx = svg.indexOf('kvg:StrokeNumbers');
  const pathIdx = svg.indexOf('kvg:StrokePaths');
  const pathsPart = svg.slice(pathIdx, numIdx > pathIdx ? numIdx : undefined);
  const numbersPart = numIdx >= 0 ? svg.slice(numIdx) : '';

  // 依 id 結尾的 -sN 排序，缺少時用出現順序
  const strokes = [];
  const pathRe = /<path\b([^>]*?)\/?>/g;
  let m;
  let order = 0;
  while ((m = pathRe.exec(pathsPart))) {
    const attrs = m[1];
    const d = attrs.match(/\sd="([^"]+)"/);
    if (!d) continue;
    const id = attrs.match(/\sid="[^"]*-s(\d+)"/);
    strokes.push({ n: id ? Number(id[1]) : order + 1, order: order++, d: d[1] });
  }
  strokes.sort((a, b) => a.n - b.n || a.order - b.order);

  const numbers = [];
  const textRe = /<text\b[^>]*transform="matrix\(\s*1\s+0\s+0\s+1\s+([-\d.]+)\s+([-\d.]+)\s*\)"[^>]*>\s*(\d+)\s*<\/text>/g;
  while ((m = textRe.exec(numbersPart))) {
    numbers.push({ n: Number(m[3]), x: Number(m[1]), y: Number(m[2]) });
  }
  numbers.sort((a, b) => a.n - b.n);

  return {
    viewBox,
    strokes: strokes.map((s) => s.d),
    numbers: numbers.map((t) => [t.x, t.y]),
  };
}

// ---- 主流程 ----
await mkdir(cacheDir, { recursive: true });
await mkdir(path.dirname(outFile), { recursive: true });

const result = {};
const missing = [];
const warnings = [];

for (const ch of chars) {
  let svg;
  try {
    svg = await getSvg(ch);
  } catch (e) {
    missing.push(`${ch} (${fileName(ch)}): ${e.message}`);
    continue;
  }
  const parsed = parse(svg);
  if (parsed.strokes.length === 0) {
    missing.push(`${ch} (${fileName(ch)}): 解析不到任何筆畫`);
    continue;
  }
  if (parsed.numbers.length !== parsed.strokes.length) {
    warnings.push(
      `${ch}: 筆畫數 ${parsed.strokes.length} 與編號數 ${parsed.numbers.length} 不一致`,
    );
  }
  result[ch] = parsed;
}

await writeFile(outFile, JSON.stringify(result) + '\n');

const size = (await stat(outFile)).size;
console.log(`輸出 ${outFile}`);
console.log(`字數 ${Object.keys(result).length} / ${chars.length}，檔案大小 ${size} bytes`);
console.log('快取目錄', cacheDir);
if (warnings.length) {
  console.warn('\n警告：');
  for (const w of warnings) console.warn('  ' + w);
}
if (missing.length) {
  console.warn('\n缺檔或解析失敗：');
  for (const w of missing) console.warn('  ' + w);
}

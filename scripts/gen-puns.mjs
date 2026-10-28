#!/usr/bin/env node
// 從 kana-puns.md 產生 src/data/puns.ts 裡的諧音梗資料（PUNS）。
// kana-puns.md 是唯一的內容來源；改完句子後執行這支腳本，App 才會跟著改。
//
// 用法：
//   node scripts/gen-puns.mjs           # 重寫 puns.ts 裡 gen-puns:start～end 之間的區塊
//   node scripts/gen-puns.mjs --check   # 只檢查 puns.ts 是否與 kana-puns.md 一致（不一致時 exit 1）
//   node scripts/gen-puns.mjs --list    # 列出每一列的處理結果（收錄／略過與原因），不寫檔
//
// 規則：
//   - 只收「狀態」欄含 ✅ 的列；❌ 與空白（未審）都不收，也就不會在 App 顯示。
//   - 以「讀音」欄為 key，必須是 kana.json 裡清音的 romaji；片假名與平假名共用同一句。
//   - 整理：移除 emoji、半形括號改全形「（）」、連續空白合併、去頭尾空白；文字其餘照原句。

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD_FILE = path.join(ROOT, 'kana-puns.md');
const TS_FILE = path.join(ROOT, 'src/data/puns.ts');
const KANA_FILE = path.join(ROOT, 'src/data/kana.json');
const START = '// <gen-puns:start>';
const END = '// <gen-puns:end>';

const args = process.argv.slice(2);
const check = args.includes('--check');
const listOnly = args.includes('--list');

/** 移除 emoji 與其修飾符號（變體選擇符、零寬連接符、膚色）。 */
function stripEmoji(s) {
  return s.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️⃣]/gu, '');
}

function normalize(raw) {
  return stripEmoji(raw)
    .replace(/\(/g, '（')
    .replace(/\)/g, '）')
    .replace(/\s+/g, ' ')
    .trim();
}

const errors = [];
const kana = JSON.parse(await readFile(KANA_FILE, 'utf8'));
const seionRomaji = new Map(kana.filter((k) => k.kind === 'seion' && k.script === 'hiragana').map((k) => [k.romaji, k.char]));

// ---- 解析 markdown 表格 ----
const md = await readFile(MD_FILE, 'utf8');
const rows = [];
for (const line of md.split('\n')) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 4) continue;
  const [char, sound, pun, status] = cells;
  if (char === '假名' || /^-+$/.test(char)) continue; // 表頭與分隔線
  rows.push({ char, sound, pun, status });
}

const puns = new Map();
const report = [];
for (const r of rows) {
  const approved = r.status.includes('✅');
  if (!approved) {
    report.push(`略過  ${r.char} (${r.sound})  ${r.status.includes('❌') ? '❌ 不收' : '未審'}`);
    continue;
  }
  const expectedChar = seionRomaji.get(r.sound);
  if (!expectedChar) errors.push(`「${r.char}」的讀音 "${r.sound}" 不是 kana.json 的清音 romaji`);
  else if (expectedChar !== r.char) errors.push(`讀音 "${r.sound}" 對應的假名是「${expectedChar}」，表格卻寫「${r.char}」`);
  const text = normalize(r.pun);
  if (!text) errors.push(`「${r.char}」標 ✅ 但沒有句子`);
  else if (expectedChar && !text.includes(expectedChar)) errors.push(`「${r.char}」的句子沒有包含「${expectedChar}」：${text}（App 的片假名版需要句中有這個字）`);
  if (puns.has(r.sound)) errors.push(`讀音 "${r.sound}" 重複`);
  puns.set(r.sound, text);
  report.push(`收錄  ${r.char} (${r.sound})  ${text}`);
}

if (listOnly) {
  console.log(report.join('\n'));
  console.log(`\n收錄 ${puns.size} 句，略過 ${rows.length - puns.size} 列`);
}
if (errors.length) {
  console.error(errors.map((e) => `錯誤：${e}`).join('\n'));
  process.exit(2);
}
if (listOnly) process.exit(0);

// ---- 產生區塊 ----
const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const block =
  `${START}\n` +
  `// 由 scripts/gen-puns.mjs 從 kana-puns.md 產生，請勿手改；要改句子請改 kana-puns.md 後執行 pnpm gen:puns。\n` +
  `/** 讀音 → 平假名諧音句。 */\n` +
  `export const PUNS: Readonly<Record<string, string>> = {\n` +
  [...puns].map(([sound, text]) => `  ${sound}: ${q(text)},`).join('\n') +
  `\n};\n${END}`;

const ts = await readFile(TS_FILE, 'utf8');
const s = ts.indexOf(START);
const e = ts.indexOf(END);
if (s < 0 || e < 0 || e < s) {
  console.error(`錯誤：${path.relative(ROOT, TS_FILE)} 找不到 ${START} ～ ${END} 標記`);
  process.exit(2);
}
const next = ts.slice(0, s) + block + ts.slice(e + END.length);

if (check) {
  if (next === ts) {
    console.log(`puns.ts 與 kana-puns.md 一致（${puns.size} 句）`);
    process.exit(0);
  }
  console.error('puns.ts 與 kana-puns.md 不一致，請執行 pnpm gen:puns 並 commit');
  process.exit(1);
}
if (next === ts) {
  console.log(`puns.ts 已是最新（${puns.size} 句）`);
} else {
  await writeFile(TS_FILE, next);
  console.log(`已更新 ${path.relative(ROOT, TS_FILE)}（${puns.size} 句）`);
}

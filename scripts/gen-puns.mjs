#!/usr/bin/env node
// 從 kana-puns.md（清音）與 kana-puns-dakuon-yoon.md（濁音、半濁音、拗音）
// 產生 src/data/puns.ts 裡的諧音梗資料（PUNS、VOICED_PUNS）。
// 這兩份 markdown 是唯一的內容來源；改完句子後執行這支腳本，App 才會跟著改。
//
// 用法：
//   node scripts/gen-puns.mjs           # 重寫 puns.ts 裡 gen-puns:start～end 之間的區塊
//   node scripts/gen-puns.mjs --check   # 只檢查 puns.ts 是否與 kana-puns.md 一致（不一致時 exit 1）
//   node scripts/gen-puns.mjs --list    # 列出每一列的處理結果（收錄／略過與原因），不寫檔
//
// 規則：
//   - 只收「狀態」欄含 ✅ 的列；❌ 與空白（未審）都不收，也就不會在 App 顯示。
//   - 清音（kana-puns.md）：以「讀音」欄為 key，必須是 kana.json 裡清音的 romaji → PUNS。
//   - 濁音／半濁音／拗音（kana-puns-dakuon-yoon.md）：romaji 會重複（ぢ=ji、づ=zu 與じ、ず同音），
//     所以改以「假名」欄對到 kana.json 的平假名 id（例如 h-ga、h-kya）為 key → VOICED_PUNS；
//     「讀音」欄只用來核對。
//   - 片假名與平假名共用同一句（App 端把句中對應的平假名換成片假名，拗音整組換）。
//   - 整理：半形括號改全形「（）」、連續空白合併、去頭尾空白；emoji 與文字其餘照原句保留。

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD_FILE = path.join(ROOT, 'kana-puns.md');
const MD_VOICED_FILE = path.join(ROOT, 'kana-puns-dakuon-yoon.md');
const TS_FILE = path.join(ROOT, 'src/data/puns.ts');
const KANA_FILE = path.join(ROOT, 'src/data/kana.json');
const START = '// <gen-puns:start>';
const END = '// <gen-puns:end>';

const args = process.argv.slice(2);
const check = args.includes('--check');
const listOnly = args.includes('--list');

function normalize(raw) {
  return raw
    .replace(/\(/g, '（')
    .replace(/\)/g, '）')
    .replace(/\s+/g, ' ')
    .trim();
}

const errors = [];
const kana = JSON.parse(await readFile(KANA_FILE, 'utf8'));
const seionRomaji = new Map(kana.filter((k) => k.kind === 'seion' && k.script === 'hiragana').map((k) => [k.romaji, k.char]));

// 濁音、半濁音、拗音：假名 → 平假名 kana id
const voicedByChar = new Map(
  kana.filter((k) => k.script === 'hiragana' && (k.kind === 'dakuon' || k.kind === 'youon')).map((k) => [k.char, k]),
);

// ---- 解析 markdown 表格 ----
async function parseRows(file) {
  const md = await readFile(file, 'utf8');
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    const [char, sound, pun, status] = cells;
    if (char === '假名' || /^-+$/.test(char)) continue; // 表頭與分隔線
    rows.push({ char, sound, pun, status });
  }
  return rows;
}

const puns = new Map();
const voicedPuns = new Map();
const report = [];
let totalRows = 0;

/** 共用的檢查：回傳要收錄的句子，不收或有錯回傳 undefined。 */
function accept(r, expectedChar, label) {
  const approved = r.status.includes('✅');
  if (!approved) {
    report.push(`略過  ${label} ${r.char} (${r.sound})  ${r.status.includes('❌') ? '❌ 不收' : '未審'}`);
    return undefined;
  }
  const text = normalize(r.pun);
  if (!text) errors.push(`「${r.char}」標 ✅ 但沒有句子`);
  else if (expectedChar && !text.includes(expectedChar)) errors.push(`「${r.char}」的句子沒有包含「${expectedChar}」：${text}（App 的片假名版需要句中有這個字）`);
  return text;
}

const seionRows = await parseRows(MD_FILE);
totalRows += seionRows.length;
for (const r of seionRows) {
  const expectedChar = seionRomaji.get(r.sound);
  if (r.status.includes('✅')) {
    if (!expectedChar) errors.push(`「${r.char}」的讀音 "${r.sound}" 不是 kana.json 的清音 romaji`);
    else if (expectedChar !== r.char) errors.push(`讀音 "${r.sound}" 對應的假名是「${expectedChar}」，表格卻寫「${r.char}」`);
  }
  const text = accept(r, expectedChar, '清音');
  if (text === undefined) continue;
  if (puns.has(r.sound)) errors.push(`讀音 "${r.sound}" 重複`);
  puns.set(r.sound, text);
  report.push(`收錄  清音 ${r.char} (${r.sound})  ${text}`);
}

const voicedRows = await parseRows(MD_VOICED_FILE);
totalRows += voicedRows.length;
for (const r of voicedRows) {
  const k = voicedByChar.get(r.char);
  if (r.status.includes('✅')) {
    if (!k) errors.push(`「${r.char}」不是 kana.json 的濁音、半濁音或拗音（kana-puns-dakuon-yoon.md）`);
    else if (k.romaji !== r.sound) errors.push(`「${r.char}」的讀音應為 "${k.romaji}"，表格卻寫 "${r.sound}"`);
  }
  const text = accept(r, k?.char, '濁拗');
  if (text === undefined || !k) continue;
  if (voicedPuns.has(k.id)) errors.push(`「${r.char}」(${k.id}) 重複`);
  voicedPuns.set(k.id, text);
  report.push(`收錄  濁拗 ${r.char} (${k.id})  ${text}`);
}
const total = puns.size + voicedPuns.size;

if (listOnly) {
  console.log(report.join('\n'));
  console.log(`\n收錄 ${total} 句（清音 ${puns.size}、濁音／半濁音／拗音 ${voicedPuns.size}），略過 ${totalRows - total} 列`);
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
  `// 由 scripts/gen-puns.mjs 從 kana-puns.md、kana-puns-dakuon-yoon.md 產生，請勿手改；\n` +
  `// 要改句子請改那兩份 markdown 後執行 pnpm gen:puns。\n` +
  `/** 清音：讀音（romaji）→ 平假名諧音句。 */\n` +
  `export const PUNS: Readonly<Record<string, string>> = {\n` +
  [...puns].map(([sound, text]) => `  ${sound}: ${q(text)},`).join('\n') +
  `\n};\n\n` +
  `/** 濁音、半濁音、拗音：平假名 kana id（h-ga、h-kya…）→ 平假名諧音句（romaji 會重複，所以不用讀音當 key）。 */\n` +
  `export const VOICED_PUNS: Readonly<Record<string, string>> = {\n` +
  [...voicedPuns].map(([id, text]) => `  ${q(id)}: ${q(text)},`).join('\n') +
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
    console.log(`puns.ts 與 kana-puns.md、kana-puns-dakuon-yoon.md 一致（${total} 句）`);
    process.exit(0);
  }
  console.error('puns.ts 與 kana-puns.md／kana-puns-dakuon-yoon.md 不一致，請執行 pnpm gen:puns 並 commit');
  process.exit(1);
}
if (next === ts) {
  console.log(`puns.ts 已是最新（${total} 句）`);
} else {
  await writeFile(TS_FILE, next);
  console.log(`已更新 ${path.relative(ROOT, TS_FILE)}（${total} 句）`);
}

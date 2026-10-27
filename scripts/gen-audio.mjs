#!/usr/bin/env node
// 產生假名與例字的發音 mp3（msedge-tts，免 API key），並重寫 src/audio/audioMap.ts。
//
// 用法：
//   node scripts/gen-audio.mjs                    # 只產生缺少的檔案
//   node scripts/gen-audio.mjs --force            # 全部重產
//   node scripts/gen-audio.mjs --only h-ha,w-hono # 只重產指定 id（兩種速度）
//   node scripts/gen-audio.mjs --list             # 只列出 id 與送給 TTS 的文字，不連網
//   --no-trim                                     # 不用 ffmpeg 裁掉頭尾靜音（服務端單字會補到約 1.9 秒）
//
// 送給 TTS 的文字 = scripts/tts-overrides.json[id] ?? 原文字。

import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = path.join(ROOT, 'assets/audio');
const MAP_FILE = path.join(ROOT, 'src/audio/audioMap.ts');
const OVERRIDES_FILE = path.join(ROOT, 'scripts/tts-overrides.json');

const VOICE = 'ja-JP-NanamiNeural';
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
const SLOW_RATE = '-40%';
const CONCURRENCY = 4;
const RETRIES = 3;
const MIN_BYTES = 800; // 小於這個大小視為空音檔

// ---- 參數 ----
const args = process.argv.slice(2);
const force = args.includes('--force');
const listOnly = args.includes('--list');
const noTrim = args.includes('--no-trim');
let only = null;
const onlyIdx = args.indexOf('--only');
if (onlyIdx >= 0) {
  const v = args[onlyIdx + 1];
  if (!v || v.startsWith('--')) {
    console.error('--only 需要以逗號分隔的 id，例如 --only h-ha,w-hono');
    process.exit(2);
  }
  only = new Set(v.split(',').map((s) => s.trim()).filter(Boolean));
}

// ---- 資料 ----
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
const kana = await readJson(path.join(ROOT, 'src/data/kana.json'));
const words = await readJson(path.join(ROOT, 'src/data/words.json'));
const overrides = existsSync(OVERRIDES_FILE) ? await readJson(OVERRIDES_FILE) : {};

/** @type {{id:string, text:string}[]} */
const items = [
  ...kana.map((k) => ({ id: k.id, text: k.char })),
  ...words.map((w) => ({ id: w.id, text: w.text })),
].map((it) => ({
  id: it.id,
  text: typeof overrides[it.id] === 'string' ? overrides[it.id] : it.text,
}));

const ids = new Set(items.map((i) => i.id));
if (ids.size !== items.length) {
  console.error('id 重複：kana.json 與 words.json 的 id 必須唯一');
  process.exit(2);
}
for (const k of Object.keys(overrides)) {
  if (!ids.has(k)) console.warn(`警告：tts-overrides.json 的 "${k}" 不在 kana/words 中`);
}
if (only) {
  const unknown = [...only].filter((i) => !ids.has(i));
  if (unknown.length) {
    console.error(`--only 有不存在的 id：${unknown.join(', ')}`);
    process.exit(2);
  }
}

// ---- 工作清單（每個 job = 一個檔案）----
const jobs = [];
for (const it of items) {
  if (only && !only.has(it.id)) continue;
  for (const slow of [false, true]) {
    const file = path.join(AUDIO_DIR, `${it.id}${slow ? '.slow' : ''}.mp3`);
    if (!force && !only && existsSync(file)) continue;
    jobs.push({ id: it.id, text: it.text, slow, file });
  }
}

if (listOnly) {
  for (const j of jobs) {
    console.log(`${j.id}${j.slow ? '.slow' : ''}\t${j.text}\t${j.slow ? `rate ${SLOW_RATE}` : 'rate default'}`);
  }
  console.log(`共 ${jobs.length} 個檔案待產生（總計 ${items.length * 2} 個）`);
  process.exit(0);
}

await mkdir(AUDIO_DIR, { recursive: true });

// ---- 合成 ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collect(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    stream.on('close', () => resolve(Buffer.concat(chunks)));
  });
}

async function newClient() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, FORMAT);
  return tts;
}

// Edge TTS 會把很短的文字補靜音到約 1.9 秒；有 ffmpeg 時裁掉頭尾靜音（只裁兩端，不影響中間停頓）。
const TRIM_FILTER =
  'silenceremove=start_periods=1:start_silence=0.08:start_threshold=-45dB,areverse,' +
  'silenceremove=start_periods=1:start_silence=0.2:start_threshold=-45dB,areverse';
const canTrim = !noTrim && spawnSync('ffmpeg', ['-version']).status === 0;
if (!noTrim && !canTrim) console.warn('警告：找不到 ffmpeg，不裁靜音（音檔保留服務端原始長度）');

function trim(buf) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0', '-af', TRIM_FILTER,
      '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1', '-f', 'mp3', 'pipe:1',
    ]);
    const out = [];
    const err = [];
    ff.stdout.on('data', (c) => out.push(c));
    ff.stderr.on('data', (c) => err.push(c));
    ff.on('error', reject);
    ff.on('close', (code) =>
      code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg 失敗：${Buffer.concat(err)}`)),
    );
    ff.stdin.on('error', () => {});
    ff.stdin.end(buf);
  });
}

const failures = [];
let done = 0;
let cursor = 0;

async function worker() {
  let tts = null;
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    let ok = false;
    let lastErr = null;
    for (let attempt = 1; attempt <= RETRIES && !ok; attempt++) {
      try {
        if (!tts) tts = await newClient();
        const { audioStream } = tts.toStream(job.text, job.slow ? { rate: SLOW_RATE } : {});
        let buf = await collect(audioStream);
        if (buf.length < MIN_BYTES) throw new Error(`音檔過小（${buf.length} bytes）`);
        if (canTrim) buf = await trim(buf);
        if (buf.length < 400) throw new Error(`裁切後音檔過小（${buf.length} bytes）`);
        const tmp = `${job.file}.tmp`;
        await writeFile(tmp, buf);
        await rename(tmp, job.file);
        ok = true;
      } catch (err) {
        lastErr = err;
        try { tts?.close(); } catch {}
        tts = null;
        await sleep(500 * attempt);
      }
    }
    done++;
    const name = `${job.id}${job.slow ? '.slow' : ''}`;
    if (ok) {
      if (done % 20 === 0 || done === jobs.length) console.log(`[${done}/${jobs.length}] ${name}`);
    } else {
      failures.push({ name, text: job.text, error: String(lastErr?.message ?? lastErr) });
      console.error(`[${done}/${jobs.length}] 失敗 ${name}：${lastErr?.message ?? lastErr}`);
    }
  }
  try { tts?.close(); } catch {}
}

if (jobs.length === 0) {
  console.log('沒有需要產生的檔案（用 --force 全部重產）');
} else {
  console.log(`產生 ${jobs.length} 個檔案（聲音 ${VOICE}，併發 ${CONCURRENCY}）`);
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
}

// ---- 重寫 audioMap.ts（只列實際存在的檔案）----
const files = new Set(await readdir(AUDIO_DIR));
const mapIds = [...ids].filter((id) => files.has(`${id}.mp3`)).sort();
const lines = mapIds.map((id) => {
  const slow = files.has(`${id}.slow.mp3`)
    ? `, slow: require('../../assets/audio/${id}.slow.mp3')`
    : '';
  return `  '${id}': { normal: require('../../assets/audio/${id}.mp3')${slow} },`;
});
const out = `// 由 scripts/gen-audio.mjs 產生，請勿手改。
// 假名／例字 id → 打包的 mp3 資源（require 回傳的 number）。
// 找不到音檔時 playKana 會安靜略過。
export const audioMap: Record<string, { normal: number; slow?: number }> = {
${lines.join('\n')}
};
`;
await writeFile(MAP_FILE, out);
console.log(`audioMap.ts 已更新：${mapIds.length} 個 id`);

if (failures.length) {
  console.error(`\n失敗清單（${failures.length}）：`);
  for (const f of failures) console.error(`  ${f.name}\t${f.text}\t${f.error}`);
  process.exit(1);
}

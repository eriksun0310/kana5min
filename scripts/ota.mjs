#!/usr/bin/env node
// xprem OTA 發布 wrapper：載入被 ignore 的 .env（EOO_TOKEN）後，執行「專案本地固定版本」的 eoas。
// 用法（經 package.json scripts）：
//   pnpm ota:publish   -- --platform=all --message="修正 XXX"
//   pnpm ota:publish   -- --platform=ios --branch=production --rollout-percentage=20
//   pnpm ota:rollback  -- --branch=production
//   pnpm ota:republish -- --branch=production --platform=all
// 也可直接：node scripts/ota.mjs publish --platform=ios --message="..."
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 與 app.config.js 的 updates.url 一致（去掉 /manifest）。非互動模式用它跳過「確認 URL」提示。
const SERVER_URL = 'https://ota.moushih.com';
const DEFAULT_BRANCH = 'production';
const DEFAULT_CHANNEL = 'production';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 載入 .env（不印任何值）。Node >= 20.12 有 loadEnvFile；舊版退回簡單解析。
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  } else {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

// 先擋缺 token：否則 eoas 會退回 EXPO_TOKEN / eas login session，跑完整個 export 才在上傳時被 401 拒絕。
if (!process.env.EOO_TOKEN) {
  console.error('[ota] 找不到 EOO_TOKEN：請在專案 .env（已被 ignore）設定，或在 shell / CI 匯出。不要提交到 git。');
  process.exit(1);
}

const command = process.argv[2];
let args = process.argv.slice(3);
while (args[0] === '--') args = args.slice(1);
if (!['publish', 'rollback', 'republish'].includes(command)) {
  console.error('[ota] 用法：node scripts/ota.mjs <publish|rollback|republish> [eoas 參數...]');
  process.exit(1);
}

// RELEASE_CHANNEL 會寫進 export 時的 expo-channel-name；eoas 3.2.4 的 --channel 已 deprecated，改用環境變數。
process.env.RELEASE_CHANNEL ||= DEFAULT_CHANNEL;
if (!args.some((a) => a.startsWith('--branch'))) args.push(`--branch=${DEFAULT_BRANCH}`);

// 讓 eoas 內部的 expo export / expo config 用專案的套件管理器執行。
if (!process.env.EOAS_PACKAGE_RUNNER) {
  const has = (f) => fs.existsSync(path.join(projectRoot, f));
  process.env.EOAS_PACKAGE_RUNNER = has('pnpm-lock.yaml') ? 'pnpm exec' : has('bun.lockb') || has('bun.lock') ? 'bunx' : 'npx';
}

// 非互動環境（CI、無 TTY）：補 --nonInteractive；publish 另補 --serverUrl 跳過確認提示。
if (process.stdin.isTTY !== true && !args.includes('--nonInteractive')) {
  args.push('--nonInteractive');
  if (command === 'publish' && !args.some((a) => a.startsWith('--serverUrl'))) args.push(`--serverUrl=${SERVER_URL}`);
}

// 專案本地固定版本的 eoas（devDependencies 的 3.2.4），不透過 npx 抓浮動版本。
const eoasBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'eoas.cmd' : 'eoas');
if (!fs.existsSync(eoasBin)) {
  console.error('[ota] 找不到 node_modules/.bin/eoas，請先安裝依賴（eoas 應為 devDependency 3.2.4）。');
  process.exit(1);
}
const result = spawnSync(eoasBin, [command, ...args], { stdio: 'inherit', env: process.env, cwd: projectRoot });
process.exit(result.status ?? 1);

// 版面規則的原始碼掃描：這些寫法在窄螢幕（iPhone SE、375pt 以下）會壞，不能再出現。
// - 兩欄排版用 width: '48.5%' 之類（兩欄 + 間距 > 100%）→ 掉成單欄，把畫面擠長、選項被擠到按鈕下面。
/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs: any = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path: any = require('path');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

declare const __dirname: string;
const root: string = path.resolve(__dirname, '../..');
const sources: string[] = [...files(path.join(root, 'src')), ...files(path.join(root, 'app'))];

describe('版面規則（窄螢幕）', () => {
  it("不用 width: '4x%' 排兩欄（改用 flexBasis 留餘裕）", () => {
    const bad: string[] = [];
    for (const f of sources) {
      const text: string = fs.readFileSync(f, 'utf8');
      // 只檢查有換行排版（flexWrap）的檔案；單純的進度條寬度（78%）不是欄位
      if (!text.includes("flexWrap: 'wrap'")) continue;
      text
        .split('\n')
        .forEach((line, i) => {
          const m = line.match(/width:\s*'(\d+(?:\.\d+)?)%'/);
          if (m && Number(m[1]) >= 48 && Number(m[1]) < 100) bad.push(`${path.relative(root, f)}:${i + 1} ${line.trim()}`);
        });
    }
    expect(bad).toEqual([]);
  });
});

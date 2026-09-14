#!/usr/bin/env node
// 小红书只读搜索（批量版）：多关键词逐个搜，词间随机间隔，触发风控立即停
// 用法: node search_ro_batch.mjs --kws "词1,词2,词3" [--out f.json] [--max 24] [--dry-run]
// 额度提醒：每个关键词计 1 次额度；批量更容易触发风控，确认额度账本余量够再跑
const HELP = `search_ro_batch · 小红书只读搜索（批量，多关键词）

用法:
  node search_ro_batch.mjs --kws "<词1>,<词2>,..." [--max 24] [--out f.json] [--dry-run]

参数:
  --kws  逗号分隔的关键词列表（必填）
  --max  每个词最多取多少条（默认 24）
  --out  汇总结果另存 JSON 文件
  --dry-run  只打印计划，不起浏览器

环境变量: 同 search_ro.mjs（XHS_USER_DATA_DIR / TRIP_PLAYWRIGHT_PATH）

风控: 词间随机等 8-15 秒；任一词出现「安全限制/IP 风险」立即中止剩余词。
额度: 词数即搜索次数，先核对 trip-state.md 额度账本。`;

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  if (process.env.TRIP_PLAYWRIGHT_PATH) return import(process.env.TRIP_PLAYWRIGHT_PATH);
  console.error('playwright 不可解析：安装 playwright 或设 TRIP_PLAYWRIGHT_PATH');
  process.exit(2);
}

const argv = process.argv.slice(2);
const val = k => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : undefined; };
if (argv.includes('--help') || argv.includes('-h') || !val('--kws')) { console.log(HELP); process.exit(val('--kws') ? 0 : 2); }

const kws = val('--kws').split(',').map(s => s.trim()).filter(Boolean);
const maxItems = parseInt(val('--max') || '24', 10);
const outFile = val('--out');
const USER_DATA_DIR = process.env.XHS_USER_DATA_DIR
  || path.join(os.homedir(), '.ai-trip-planner', 'xhs-profile');

if (argv.includes('--dry-run')) {
  console.log(JSON.stringify({
    dryRun: true, keywords: kws, maxItems,
    profileDir: USER_DATA_DIR, profileExists: fs.existsSync(USER_DATA_DIR),
    quotaCost: kws.length, note: '去掉 --dry-run 执行（每个词计 1 次额度）',
  }, null, 2));
  process.exit(0);
}

const { chromium } = await loadPlaywright();
const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: true, viewport: { width: 1280, height: 800 }, locale: 'zh-CN',
});
const page = context.pages()[0] || (await context.newPage());
const all = { startedAt: new Date().toISOString(), results: [], aborted: null };

// 登录态前置检查（不计额度）
await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);
const ph = await page.locator('#search-input').getAttribute('placeholder').catch(() => '');
if (ph.includes('登录')) {
  console.log(JSON.stringify({ error: '登录态失效：先跑 node search_ro.mjs --login 扫码' }));
  await context.close();
  process.exit(1);
}

for (let k = 0; k < kws.length; k++) {
  const kw = kws[k];
  const item = { keyword: kw, items: [] };
  try {
    await page.goto(`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(kw)}&source=web_explore_feed`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);
    for (let r = 0; r < 3 && item.items.length < maxItems; r++) {
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(2200 + Math.floor(Math.random() * 1200));
      item.items = await page.evaluate(() => {
        const res = [];
        document.querySelectorAll('section.note-item').forEach(el => {
          const a = el.querySelector('a.cover');
          const title = el.querySelector('.title span, .title')?.textContent?.trim() || '';
          const author = el.querySelector('.author .name')?.textContent?.trim() || '';
          const like = el.querySelector('.like-wrapper .count')?.textContent?.trim() || '';
          if (a && title) res.push({ title, author, like, href: a.getAttribute('href') || '' });
        });
        return res;
      });
    }
    item.items = item.items.slice(0, maxItems);
    item.count = item.items.length;
    item.blocked = (await page.title()).includes('安全限制');
    if (item.blocked) { all.aborted = `「${kw}」触发安全限制，剩余词已中止`; break; }
  } catch (e) { item.error = String(e).slice(0, 150); }
  all.results.push(item);
  if (k < kws.length - 1) {
    const wait = 8000 + Math.floor(Math.random() * 7000);
    await page.waitForTimeout(wait);
  }
}

all.finishedAt = new Date().toISOString();
const line = JSON.stringify(all, null, 2);
console.log(line);
if (outFile) fs.writeFileSync(outFile, line);
await context.close();

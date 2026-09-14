#!/usr/bin/env node
// 小红书只读搜索（单关键词）：仅列表页抓取，不点击、不互动、永不发布
// 登录态目录走环境变量 XHS_USER_DATA_DIR（默认 ~/.ai-trip-planner/xhs-profile）
// 首次使用先跑 --login 扫码，之后 --probe 查登录态，正常搜索直接给关键词
const HELP = `search_ro · 小红书只读搜索（单关键词）

用法:
  node search_ro.mjs "<关键词>"            搜索并输出笔记列表 JSON
  node search_ro.mjs --probe              只查登录态（不搜索，不占额度）
  node search_ro.mjs --login              打开有头浏览器扫码登录（首次使用）
  node search_ro.mjs "<关键词>" --dry-run  只打印将执行的动作，不起浏览器
  node search_ro.mjs "<关键词>" --out f.json  结果另存文件

环境变量:
  XHS_USER_DATA_DIR     登录态目录（默认 ~/.ai-trip-planner/xhs-profile；
                        已有 xiaohongshu-driver 登录态的机器可指过去复用）
  TRIP_PLAYWRIGHT_PATH  playwright 非全局可解析时，指向其 index.mjs

额度提醒: 每次真实搜索计 1 次额度（保守默认每日 ≤10 次、单会话 ≤5 次，
风控经验值非平台规则），用完在 trip-state.md 额度账本记账。`;

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  if (process.env.TRIP_PLAYWRIGHT_PATH) return import(process.env.TRIP_PLAYWRIGHT_PATH);
  console.error('playwright 不可解析：安装 playwright 或设 TRIP_PLAYWRIGHT_PATH（见 --help）');
  process.exit(2);
}

const argv = process.argv.slice(2);
const flag = (...names) => argv.some(a => names.includes(a));
const keywordArg = () => argv.find(a => !a.startsWith('--'));
const outIdx = argv.indexOf('--out');
const outFile = outIdx > -1 ? argv[outIdx + 1] : null;

if (flag('--help', '-h')) { console.log(HELP); process.exit(0); }
const mode = flag('--login') ? 'login' : flag('--probe') ? 'probe' : 'search';
const keyword = keywordArg() || '旅游攻略';
const USER_DATA_DIR = process.env.XHS_USER_DATA_DIR
  || path.join(os.homedir(), '.ai-trip-planner', 'xhs-profile');

if (flag('--dry-run')) {
  console.log(JSON.stringify({
    dryRun: true, mode, keyword,
    profileDir: USER_DATA_DIR, profileExists: fs.existsSync(USER_DATA_DIR),
    playwright: (await import('playwright').then(() => '默认可解析').catch(() =>
      process.env.TRIP_PLAYWRIGHT_PATH ? 'TRIP_PLAYWRIGHT_PATH' : '不可解析（会失败）')),
    note: '去掉 --dry-run 执行真实搜索（计 1 次额度）',
  }, null, 2));
  process.exit(0);
}

const { chromium } = await loadPlaywright();
const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: mode !== 'login',
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
});
const page = context.pages()[0] || (await context.newPage());
const out = { mode, keyword, profileDir: USER_DATA_DIR };

async function loginState() {
  await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  const ph = await page.locator('#search-input').getAttribute('placeholder').catch(() => '');
  return ph.includes('登录') ? '未登录' : `已登录(${ph})`;
}

try {
  if (mode === 'probe') {
    out.loginState = await loginState();
  } else if (mode === 'login') {
    console.log('已打开浏览器：请在页面里扫码登录小红书，登录成功会自动保存登录态（最长等 3 分钟）…');
    for (let i = 0; i < 36; i++) {
      out.loginState = await loginState().catch(() => '探测失败');
      if (!out.loginState.includes('未登录')) break;
      await page.waitForTimeout(5000);
    }
  } else {
    out.loginState = await loginState().catch(() => '探测失败');
    if (out.loginState.includes('未登录')) throw new Error('登录态失效：先跑 --login 扫码（本脚本全程只读，登录由你本人完成）');

    await page.goto(`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(2500);

    out.blocked = (await page.title()).includes('安全限制')
      || (await page.locator('body').innerText().catch(() => '')).includes('IP存在风险');
    out.resultUrl = page.url();
    out.items = await page.evaluate(() => {
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
    out.count = out.items.length;
    if (out.blocked) out.note = '触发风控页：立即停用小红书通道，今日退搜索引擎间接源（见 xiaohongshu.md）';
  }
} catch (e) {
  out.error = String(e);
} finally {
  const line = JSON.stringify(out, null, 2);
  console.log(line);
  if (outFile) fs.writeFileSync(outFile, line);
  await context.close();
}

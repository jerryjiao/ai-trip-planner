#!/usr/bin/env node
// amap-route · 高德增强层路线核数与路线图渲染（key 只从环境变量读，绝不写进文件）
// 用法见 --help。依赖：playwright 可解析（或设 TRIP_PLAYWRIGHT_PATH 指向其 index.mjs）
// 实测口径（2026-09）：securityJsCode 必须在 loader.js 前设 window._AMapSecurityConfig；
// 起终点用坐标（LngLat）最稳；路线用时字段是 route.time（秒）。

const HELP = `amap-route · 车程核数 + 路线图渲染（高德 JSAPI 增强层）

用法:
  node amap-route.mjs --from <lng,lat,名称> --to <lng,lat,名称> [选项]

参数:
  --from <lng,lat,名称>   起点，例: 114.305215,30.604542,武汉站
  --to   <lng,lat,名称>   终点，例: 114.301176,30.544556,黄鹤楼
  --mode <car|bus|walk>   出行方式，默认 car
  --out  <dir>            输出目录（默认 ./out），产出 route.json + route.png
  --dry-run               只打印将执行的动作与环境检查，不发起任何请求
  --help                  本帮助

环境变量:
  AMAP_JSAPI_KEY          必填（Web端 JSAPI 型 key）
  AMAP_SECURITY_CODE      必填（配套安全密钥）
  TRIP_PLAYWRIGHT_PATH    可选，playwright 非全局可解析时指向其 index.mjs

示例:
  AMAP_JSAPI_KEY=xxx AMAP_SECURITY_CODE=yyy node amap-route.mjs \\
    --from 114.305215,30.604542,武汉站 --to 114.301176,30.544556,黄鹤楼`;

function parseArgs(argv) {
  const a = { mode: 'car', out: './out' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--help' || k === '-h') { a.help = true; }
    else if (k === '--dry-run') { a.dryRun = true; }
    else if (k === '--from') { a.from = argv[++i]; }
    else if (k === '--to') { a.to = argv[++i]; }
    else if (k === '--mode') { a.mode = argv[++i]; }
    else if (k === '--out') { a.out = argv[++i]; }
    else { console.error('未知参数: ' + k + '\n'); console.log(HELP); process.exit(2); }
  }
  return a;
}

function parsePoint(s, which) {
  const m = String(s || '').match(/^\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(.+))?\s*$/);
  if (!m) { console.error(`--${which} 格式应为 lng,lat[,名称]，收到: ${s}`); process.exit(2); }
  return { lng: Number(m[1]), lat: Number(m[2]), name: (m[3] || '').trim() || `${which}点` };
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const p = process.env.TRIP_PLAYWRIGHT_PATH;
  if (p) return import(p);
  throw new Error('playwright 不可解析：在脚本可访问的目录安装，或设 TRIP_PLAYWRIGHT_PATH 指向 node_modules/playwright/index.mjs');
}

const args = parseArgs(process.argv.slice(2));
if (args.help) { console.log(HELP); process.exit(0); }
if (!args.from || !args.to) { console.error('缺少 --from 或 --to\n'); console.log(HELP); process.exit(2); }
const from = parsePoint(args.from, 'from');
const to = parsePoint(args.to, 'to');
const KEY = process.env.AMAP_JSAPI_KEY, SEC = process.env.AMAP_SECURITY_CODE;

if (args.dryRun) {
  console.log(JSON.stringify({
    dryRun: true,
    willRender: { from, to, mode: args.mode, outDir: args.out },
    env: { AMAP_JSAPI_KEY: KEY ? `已设置(${KEY.length}字符)` : '缺失', AMAP_SECURITY_CODE: SEC ? '已设置' : '缺失' },
    note: KEY && SEC ? '环境就绪，去掉 --dry-run 执行真实渲染' : '缺 key，真实执行会失败',
  }, null, 2));
  process.exit(0);
}
if (!KEY || !SEC) { console.error('需要环境变量 AMAP_JSAPI_KEY 与 AMAP_SECURITY_CODE（见 --help）'); process.exit(2); }

const { chromium } = await loadPlaywright();
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}#map{width:1400px;height:900px}</style>
<script>window._AMapSecurityConfig={securityJsCode:'${SEC}'};window.onerror=function(m){window.__err=String(m)};</script>
<script src="https://webapi.amap.com/loader.js"></script></head><body><div id="map"></div><script>
window.__done=false; window.__data={};
var PLUGIN = { car: 'AMap.Driving', bus: 'AMap.Transfer', walk: 'AMap.Walking' }['${args.mode}'];
AMapLoader.load({key:'${KEY}', securityJsCode:'${SEC}', version:'2.0', plugins:[PLUGIN]}).then(function(AMap){
  var map = new AMap.Map('map', {zoom: 12});
  window.__map = map;
  var planner = new AMap[PLUGIN.slice(5)]({ map: map, hideMarkers: false });
  var from = new AMap.LngLat(${from.lng}, ${from.lat});
  var to = new AMap.LngLat(${to.lng}, ${to.lat});
  planner.search(from, to, function(status, result){
    if (status !== 'complete') { window.__data = { error: 'search ' + status + ' ' + String(result).slice(0,150) }; window.__done = true; return; }
    var r = (result.routes || result.plans || [])[0];
    if (!r) { window.__data = { error: 'no route', resultShape: Object.keys(result) }; window.__done = true; return; }
    var dist = r.distance || (r.distance || 0);
    var time = r.time || r.duration || (r.steps||r.segments||[]).reduce(function(s,x){return s+(x.time||x.duration||0)},0);
    window.__data = { mode: '${args.mode}', distance_km: +(dist/1000).toFixed(1), duration_min: Math.round(time/60), from: ${JSON.stringify(from.name)}, to: ${JSON.stringify(to.name)} };
    map.setFitView(null, false, [80, 80, 80, 80]);
    window.__done = true;
  });
}).catch(function(e){ window.__data = { error: 'load fail ' + String(e) }; window.__done = true; });
</script></body></html>`;

import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync(args.out, { recursive: true });
const tmpHtml = path.join(args.out, '.amap-route-render.html');
fs.writeFileSync(tmpHtml, html);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1420, height: 960 }, locale: 'zh-CN' });
  await page.goto('file://' + path.resolve(tmpHtml), { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction('window.__done === true', { timeout: 45000 });
  const data = await page.evaluate(() => window.__data);
  if (data.error) { console.error('渲染失败: ' + data.error); process.exit(1); }
  await page.waitForTimeout(2500); // 等瓦片
  await page.screenshot({ path: path.join(args.out, 'route.png') });
  fs.writeFileSync(path.join(args.out, 'route.json'), JSON.stringify({ ...data, generatedAt: new Date().toISOString() }, null, 2));
  fs.rmSync(tmpHtml, { force: true }); // 渲染临时页含安全码，即用即删
  console.log(JSON.stringify(data, null, 2));
} finally { await browser.close(); }

# setup · 环境与依赖总表

> 配套命令：`/trip-doctor`。手册是「查什么、缺了会怎样」，命令是「现在就查一遍」。
> 原则：**缺件可降级，不废全流程**。所有登录与人机验证由用户本人完成，插件只读不代操作。

## 依赖总表

### 工具链

| 依赖 | 是什么 | 去哪拿 | 怎么验证活着 | 没有会怎样 |
|---|---|---|---|---|
| node ≥ 18 | 只读搜索脚本（小红书通道）的运行时 | nodejs.org 或系统包管理器 | `node --version` | 小红书通道降级为搜索引擎间接源 |
| python3 ≥ 3.9 | 图片处理、文本校验 | python.org 或系统包管理器 | `python3 --version` | 图片批量校验退化为逐张人工看 |
| playwright（npm 包） | 浏览器自动化：点评/高德网页操作、小红书脚本 | 项目目录 `npm i playwright && npx playwright install chromium` | `node -e "import('playwright').then(()=>1)"` 在脚本运行目录执行不报错 | 三个平台通道全部降级（见降级矩阵），只剩搜索引擎与 WebFetch |
| wrangler | Cloudflare Pages 部署 CLI | `npm i -g wrangler` | `wrangler --version` | 交付降级为本地静态站（见 deploy 手册） |
| gh | GitHub CLI，仅发布门用 | github CLI 官网 | `gh --version` | 发布门改手动网页操作 |

> playwright 装在哪脚本就在哪跑：脚本用 `import('playwright')` 解析，若装在别的目录（不是全局可解析），用环境变量 `TRIP_PLAYWRIGHT_PATH` 指到那个目录的 `node_modules/playwright/index.mjs`。

### 登录态（三个平台，全部由用户扫码完成）

| 登录态 | 去哪登录 | 怎么验证活着 | 没有会怎样 |
|---|---|---|---|
| 大众点评 | `https://account.dianping.com/pclogin` 扫码 | 打开 `dianping.com` 右上角有用户名即活 | 列表页部分数据可用，进店详情（分项评分/套餐/评价原文）拿不到，产出标注「未登录口径」 |
| 高德网页版 | `https://ditu.amap.com` 右上角扫码 | 打开 ditu.amap.com 右上角有账号名即活 | 基础路线查询未登录也能用，只是更易出验证码；POI 旁路接口与精细渲染不受影响 |
| 小红书 | 跑一次 `node scripts/search_ro.mjs "测试"` 按提示打开浏览器扫码，登录态存进配置目录 | 再跑一次，输出 `loginState: 已登录` | 退搜索引擎间接源（攻略镜像页），软情报质量下降 |

### 环境变量（全部可选，缺了不阻塞）

| 变量 | 作用 | 默认 |
|---|---|---|
| `XHS_USER_DATA_DIR` | 小红书登录态浏览器目录 | `~/.ai-trip-planner/xhs-profile` |
| `TRIP_PLAYWRIGHT_PATH` | playwright 模块入口（装在非默认位置时） | 自动 `import('playwright')` |
| `AMAP_JSAPI_KEY` | 高德增强层：Web 端 JSAPI key，解锁精细路线图渲染 | 无（走基础层） |

> 密钥只放环境变量（如 `~/.zshrc`），任何情况下不写进项目文件、不写进仓库。

## 降级矩阵

缺件对应降级行为。**降级不是失败**，是把该步骤换成质量略低但可用的替代通道，并在产出里如实标注口径。

| 缺什么 | 降级到 | 影响哪一步 | 标注口径 |
|---|---|---|---|
| 小红书登录态 | 搜索引擎间接源（Trip.com 攻略页、马蜂窝、知乎），搜索引擎里 `site:xiaohongshu.com` 也能捞到部分笔记标题 | 软情报（玩法/避雷/动线） | 来源照实写间接源，不冒充小红书原文 |
| 大众点评登录 | 搜索/频道/榜单页未登录一律 302 跳登录（实测 2026-09）；城市页 HTML 仍可拿 cityId。降级：搜索引擎公开快照 + 公开评价页参考 | 硬数据（定店） | 标「未核实·建议出行前 App 复核」 |
| 高德登录 | 基础路线查询不受影响（未登录可查）；精细功能遇验证码即停 | 地图核事实 | 出现验证码时改用免 key 深链给手机端导航 |
| playwright | 三平台网页操作全停，WebFetch/搜索引擎兜底 | 全部平台通道 | 各通道按上述行降级 |
| wrangler | 本地静态站交付：`python3 -m http.server` 起本地服务给家人看，或整目录打包发过去 | 部署上线 | 状态文件部署节记「本地交付」 |
| node | 小红书脚本停用 | 软情报 | 同小红书登录态缺失行 |
| AMAP_JSAPI_KEY | 路线图走基础层（路线结果页整页截图裁剪） | 路线图渲染 | 图注写明截图口径 |

## 新用户十分钟起步

1. 装 node、python3（绝大多数机器已有）。装 playwright：随便建个目录 `npm i playwright && npx playwright install chromium`。
2. 三个平台登录：按上表「去哪登录」逐个扫码。小红书跑一次 `node scripts/search_ro.mjs "任意词"`，弹出的浏览器里登录，登录态会记住。
3. 跑 `/trip-doctor`，全 ✅ 或 ⚠️ 即可开工。有 ❌ 按指引补。

> 常见坑：playwright 装了但脚本目录不对，报 `Cannot find package 'playwright'`。把 `TRIP_PLAYWRIGHT_PATH` 指到实际的 `node_modules/playwright/index.mjs` 即可（见上表）。

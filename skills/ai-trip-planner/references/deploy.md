# deploy · 部署与交付（Cloudflare Pages 主线 / 本地交付降级）

> 纪律（主流程第 9 步）：每轮收尾必须二选一——「**现在部署**」或「**这轮攒着**」，写进 trip-state.md 部署节，不许悬置。

## staging 干净副本（部署前必做）

部署的东西只放上线需要的文件，**绝不携带隐藏目录与本地产物**：

- 带：`*.html`、`*.css`、`img/`、`vendor/`（如果有）
- 不带：`.scratch/`、`.wrangler/`、`.firecrawl/`、`.mimosa/`、`node_modules/`、`trip-state.md`、调研底稿、登录态、`.DS_Store`

用仓库脚本构建（自带排除规则，带 `--dry-run`）：

```bash
scripts/stage_site.sh <攻略站目录> --dry-run   # 先看会带什么
scripts/stage_site.sh <攻略站目录> --out /tmp/stage-<项目名>
```

dry-run 输出里出现任何隐藏目录或状态文件 = 脚本有 bug，停下来看，别手动删了继续。

## 部署（Cloudflare Pages）

```bash
wrangler login                      # 首次，浏览器授权（用户本人完成）
wrangler pages project create <项目名>   # 首次
wrangler pages deploy <staging目录> --project-name=<项目名>
```

- 缺 wrangler / 不想上云：降级**本地交付**——`python3 -m http.server -d <staging目录> 8080` 给家人局域网看，或整目录 zip 发过去。
- 部署完把地址记进 trip-state.md 部署节。

## 部署后验收清单（每次部署跑一遍）

1. **全资源 200**：对每个页面 URL 与关键资源（css/大图）`curl -o /dev/null -w "%{http_code}"`，非 200 逐个修。
2. **六视口复查**：1440/1024/820/700/414/360 各截一张（线上地址），版式与本地一致（模板基线见 templates/README.md）。
3. **锚点跳转**：正文提到餐厅/景处的锚点链接逐个点/核 href。
4. **表格横滑**：窄屏下编辑部表格可滑不破版。
5. **路线图完整**：每张路线图加载成功、可读。
6. **公开前隐私再扫**：站内 grep 一遍敏感信息（真实手机号/订单号/证件号这类，家人姓名视情况），公开站是给「能拿到链接的任何人」看的。

## 本轮攒着时

- staging 目录保留在本地（`/tmp` 会丢的话挪到项目外固定位置），trip-state.md 记「攒着+原因+下次部署触发条件」。

# amap · 高德通道（地图定事实）

双层结构：**基础层零 key**（默认，扫码登录网页版就够跑全流程），**增强层**（用户自配 JSAPI key 解锁精细路线图渲染）。

## 基础层（默认，零 key）

### 登录

打开 `https://ditu.amap.com`，右上角扫码登录。未登录也能查路线，登录后更稳（不易出验证码）。

### POI 同源旁路（评分/坐标/地址/人均）

高德消费站（www.amap.com）的 service 接口**只能从同源页面上下文里 fetch**，别直接 curl：

1. 浏览器通道先开 `https://www.amap.com/`；
2. 在该页面上下文 evaluate：

   ```js
   fetch('/service/poiInfo?query_type=TQUERY&pagesize=30&pagenum=1&qii=true&cluster_state=5&need_utd=true&utd_sceneid=1000&div=PC1000&addr_poi_merge=true&is_classify=true&city=<adcode>&keywords=<关键词>', {credentials:'include'}).then(r=>r.json())
   ```

3. 返回字段：`rating`（高德评分）、`review_total`（评价数）、`domain_list`（id=1001 人均、id=1002 品类/热门标签；value 可能缺，取值前判空）、`longitude/latitude`、`address`、`id`（B0 开头）。
4. 详情页 `https://www.amap.com/detail/<B0id>` 直接打开就能读：地址/电话/营业时间在页面正文头部。

**坑（都踩过）**：
- 高德搜索 UI 在部分自动化环境里不出结果（直开搜索页 403）。**别走 UI，直接打 service 接口**。
- 接口偶发返回 HTML（限流）：隔几秒重试。
- 接口会**间歇性挂起**（fetch 不 resolve 也不报错）：给 fetch 挂 AbortController 超时；一般 10-20 分钟自动恢复；期间 `/detail/<B0id>` 详情页照常可用，先用它顶着。
- 做查询的标签页**别被导航去别的站**：origin 一变 fetch 就跨域失效。

### 车程核数（网页版路线 UI）

`https://ditu.amap.com/dir`，每次查询**新建标签页**再打开：

> **坑（实测）**：全新未登录的自动化环境首访 ditu/dir 会弹「登录+滑块」浮层且关不掉。按红线停，**先让用户扫码登录再查**；已登录会话里此 UI 正常。

1. 起点：填 `#dir_from_ipt` → 等联想（约 2 秒）→ 点 `div.autocomplete-suggestion` 里匹配的项（优先含关键词的项，其次 `.poi` 行）
2. 终点：点 `#dir_to_ipt` 同样操作
3. 点 `a.dir_submit`（「开车去」）→ 等约 6 秒
4. 提取「方案1 约X小时Y分钟 N公里 途经…」

规则：**起终点必须用精确 POI（酒店/餐厅/景区名），不用城市名**；出现「请选择正确的起点/终点」= 联想没选中，重选。

**公交/步行模式（交通核验按出行形态走）**：
- 同一页面起终点填法相同；提交后若结果是驾车，再点一次 `a.dir_submit`（它的文本在「开车去/坐公交/步行」间切换，页面会记住上次模式），切到目标模式。
- 公交方案每条含：时长（分钟）、里程、步行距离、票价、线路名（如「轨道交通1号线 ××路」）；底部有打车参考价。
- 覆盖市内公交/地铁/BRT；长距离混合方案会自动拼入火车段。

**火车与长途以官方渠道为准**：时刻/票价/余票认 12306（登录后），携程/飞猪只作比价参考（通道口径见 hotels.md）；需要抢票的车次写进行前清单并提醒开售时间（通常提前 15 天）。景区区间车/摆渡车认官方公众号与现场时刻表，**尤其记末班车时间**。

### 路线图（基础层口径）

- 做法：路线结果页**整页截图**，按内容区裁剪，存进攻略项目 `img/`，图注写「高德网页版截图 · 日期」。
- 这是**执行期验证项**：整页截图若文字太小/线路不清、不达「路上真能用」标准，改走增强层渲染，或换 Leaflet + 高德瓦片方案，并把结论记进遗留清单。

### 免 key 深链（攻略页导航按钮）

攻略页的「导航」按钮直接挂高德 URI 深链，手机点击唤起高德 App：

```
https://uri.amap.com/navigation?from=<lng>,<lat>,<名称>&to=<lng>,<lat>,<名称>&mode=car&coordinate=gaode&callnative=0
```

- `mode`：`car` / `bus` / `walk`；坐标用高德系（POI 旁路返回的经纬度直接可用）。
- 名称要 URL 编码；`callnative=0` 时无 App 也能落到网页版。

## 增强层（可选，AMAP_JSAPI_KEY）

适合要精细路线图（编号站牌、白描边标签、自动 fitView）的场景。

- **申请**：高德开放平台创建应用 → key 类型选 **Web端(JS API)**，配套安全密钥（securityJsCode）。
- **key 类型坑（必看）**：高德 key 分类型。Web服务型 key 调 restapi 接口才对；拿 JSAPI 型 key 去调 restapi 一律报 `10009 USERKEY_PLAT_NOMATCH`。反过来 JSAPI 只能在浏览器里跑。类型对不上别折腾换参数，先查 key 类型。
- **密钥只走环境变量**（`AMAP_JSAPI_KEY` / `AMAP_SECURITY_CODE` 放 `~/.zshrc`），不写进仓库、不写进交付网页源码。
- **渲染走仓库脚本 `scripts/amap-route.mjs`**（读环境变量 key，起终点坐标进、里程用时 JSON + 路线图 PNG 出）。以下实测要点（2026-09 验证，武汉站→黄鹤楼 11.5km/25min 跑通）：
  - loader.js 现在是 UMD 模块，用法是 `AMapLoader.load({key, securityJsCode, version:'2.0', plugins:[...]})`，不是老文档的 `AMap.plugin` 直调。
  - **securityJsCode 只认 `window._AMapSecurityConfig`**，且必须在 loader.js 加载前设好；`AMapLoader.load({securityJsCode})` 里传了也无效。报错特征：restapi 回 `INVALID_USER_SCODE 10008`（`sec_code_debug` 是空串的 MD5），且地图能出、服务静默挂，很迷惑。
  - **模板里多一个花括号就能让配置块静默死**：渲染页的 script 若有语法错误（比如 onerror 函数多写一个 `}`），`_AMapSecurityConfig` 不会生效且不报明显错误。渲染失败先开浏览器 console 看 SyntaxError。
  - `Driving.search` 的**地名直查在部分环境不触发请求**：先用 Geocoder 拿坐标或直接传 LngLat 坐标最稳。
  - 路线结果的用时字段是 `route.time`（秒），没有 `duration` 字段。
  - `map.setFitView()` 之后再截图，并给起终点留边，防止起点贴边被地图控件遮挡。

## 坑（跨小节）

- **手抄 URL 必须 unquote 全量校验**：任何含编码参数的 URL（点评搜索、高德深链、POI 接口）转抄后，先完整 decode 一遍核对参数与关键词，再投入使用；抄错一个编码字符，静默查错数据。
- 出现验证码/登录墙：停下交用户，不代解、不绕过、不重试触发风控。

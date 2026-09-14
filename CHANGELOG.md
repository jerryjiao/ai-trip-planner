# Changelog

本项目遵守 [语义化版本](https://semver.org/spec/v2.0.0.html)。

## 0.1.0（未发布 · MVP）

首个可用版本：两阶段状态机 + 九篇分域手册 + 三套模板 + 四命令四脚本。

- 主流程 skill：选方案（摸底→搜共识→轻页→拍板）→ 细化（样板→逐天闭环→全站自检→部署）；trip-state.md 七节状态文件跨会话续接
- 命令四件套：`/trip-plan`（入口续接）、`/trip-go`（阶段门）、`/trip-doctor`（环境体检矩阵）、`/trip-help`（迷路导航）
- 九篇分域手册：setup（依赖总表+降级矩阵）/ dianping / amap（零 key 基础层+JSAPI 增强层）/ xiaohongshu（额度账本）/ writing（去 AI 味+餐厅梯度）/ photos（图文相符铁律）/ deploy（staging+验收清单）/ pdf（可选分支）/ pitfalls（跨域流程坑）
- 模板三套：zine 特辑风攻略壳（六视口自适应、零依赖）、lite 方案轻页壳、trip-state 模板；内容全部虚构占位
- 脚本四个：search_ro（小红书只读搜索，--probe/--dry-run）、search_ro_batch（批量限速）、amap-route（车程核数+路线图渲染，key 只走环境变量）、stage_site（部署干净副本，白名单安检）
- 插件双重身份：本体 + 单插件 marketplace（Git URL 一条命令安装）

> 命名备注：体检命令曾定名 `/doctor`，因跨插件命令按先到先得去重、易与别的插件同名命令打架，改回 `/trip-doctor`。

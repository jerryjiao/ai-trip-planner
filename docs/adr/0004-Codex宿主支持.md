# ADR 0004 · Codex 宿主支持：根 plugin.json 可移植清单 + legacy 市场源兼容

- 状态：已接受（2026-09-14）
- 影响：分发层（新增根 `plugin.json`）、README 与官网安装口径；工作流内核零改动

## 背景

插件此前只支持 ZCode / Claude Code 两个宿主（`.zcode-plugin/plugin.json` + `.claude-plugin/marketplace.json`）。Codex CLI（≥ 0.110）上线插件系统后，官方支持读取 `$REPO_ROOT/.claude-plugin/marketplace.json` 作为 legacy 兼容市场源，且插件格式约定从根 `skills/` 自动发现技能——本仓库布局天然吻合。

本机实测（codex-cli 0.154.0，2026-09-14）：仅凭现有 `.claude-plugin/marketplace.json` 即可 `codex plugin marketplace add` → `codex plugin add` 装上，skill 以 `ai-trip-planner:ai-trip-planner` 出现在模型可见的 skills 清单（`codex debug prompt-input` 验证），命令还会被 Codex 安装时自动迁移成 `source-command-*` skill。唯一缺口是版本元数据：legacy 路径下 `codex plugin list` 显示 `version: local`，用户无法感知升级。

## 决策

- 新增**根 `plugin.json`**（agent-plugins.org 可移植格式，官方推荐位）：只承载身份元数据（name / version / description / author / license / keywords），不声明 MCP / apps / hooks；技能继续走根 `skills/` 自动发现。装上后缓存路径带版本号（`…/ai-trip-planner/0.3.0`），`codex plugin list` 正确显示版本。
- `.claude-plugin/marketplace.json` 保持不动：它同时服务 Claude Code 市场安装与 Codex legacy 市场发现。
- Codex 安装口径进入 README 与官网：`codex plugin marketplace add jerryjiao/ai-trip-planner` + `codex plugin add ai-trip-planner@ai-trip-planner`（注意安装子命令是 `add`，不是 `install`）。
- 斜杠命令不向 Codex 移植：Codex 下 `$ai-trip-planner` 显式调用或自然语言直达，工作流 Step 0 会话开局已覆盖入口职责；Codex 的命令自动迁移作为免费兜底。

## 权衡

- 备选「零改动，只写文档」被否：legacy 路径无版本号，且 `.codex-plugin/plugin.json` 由 Codex 安装时自动合成，仓库自身对 Codex 没有正式身份。
- 备选「补 `.codex-plugin/plugin.json` 兼容层」被否：官方已把根 `plugin.json` 定为推荐格式，`.codex-plugin/` 仅为兼容回退。
- 根 `plugin.json` 对 Claude Code / ZCode 无感知（各自只读自己的清单目录），现有安装链路零风险。

## 后果

- Codex 用户两条命令装上即用；升级走 `codex plugin marketplace upgrade` 后重装。
- 分发层形成「三清单」格局：`.zcode-plugin/`、`.claude-plugin/`、根 `plugin.json`，各宿主只读自己的，互不干扰。
- 回退方式：删根 `plugin.json` 即回到 legacy 兼容路径，功能不丢，仅版本元数据退回 `local`。

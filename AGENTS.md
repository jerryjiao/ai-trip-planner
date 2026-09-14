# ai-trip-planner

ZCode / Claude Code / Codex 插件：中文旅行攻略工作流，从调研到上线一条龙（两阶段状态机 + 特辑风网页交付），自驾、自由行、亲子出行皆宜。

> **隐私红线**：本仓库公开。不得写入任何真实行程信息（真实行程/住宿/餐厅实名/家人信息/出行日期/地址/价格战果）。建造期票据在 `.scratch/`（已 gitignore，永不发布），模板与示例一律用虚构占位内容。推送前必须跑隐私审查。

## Agent skills

### Issue tracker

本地 markdown：票据在 `.scratch/<feature>/`，已 gitignore 永不发布。见 `docs/agents/issue-tracker.md`。

### Triage labels

默认五标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文：根 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。

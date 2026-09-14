---
description: 迷路导航：我在哪、下一步干嘛、有哪些命令
---

# /trip-help · 迷路导航

**当前目录有 `trip-state.md`** → 读它，输出三行：
1. 现在：阶段与关键状态（如「阶段二 · day2 进行中，day1 已闭环」）
2. 下一步：按 SKILL.md 流程指出下一个动作（如「day2 研究先行 → 点评定店」）
3. 命令速查（见下表）

**没有项目** → 输出工作流速查，不改任何文件：

```
ai-trip-planner 工作流
阶段一 选方案：/trip-plan 摸底 → 搜共识 → 轻页 → 等拍板
阶段门：/trip-go <方案>
阶段二 细化：样板拍板 → 逐天闭环（软情报→硬数据→地图）→ 全站自检 → 部署
随时：/trip-doctor 查环境 · /trip-help 看路

| 命令 | 干什么 |
|---|---|
| /trip-plan | 总入口：新攻略摸底，老攻略续接 |
| /trip-go <方案> | 拍板，进阶段二 |
| /trip-doctor | 环境体检健康矩阵 |
| /trip-help | 本命令 |
```

流程细节以 `skills/ai-trip-planner/SKILL.md` 为准。

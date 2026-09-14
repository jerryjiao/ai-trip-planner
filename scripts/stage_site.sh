#!/usr/bin/env bash
# stage_site · 构建部署用干净副本：只带上线文件，绝不带隐藏目录与本地产物
# 用法: scripts/stage_site.sh <站点目录> [--out <目录>] [--dry-run]
set -euo pipefail

HELP="stage_site · 构建部署用干净 staging 副本

用法: scripts/stage_site.sh <站点目录> [--out <输出目录>] [--dry-run]

规则:
  带: *.html *.css img/ vendor/ js/（存在才带）
  不带: 一切隐藏目录、trip-state.md、调研底稿、node_modules、.DS_Store、*.log

dry-run 只打印将复制的文件清单，不实际复制。"

SRC="" OUT="" DRY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) echo "$HELP"; exit 0 ;;
    --dry-run) DRY=1 ;;
    --out) OUT="$2"; shift ;;
    *) SRC="$1" ;;
  esac
  shift
done
[[ -z "$SRC" ]] && { echo "$HELP" >&2; exit 2; }
[[ -d "$SRC" ]] || { echo "目录不存在: $SRC" >&2; exit 2; }
OUT="${OUT:-/tmp/stage-$(basename "$SRC")}"

# 只挑上线需要的：显式白名单，其余一概不碰（隐藏目录天然被排除）
FILES=$(cd "$SRC" && find . -maxdepth 2 \( -name '*.html' -o -name '*.css' \) \
  -not -path '*/.*' -not -path './node_modules/*' | sed 's|^\./||' | sort)
DIRS=$(cd "$SRC" && for d in img vendor js; do if [[ -d "$d" ]]; then echo "$d"; fi; done)

# 安检：白名单结果里出现隐藏目录或状态文件 = 出 Bug，硬失败
BAD=$(echo "$FILES" | grep -E '(^|/)\.|trip-state|node_modules' || true)
if [[ -n "$BAD" ]]; then
  echo "⛔ staging 白名单混入禁带文件（脚本 Bug，停止）:" >&2; echo "$BAD" >&2; exit 1
fi

echo "源: $SRC → $OUT"
echo "文件:"; echo "$FILES"
[[ -n "$DIRS" ]] && { echo "目录:"; echo "$DIRS"; }
TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')
echo "共 $TOTAL 个文件$([[ -n "$DIRS" ]] && echo " + 目录: $DIRS" | tr -d '\n')"

if [[ $DRY -eq 1 ]]; then
  echo "[dry-run] 未复制。去掉 --dry-run 执行。"
  exit 0
fi

rm -rf "$OUT"; mkdir -p "$OUT"
# 逐文件复制（while-read + cp --）：文件名含空格/特殊字符也安全，不把列表拼进命令
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  mkdir -p "$OUT/$(dirname "$f")"
  cp -- "$SRC/$f" "$OUT/$f"
done <<< "$FILES"
for d in $DIRS; do
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude '.DS_Store' --exclude '.*' "$SRC/$d/" "$OUT/$d/"
  else
    cp -R -- "$SRC/$d" "$OUT/"
    find "$OUT/$d" -name '.*' -not -name '.' -not -path '*/.*/*' -exec rm -rf {} + 2>/dev/null || true
  fi
done
find "$OUT" -name '.DS_Store' -delete 2>/dev/null || true
echo "✅ staging 就绪: $OUT（$(find "$OUT" -type f | wc -l | tr -d ' ') 个文件）"
echo "下一步: wrangler pages deploy $OUT --project-name=<项目名>（见 references/deploy.md）"

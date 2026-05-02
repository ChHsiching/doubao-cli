#!/usr/bin/env bash
set -euo pipefail

# doubao-cli adapter 安装脚本
# 将 adapters/ 复制到 ~/.bb-browser/sites/doubao/

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADAPTERS_SRC="$SCRIPT_DIR/adapters/doubao"
BB_DIR="$HOME/.bb-browser/sites/doubao"

# 1. Check bb-browser (global or local)
echo -n "检查 bb-browser... "
BB_CMD=""
if command -v bb-browser &>/dev/null; then
    BB_CMD="bb-browser"
elif [ -f "$HOME/.local/bin/bb-browser" ]; then
    BB_CMD="$HOME/.local/bin/bb-browser"
elif [ -f "$SCRIPT_DIR/node_modules/.bin/bb-browser" ]; then
    BB_CMD="$SCRIPT_DIR/node_modules/.bin/bb-browser"
fi

if [ -n "$BB_CMD" ]; then
    BB_VER=$($BB_CMD --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}v${BB_VER}${RESET} ($BB_CMD)"
else
    echo -e "${RED}未安装${RESET}"
    echo ""
    echo "安装 bb-browser:"
    echo "  cd $SCRIPT_DIR && npm install"
    echo "  # 或全局安装:"
    echo "  npm install -g bb-browser --prefix ~/.local"
    echo ""
    echo "bb-browser 会自动发现系统 Chrome/Chromium，无需手动配置。"
    exit 1
fi

# 2. Copy adapters
echo -n "安装适配器... "
mkdir -p "$BB_DIR"
ADAPTER_COUNT=0
for f in "$ADAPTERS_SRC"/*.js; do
    [ -f "$f" ] || continue
    cp "$f" "$BB_DIR/"
    ADAPTER_COUNT=$((ADAPTER_COUNT + 1))
done
echo -e "${GREEN}${ADAPTER_COUNT} 个适配器${RESET}"

# 3. Verify
# Detect if installed globally (doubao-cli is in PATH) or locally (use absolute path)
if command -v doubao-cli &>/dev/null; then
    DOUBAO_CMD="doubao-cli"
else
    DOUBAO_CMD="$SCRIPT_DIR/doubao-cli"
fi

echo ""
echo -e "${BOLD}${GREEN}安装完成！${RESET}"
echo ""
echo "快速开始:"
echo "  $DOUBAO_CMD login         # 首次登录"
echo "  $DOUBAO_CMD '你好'        # 开始聊天"
echo "  $DOUBAO_CMD help          # 查看所有命令"
echo ""
echo "注意: bb-browser 会自动启动 Chrome (后台运行，不阻塞终端)。"
echo "如果系统没有 Chrome，请安装 Chromium 或 Google Chrome。"

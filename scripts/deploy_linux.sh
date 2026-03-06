#!/usr/bin/env bash
# =============================================================================
# R&S Journal — Linux 一键部署脚本 (适配 OpenCloudOS / CentOS / RHEL)
# =============================================================================
set -Eeuo pipefail

# --------------- 默认配置 ---------------
WEB_ROOT="${WEB_ROOT:-/var/www/r-s-journal}"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
NGINX_CONF_NAME="r-s-journal.conf"
RUN_PULL="${RUN_PULL:-0}"
RUN_INSTALL="${RUN_INSTALL:-1}"
SETUP_NGINX="${SETUP_NGINX:-1}"
ENV_FILE="${ENV_FILE:-.env.production}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# --------------- 帮助信息 ---------------
usage() {
  cat <<'EOF'
用法:
  bash scripts/deploy_linux.sh [选项]

选项:
  --web-root <路径>         静态文件发布目录 (默认: /var/www/r-s-journal)
  --pull                    构建前先执行 git pull
  --no-install              跳过 npm ci
  --no-nginx                跳过 Nginx 配置和重启
  -h, --help                显示帮助

环境变量:
  WEB_ROOT                  同 --web-root
  RUN_PULL=1                同 --pull
  RUN_INSTALL=0             同 --no-install
  SETUP_NGINX=0             同 --no-nginx
  ENV_FILE=.env.production  构建用的环境变量文件

示例:
  bash scripts/deploy_linux.sh                    # 首次部署
  bash scripts/deploy_linux.sh --pull             # 日常更新
  bash scripts/deploy_linux.sh --pull --no-install # 快速更新（不重装依赖）
EOF
}

# --------------- 解析参数 ---------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-root)   WEB_ROOT="${2:-}"; shift 2 ;;
    --pull)       RUN_PULL=1; shift ;;
    --no-install) RUN_INSTALL=0; shift ;;
    --no-nginx)   SETUP_NGINX=0; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "未知选项: $1" >&2; usage; exit 1 ;;
  esac
done

# --------------- 工具函数 ---------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
fail()  { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }
run()   { echo -e "${GREEN}==>${NC} $*"; "$@"; }

run_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    run "$@"
  else
    run sudo "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令: $1，请先安装"
}

# --------------- 检查依赖 ---------------
require_cmd npm
require_cmd rsync
[[ "${EUID:-$(id -u)}" -ne 0 ]] && require_cmd sudo
[[ "${RUN_PULL}" == "1" ]] && require_cmd git
[[ "${SETUP_NGINX}" == "1" ]] && require_cmd nginx && require_cmd systemctl

# --------------- 进入项目目录 ---------------
cd "${PROJECT_DIR}"
info "项目目录: ${PROJECT_DIR}"

# --------------- 检查环境变量文件 ---------------
if [[ ! -f "${ENV_FILE}" ]]; then
  fail "找不到 ${ENV_FILE}。请先创建: cp .env.production.example .env.production && vim .env.production"
fi

# --------------- 拉取代码 ---------------
if [[ "${RUN_PULL}" == "1" ]]; then
  info "拉取最新代码..."
  run git pull --ff-only
fi

# --------------- 安装依赖 ---------------
if [[ "${RUN_INSTALL}" == "1" ]]; then
  info "安装依赖..."
  run npm ci
fi

# --------------- 构建 ---------------
info "开始构建..."
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
run npm run build

# --------------- 发布静态文件 ---------------
info "发布静态文件到 ${WEB_ROOT}..."
run_root mkdir -p "${WEB_ROOT}"
run_root rsync -av --delete "${PROJECT_DIR}/dist/" "${WEB_ROOT}/"

# --------------- Nginx 配置 ---------------
if [[ "${SETUP_NGINX}" == "1" ]]; then
  NGINX_CONF_FILE="${NGINX_CONF_DIR}/${NGINX_CONF_NAME}"

  # 如果配置文件不存在，自动生成
  if [[ ! -f "${NGINX_CONF_FILE}" ]]; then
    warn "Nginx 配置不存在，自动创建: ${NGINX_CONF_FILE}"
    run_root tee "${NGINX_CONF_FILE}" > /dev/null <<NGINX_EOF
server {
    listen 80;
    server_name _;

    root ${WEB_ROOT};
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_EOF
    info "Nginx 配置已生成"
  fi

  # 测试配置
  run_root nginx -t

  # 智能判断：Nginx 在运行就 reload，没运行就 start
  if systemctl is-active --quiet nginx; then
    info "重载 Nginx..."
    run_root systemctl reload nginx
  else
    info "启动 Nginx..."
    run_root systemctl start nginx
    run_root systemctl enable nginx
  fi
fi

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  部署完成！静态文件已发布到: ${WEB_ROOT}${NC}"
if [[ "${SETUP_NGINX}" == "1" ]]; then
  echo -e "${GREEN}  Nginx 配置: ${NGINX_CONF_DIR}/${NGINX_CONF_NAME}${NC}"
fi
echo -e "${GREEN}================================================================${NC}"

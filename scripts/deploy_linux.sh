#!/usr/bin/env bash
set -Eeuo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/r-s-journal}"
RUN_PULL="${RUN_PULL:-0}"
RUN_INSTALL="${RUN_INSTALL:-1}"
RELOAD_NGINX="${RELOAD_NGINX:-1}"
ENV_FILE="${ENV_FILE:-.env.production}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy_linux.sh [options]

Options:
  --web-root <path>         Static publish directory (default: /var/www/r-s-journal)
  --pull                    Run git pull --ff-only before build
  --no-install              Skip npm ci
  --no-reload-nginx         Skip nginx -t and systemctl reload nginx
  -h, --help                Show help

Environment variables:
  WEB_ROOT                  Same as --web-root
  RUN_PULL=1                Same as --pull
  RUN_INSTALL=0             Same as --no-install
  RELOAD_NGINX=0            Same as --no-reload-nginx
  ENV_FILE=.env.production  Build env file in project root

Examples:
  ./scripts/deploy_linux.sh
  ./scripts/deploy_linux.sh --pull --web-root /var/www/journal
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-root)
      WEB_ROOT="${2:-}"
      shift 2
      ;;
    --pull)
      RUN_PULL=1
      shift
      ;;
    --no-install)
      RUN_INSTALL=0
      shift
      ;;
    --no-reload-nginx)
      RELOAD_NGINX=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

run() {
  echo "==> $*"
  "$@"
}

run_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    run "$@"
  else
    run sudo "$@"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    exit 1
  fi
}

require_cmd npm
require_cmd rsync

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  require_cmd sudo
fi

if [[ "${RUN_PULL}" == "1" ]]; then
  require_cmd git
fi

if [[ "${RELOAD_NGINX}" == "1" ]]; then
  require_cmd nginx
  require_cmd systemctl
fi

cd "${PROJECT_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE} in ${PROJECT_DIR}." >&2
  echo "Create it first with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_REVIEWER_LOGIN_URL." >&2
  exit 1
fi

if [[ "${RUN_PULL}" == "1" ]]; then
  run git pull --ff-only
fi

if [[ "${RUN_INSTALL}" == "1" ]]; then
  run npm ci
fi

# Export VITE_* from env file for build.
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

run npm run build
run_root mkdir -p "${WEB_ROOT}"
run_root rsync -av --delete "${PROJECT_DIR}/dist/" "${WEB_ROOT}/"

if [[ "${RELOAD_NGINX}" == "1" ]]; then
  run_root nginx -t
  run_root systemctl reload nginx
fi

echo "Deploy finished. Static files published to: ${WEB_ROOT}"

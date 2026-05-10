#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${HOME}/.config/opencode"
BACKUP_DIR="${CONFIG_DIR}.backup.$(date +%Y%m%d-%H%M%S)"

echo "[install] OpenCode dotfiles installer"
echo "[install] Source: ${SCRIPT_DIR}"
echo "[install] Target: ${CONFIG_DIR}"

# 1. Backup current config
echo "[install] Backing up current config to ${BACKUP_DIR}..."
mkdir -p "${CONFIG_DIR}"
cp -aL "${CONFIG_DIR}" "${BACKUP_DIR}"

# 2. Symlink agents/ and plugins/ directories
echo "[install] Linking agents/ and plugins/..."

if [[ -d "${CONFIG_DIR}/agents" && ! -L "${CONFIG_DIR}/agents" ]]; then
  mv "${CONFIG_DIR}/agents" "${BACKUP_DIR}/agents-original"
fi
ln -sfn "${SCRIPT_DIR}/agents" "${CONFIG_DIR}/agents"

if [[ -d "${CONFIG_DIR}/plugins" && ! -L "${CONFIG_DIR}/plugins" ]]; then
  mv "${CONFIG_DIR}/plugins" "${BACKUP_DIR}/plugins-original"
fi
ln -sfn "${SCRIPT_DIR}/plugins" "${CONFIG_DIR}/plugins"

# 3. Symlink opencode.json and package.json (single source of truth)
echo "[install] Linking opencode.json and package.json..."

for file in opencode.json package.json; do
  if [[ -f "${CONFIG_DIR}/${file}" && ! -L "${CONFIG_DIR}/${file}" ]]; then
    mv "${CONFIG_DIR}/${file}" "${BACKUP_DIR}/${file}.original"
  fi
  ln -sfn "${SCRIPT_DIR}/${file}" "${CONFIG_DIR}/${file}"
done

# 4. Install plugin dependencies if bun is available
if command -v bun &>/dev/null && [[ -f "${SCRIPT_DIR}/package.json" ]]; then
  echo "[install] Installing plugin dependencies with bun..."
  (cd "${CONFIG_DIR}" && bun install)
fi

echo "[install] Done."
echo "[install] Backup saved at: ${BACKUP_DIR}"
echo "[install] To uninstall: rm -rf ${CONFIG_DIR} && mv ${BACKUP_DIR} ${CONFIG_DIR}"

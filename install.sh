#!/bin/sh
# Zonot CLI installer (ADR-0023). Downloads the standalone single binary for your
# platform from GitHub Releases — no Bun/Node required. Usage:
#   curl -fsSL https://raw.githubusercontent.com/cdhorne/zonot/main/install.sh | sh
#
# Override: ZONOT_VERSION=v1.2.3 (default: latest) · ZONOT_BIN_DIR=~/.local/bin
set -eu

REPO="cdhorne/zonot"
VERSION="${ZONOT_VERSION:-latest}"
BIN_DIR="${ZONOT_BIN_DIR:-/usr/local/bin}"

os="$(uname -s)"
arch="$(uname -m)"
case "$os" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *) echo "zonot: unsupported OS '$os' — use a Windows binary from the Releases page" >&2; exit 1 ;;
esac
case "$arch" in
  x86_64 | amd64) arch="x64" ;;
  arm64 | aarch64) arch="arm64" ;;
  *) echo "zonot: unsupported architecture '$arch'" >&2; exit 1 ;;
esac

asset="zonot-${os}-${arch}"
if [ "$VERSION" = "latest" ]; then
  url="https://github.com/${REPO}/releases/latest/download/${asset}"
else
  url="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
fi

tmp="$(mktemp)"
echo "zonot: downloading ${asset} (${VERSION})…"
curl -fSL --progress-bar "$url" -o "$tmp"
chmod +x "$tmp"

# Install without sudo when BIN_DIR isn't writable.
if [ -w "$BIN_DIR" ] || [ "$(id -u)" = "0" ]; then
  mv "$tmp" "${BIN_DIR}/zonot"
else
  echo "zonot: ${BIN_DIR} is not writable; using sudo (set ZONOT_BIN_DIR=~/.local/bin to avoid)"
  sudo mv "$tmp" "${BIN_DIR}/zonot"
fi

echo "zonot: installed to ${BIN_DIR}/zonot"
"${BIN_DIR}/zonot" --version

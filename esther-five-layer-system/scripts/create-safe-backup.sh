#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASE_BACKUP_DIR="/d/agentpipeline-backups/esther-five-layer-system"
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BASE_BACKUP_DIR/$STAMP"

mkdir -p "$BACKUP_DIR"

rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.vercel' \
  "$PROJECT_DIR/" "$BACKUP_DIR/esther-five-layer-system/"

cd "$BASE_BACKUP_DIR"
tar -czf "esther-five-layer-system-$STAMP.tar.gz" "$STAMP"

echo "Backup folder: $BACKUP_DIR/esther-five-layer-system"
echo "Archive: $BASE_BACKUP_DIR/esther-five-layer-system-$STAMP.tar.gz"

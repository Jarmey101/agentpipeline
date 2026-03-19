#!/bin/bash
git add .
git commit -m "auto-backup $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null
git push origin main 2>/dev/null

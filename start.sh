#!/bin/bash
# VoltQC — Production startup from shared directory
echo "=== VoltQC Production Startup ==="
SCRIPT_DIR="/home/team/shared/voltqc"
fuser -k 4010/tcp 4020/tcp 2>/dev/null; sleep 0.5

cd "$SCRIPT_DIR/server"
nohup node server.js > /tmp/voltqc-prod.log 2>&1 &
echo "API: http://0.0.0.0:4010 (voltqc.db live data)"

cd "$SCRIPT_DIR/client"
nohup npx vite --host 0.0.0.0 --port 4020 > /tmp/voltqc-client.log 2>&1 &
echo "UI:  http://0.0.0.0:4020"
echo "=== VoltQC Ready ==="
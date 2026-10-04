#!/bin/bash
set -e
echo "=== Phases 1-5 ===" && ./verify-phase5.sh
echo "=== Security ==="
(cd security && npm run build && npm test) && echo "✅ security"
npx playwright test e2e/ && echo "✅ e2e cross-module flow"
docker compose -f deployment/docker-compose.prod.yml config -q && echo "✅ compose valid"
echo "=== ALL PHASES 1-6 COMPILE ✅ — navigation final ✅ ==="

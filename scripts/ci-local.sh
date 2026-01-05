#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Local CI Mirror
# ─────────────────────────────────────────────────────────────────────────────
# Mirrors the GitHub Actions pipeline locally for debugging CI failures.
# Usage: ./scripts/ci-local.sh [--skip-build] [--skip-e2e]
#
# This script runs the same stages as CI but with reduced burn-in iterations.
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
SKIP_E2E=false
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-e2e) SKIP_E2E=true ;;
  esac
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Local CI Pipeline${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Stage 1: Lint
echo -e "${YELLOW}📋 Stage 1: Lint${NC}"
pnpm lint || { echo -e "${RED}❌ Lint failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Lint passed${NC}"
echo ""

# Stage 2: Type Check
echo -e "${YELLOW}🔧 Stage 2: Type Check${NC}"
pnpm check-types:fast || { echo -e "${RED}❌ Type check failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Type check passed${NC}"
echo ""

# Stage 3: Unit Tests
echo -e "${YELLOW}🧪 Stage 3: Unit Tests${NC}"
pnpm test || { echo -e "${RED}❌ Unit tests failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Unit tests passed${NC}"
echo ""

# Stage 4: Build
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}🏗️  Stage 4: Build${NC}"
  pnpm build:local || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }
  echo -e "${GREEN}✅ Build passed${NC}"
  echo ""
else
  echo -e "${YELLOW}⏭️  Stage 4: Build (skipped)${NC}"
  echo ""
fi

# Stage 5: E2E Tests
if [ "$SKIP_E2E" = false ]; then
  echo -e "${YELLOW}🎭 Stage 5: E2E Tests${NC}"
  pnpm test:e2e || { echo -e "${RED}❌ E2E tests failed${NC}"; exit 1; }
  echo -e "${GREEN}✅ E2E tests passed${NC}"
  echo ""
else
  echo -e "${YELLOW}⏭️  Stage 5: E2E Tests (skipped)${NC}"
  echo ""
fi

# Stage 6: Burn-in (reduced)
if [ "$SKIP_E2E" = false ]; then
  echo -e "${YELLOW}🔥 Stage 6: Burn-in (3 iterations)${NC}"
  for i in {1..3}; do
    echo -e "  Iteration $i/3..."
    pnpm test:e2e || { echo -e "${RED}❌ Burn-in failed on iteration $i${NC}"; exit 1; }
  done
  echo -e "${GREEN}✅ Burn-in passed${NC}"
  echo ""
fi

# Success
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Local CI pipeline passed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Safe to push. Run: git push"


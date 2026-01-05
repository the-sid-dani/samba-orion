#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Selective Test Runner
# ─────────────────────────────────────────────────────────────────────────────
# Runs only tests affected by changed files.
# Usage: ./scripts/test-changed.sh [base-branch]
#
# Examples:
#   ./scripts/test-changed.sh           # Compare to main
#   ./scripts/test-changed.sh develop   # Compare to develop
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Configuration
BASE_BRANCH=${1:-main}
SPEC_PATTERN='\.(spec|test)\.(ts|js)$'

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎯 Selective Test Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Base branch: ${YELLOW}$BASE_BRANCH${NC}"
echo ""

# Detect changed test files
echo -e "${YELLOW}📋 Detecting changed test files...${NC}"
CHANGED_SPECS=$(git diff --name-only $BASE_BRANCH...HEAD | grep -E "$SPEC_PATTERN" || echo "")

if [ -z "$CHANGED_SPECS" ]; then
  echo -e "${GREEN}✅ No test files changed.${NC}"
  echo ""
  echo "Running smoke tests as baseline..."
  pnpm test:e2e -- --grep "@smoke" 2>/dev/null || pnpm test:e2e
  exit 0
fi

# Count and display changed specs
SPEC_COUNT=$(echo "$CHANGED_SPECS" | wc -l | xargs)
echo ""
echo -e "Found ${YELLOW}$SPEC_COUNT${NC} changed test file(s):"
echo "$CHANGED_SPECS" | sed 's/^/  - /'
echo ""

# Run tests for changed specs
echo -e "${YELLOW}🧪 Running tests for changed specs...${NC}"
echo ""

# Convert newlines to space-separated list
SPECS_LIST=$(echo "$CHANGED_SPECS" | tr '\n' ' ')

if pnpm test:e2e -- $SPECS_LIST; then
  echo ""
  echo -e "${GREEN}✅ All changed tests passed!${NC}"
else
  echo ""
  echo -e "${RED}❌ Some tests failed.${NC}"
  exit 1
fi


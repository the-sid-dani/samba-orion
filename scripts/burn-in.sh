#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Burn-In Test Runner
# ─────────────────────────────────────────────────────────────────────────────
# Runs tests multiple times to detect flaky behavior.
# Usage: ./scripts/burn-in.sh [iterations] [test-pattern]
#
# Examples:
#   ./scripts/burn-in.sh                    # 10 iterations, all E2E tests
#   ./scripts/burn-in.sh 5                  # 5 iterations, all E2E tests
#   ./scripts/burn-in.sh 10 tests/agents/   # 10 iterations, agent tests only
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Configuration
ITERATIONS=${1:-10}
TEST_PATTERN=${2:-""}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔥 Burn-In Test Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Iterations: ${YELLOW}$ITERATIONS${NC}"
if [ -n "$TEST_PATTERN" ]; then
  echo -e "Pattern:    ${YELLOW}$TEST_PATTERN${NC}"
else
  echo -e "Pattern:    ${YELLOW}(all E2E tests)${NC}"
fi
echo ""

# Track failures
FAILED_ITERATIONS=()

# Burn-in loop
for i in $(seq 1 $ITERATIONS); do
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}🔄 Iteration $i/$ITERATIONS${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ -n "$TEST_PATTERN" ]; then
    if pnpm test:e2e -- "$TEST_PATTERN" 2>&1 | tee "burn-in-log-$i.txt"; then
      echo -e "${GREEN}✅ Iteration $i passed${NC}"
    else
      echo -e "${RED}❌ Iteration $i FAILED${NC}"
      FAILED_ITERATIONS+=($i)

      # Save failure artifacts
      mkdir -p burn-in-failures/iteration-$i
      cp -r test-results/* burn-in-failures/iteration-$i/ 2>/dev/null || true

      echo ""
      echo -e "${RED}🛑 FLAKY TEST DETECTED!${NC}"
      echo "Failure artifacts saved to: burn-in-failures/iteration-$i/"
      echo "Log saved to: burn-in-log-$i.txt"
      echo ""
      exit 1
    fi
  else
    if pnpm test:e2e 2>&1 | tee "burn-in-log-$i.txt"; then
      echo -e "${GREEN}✅ Iteration $i passed${NC}"
    else
      echo -e "${RED}❌ Iteration $i FAILED${NC}"
      FAILED_ITERATIONS+=($i)

      mkdir -p burn-in-failures/iteration-$i
      cp -r test-results/* burn-in-failures/iteration-$i/ 2>/dev/null || true

      echo ""
      echo -e "${RED}🛑 FLAKY TEST DETECTED!${NC}"
      echo "Failure artifacts saved to: burn-in-failures/iteration-$i/"
      echo "Log saved to: burn-in-log-$i.txt"
      echo ""
      exit 1
    fi
  fi

  echo ""
done

# Cleanup logs
rm -f burn-in-log-*.txt 2>/dev/null || true

# Success summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 BURN-IN PASSED${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "All $ITERATIONS iterations passed successfully."
echo "Tests are stable and ready for merge."


# CI/CD Pipeline

> Quality gates for production deployments.

## Overview

The CI pipeline ensures code quality through automated checks:

| Workflow | Trigger | Duration | Purpose |
|----------|---------|----------|---------|
| `pr-validation.yml` | PRs to main/develop, push to main | ~10 min | Lint, type check, unit tests, build |
| `e2e-tests.yml` | PRs to main, push to main/develop | ~15 min | E2E tests with sharding + burn-in |
| `pr-check.yml` | PR events | ~1 min | PR title/description validation |

## Pipeline Stages

### 1. PR Validation (`pr-validation.yml`)

Fast feedback for every PR:

```
Lint → Type Check → Unit Tests → Build → MCP Tool Loading
```

- **Lint**: ESLint + Biome formatting
- **Type Check**: TypeScript (fast mode)
- **Unit Tests**: Vitest suite
- **Build**: Production build verification

### 2. E2E Tests (`e2e-tests.yml`)

Comprehensive E2E testing with flaky detection:

```
Burn-In (PRs only) → Sharded E2E Tests (4x) → Report
```

#### Burn-In Stage
- Runs only on PRs
- Detects changed test files via git diff
- Runs changed specs **5 times** to catch flakiness
- Failure = flaky test detected → blocks merge

#### Sharded E2E Stage
- 4 parallel shards for faster execution
- `fail-fast: false` ensures all shards complete
- Artifacts uploaded only on failure (saves storage)

## Local CI Commands

Mirror CI locally before pushing:

```bash
# Full CI pipeline (lint + type check + unit + build + e2e + burn-in)
./scripts/ci-local.sh

# Skip build (faster)
./scripts/ci-local.sh --skip-build

# Skip E2E (fastest)
./scripts/ci-local.sh --skip-e2e
```

## Burn-In Testing

Detect flaky tests before they reach main:

```bash
# Default: 10 iterations, all E2E tests
./scripts/burn-in.sh

# Custom iterations
./scripts/burn-in.sh 5

# Specific test pattern
./scripts/burn-in.sh 10 tests/agents/
```

**When to use:**
- Before merging large PRs
- After modifying test infrastructure
- When investigating intermittent failures

## Selective Testing

Run only tests affected by your changes:

```bash
# Compare to main (default)
./scripts/test-changed.sh

# Compare to develop
./scripts/test-changed.sh develop
```

## Performance Targets

| Stage | Target | Actual |
|-------|--------|--------|
| PR Validation | <10 min | ~8 min |
| Burn-In | <5 min | ~3 min |
| E2E (per shard) | <10 min | ~8 min |
| Total E2E | <15 min | ~12 min |

**Speedup:** 4× faster than sequential execution through sharding.

## Debugging Failures

### Local reproduction
```bash
# Reproduce CI environment
./scripts/ci-local.sh

# Run specific failing test
pnpm test:e2e -- tests/agents/agents.spec.ts
```

### CI artifacts
- **On failure**: Traces, screenshots, videos uploaded
- **Retention**: 30 days for E2E failures, 7 days for burn-in
- **Location**: Actions tab → Workflow run → Artifacts

### Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Burn-in fails intermittently | Flaky test | Fix timing/race conditions |
| Shard timeout | Slow test or deadlock | Check trace, reduce test scope |
| Build fails | Type error or missing dep | Run `pnpm check-types` locally |

## Secrets Required

Configure in GitHub Settings → Secrets → Actions:

| Secret | Required | Purpose |
|--------|----------|---------|
| `E2E_OPENROUTER_API_KEY` | Optional | LLM provider for E2E tests |
| `GITHUB_TOKEN` | Auto | PR comments, artifacts |

## Workflow Files

```
.github/workflows/
├── pr-validation.yml    # Lint, type check, unit tests
├── e2e-tests.yml        # E2E with burn-in + sharding
├── pr-check.yml         # PR title validation (Danger.js)
├── container.yaml       # Docker builds
├── release.yml          # Release automation
└── claude*.yml          # Claude integrations
```

## Adding New Tests

1. Create spec file in `tests/` following naming convention: `*.spec.ts`
2. Run locally: `pnpm test:e2e -- tests/your-test.spec.ts`
3. Burn-in before PR: `./scripts/burn-in.sh 5 tests/your-test.spec.ts`
4. Submit PR → CI validates automatically

## Maintenance

### Weekly
- Review flaky test reports
- Check CI execution times

### Monthly
- Update dependencies (Playwright, Node)
- Review artifact storage usage
- Tune shard count based on test suite size


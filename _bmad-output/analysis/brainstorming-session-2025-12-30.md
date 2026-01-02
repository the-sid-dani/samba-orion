---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Production-readiness for samba-orion (company-wide deployment)'
session_goals: 'Stability, clean documentation, comprehensive testing, developer experience, CI/CD pipelines'
selected_approach: 'ai-recommended'
techniques_used: []
ideas_generated: []
context_file: '_bmad/bmm/data/project-context-template.md'
---

# Brainstorming Session Results

**Facilitator:** Sid  
**Date:** 2025-12-30

## Session Overview

**Topic:** Making samba-orion production-ready for company-wide use

**Goals:**
1. Stability & Reliability — production-grade quality
2. Documentation Overhaul — clean, organized, archive redundant docs
3. Comprehensive Testing — unit, integration, e2e coverage
4. Developer Experience — solid README, clear onboarding
5. CI/CD Pipelines — automated build, test, deploy workflows

### Context Guidance

This session focuses on software/product development considerations including user problems, feature ideas, technical approaches, UX, and success metrics. Results will feed into Product Brief, PRD, and Technical Specifications.

### Session Setup

- **Nature:** Structured, execution-focused, concrete deliverables
- **Complexity:** High (multiple interconnected workstreams)
- **Approach:** AI-Recommended Techniques

## Technique Selection

**Approach:** AI-Recommended Techniques  
**Analysis Context:** Production-readiness with focus on stability, docs, testing, DX, CI/CD

**Recommended Techniques:**

1. **Question Storming** (deep) — Surface all gaps, unknowns, and blind spots before jumping to solutions
2. **SCAMPER Method** (structured) — Systematically evaluate what to Substitute, Combine, Eliminate, Modify
3. **Constraint Mapping** (deep) — Identify real vs perceived blockers, prioritize roadmap

**AI Rationale:** Production-readiness requires comprehensive problem definition before solution design. This sequence moves from discovery → systematic analysis → prioritization.

---

## Technique Execution Results

### Technique 1: Question Storming (Deep)

**Focus:** Code quality, codebase hygiene, and technical debt

#### Questions Surfaced

**User's Core Concerns:**
- Robustness of code
- Redundant/duplicate code and files
- Code that doesn't make sense
- Incorrect logic
- Specific areas: Chat, shared chat, scrolling, tools, charts, agents, admin/users

#### Codebase Audit Findings

**🔴 Confirmed Dead Code:**

1. **Orphaned Workspace System (~1,470 lines)**
   - `src/components/chat-bot-with-workspace.tsx` - Never imported by any page
   - `src/components/artifacts/workspace.tsx` - Only used by above
   - `src/app/api/artifacts/` - 3 route files only called by above
   - `artifacts/charts/` - Root-level folder only imported by above
   - **Git verified:** Created Sep 22, 2025, never wired up

2. **Legacy Visualization Tools (~90 lines)**
   - `src/lib/ai/tools/visualization/create-bar-chart.ts`
   - `src/lib/ai/tools/visualization/create-line-chart.ts`
   - `src/lib/ai/tools/visualization/create-table.ts`
   - **Evidence:** tool-kit.ts comment says "Legacy visualization tools removed"

3. **Orphaned/Temporary Files:**
   - `src/components/tool-invocation/geographic-chart.tsx.tmp`
   - `src/components/tool-invocation/geographic-chart.tsx.backup`
   - `public/samba-resources/logos/samba_logo_heart_White-2018.png.backup`

**🟡 Complexity Hotspots (1,000+ lines):**
- `baby-research.ts` (2,526 lines) - Workflow example
- `chat-bot-voice.tsx` (1,422 lines)
- `message-parts.tsx` (1,407 lines)
- `chat-bot.tsx` (1,355 lines)
- `canvas-panel.tsx` (1,026 lines)

**🟡 Potential Duplication:**
- `chat-bot.tsx` and `chat-bot-voice.tsx` share Canvas integration patterns
- Admin components: list vs table variants

**📋 TODO/FIXME Found:** 8 files with unresolved markers

#### Key Insights

1. Two parallel Canvas/Artifact systems exist - only one is used
2. ~1,500+ lines of confirmed dead code ready for removal
3. Chat components could benefit from shared abstractions
4. Large files (1,000+ lines) are complexity risks

---

## Prioritized Cleanup Task List

### 🔴 Priority 1: Quick Wins (Low Risk, Immediate Value)

| Task | Files | Lines | Risk | Effort |
|------|-------|-------|------|--------|
| Delete legacy visualization folder | `src/lib/ai/tools/visualization/` (3 files) | ~90 | ⬇️ None | 5 min |
| Delete .tmp/.backup files | 3 files | ~0 | ⬇️ None | 2 min |
| Update artifacts/index.ts | Remove orphaned workspace export | ~2 | ⬇️ Low | 5 min |

**Estimated total: ~15 minutes**

---

### 🟠 Priority 2: Orphaned Workspace System (Medium Risk, High Value)

| Task | Files | Lines | Risk | Effort |
|------|-------|-------|------|--------|
| Delete ChatBotWithWorkspace | `src/components/chat-bot-with-workspace.tsx` | 143 | ⬇️ Low | 5 min |
| Delete workspace.tsx | `src/components/artifacts/workspace.tsx` | ~350 | ⬇️ Low | 5 min |
| Delete artifacts API routes | `src/app/api/artifacts/` (3 files) | ~340 | ⬇️ Low | 10 min |
| Delete lib/artifacts/server.ts | `src/lib/artifacts/server.ts` | ~50 | ⬇️ Low | 5 min |
| Delete root artifacts folder | `artifacts/charts/` (2 files) | ~590 | ⬇️ Low | 5 min |

**Estimated total: ~30 minutes**
**Git-verified as never used**

---

### 🟡 Priority 3: Code Quality (Medium Risk, Medium Value)

| Task | Description | Effort |
|------|-------------|--------|
| Resolve TODO/FIXME markers | Review 8 files, fix or document | 1-2 hrs |
| Review baby-research.ts | 2,526 lines - is this needed? | 30 min |
| Audit admin list vs table components | Check for consolidation opportunity | 30 min |

---

### 🟢 Priority 4: Refactoring (Higher Risk, Long-term Value)

| Task | Description | Effort |
|------|-------------|--------|
| Extract shared Canvas logic | chat-bot.tsx + chat-bot-voice.tsx duplication | 2-4 hrs |
| Split large components | Files over 1,000 lines | 4-8 hrs |
| Improve scrolling behavior | UX investigation needed | TBD |

---

## Recommended Execution Order

```
Sprint 1 (This Week):
├── ✅ Priority 1: Quick Wins (~15 min)
└── ✅ Priority 2: Orphaned Workspace (~30 min)

Sprint 2 (Next Week):
├── 🔄 Priority 3: Code Quality (2-3 hrs)
└── 📋 Document remaining tech debt

Future:
└── 🔄 Priority 4: Refactoring (as capacity allows)
```

---

## Session Summary

**Techniques Used:** Question Storming (with live codebase audit)

**Total Dead Code Identified:** ~1,560 lines across 13 files

**Immediate Actions Available:**
- Priority 1 + 2 can be done in under 1 hour
- Zero risk of breaking production (git-verified unused)

**Next Steps:**
- Create PRD/epic for production readiness
- Include cleanup tasks in sprint planning
- Consider adding CI checks to prevent future dead code

---

## Root Folder & README Audit

### 🔴 Root Folder Cleanup Candidates

**Delete (Dead/Temp Files):**
| Item | Description |
|------|-------------|
| `.backup/` | Old instrumentation backup from Oct 2024 |
| `temp/` | 5 temp planning files (~34KB) |
| `.playwright-mcp/` | 27 screenshot/binary dev artifacts (~3MB) |
| `artifacts/` | Orphaned charts code (confirmed unused) |
| `test_xss_prevention.js` | Random test file at root |
| `test-loading-indicators.html` | Random test file at root |
| `snapshot-tool-registry-before-removal.md` | Stale rollback reference |
| `phase-3-testing-checklist.md` | Completed Sept 2025 testing |
| `production-readiness-checklist.md` | Completed Sept 2025 status |

**Consolidate:**
| Item | Issue |
|------|-------|
| `@claude-plan-docs/` vs `claude-plan-docs/` | Two similar folders - merge |
| `.serena/` | Unknown tool config with duplicates |
| `PRPs/` | 68 planning files - review overlap |

**Archive:**
| Item | Reason |
|------|--------|
| `BRANDING-UPDATE-SUMMARY.md` | Historical reference - move to docs/ |

### 📄 README.md Issues

| Issue | Location | Fix |
|-------|----------|-----|
| Broken image links | Lines 113, 127 | Point to actual screenshots |
| Clone URL | Line 36 | References upstream, not fork |
| Feature count | Line 19 | Says "16+" but have 17 charts |
| Version numbers | Lines 297-301 | May need update |

### Cleanup Command (When Ready)

```bash
# Phase 1: Delete dead files
rm -rf .backup/ temp/ .playwright-mcp/ artifacts/
rm test_xss_prevention.js test-loading-indicators.html
rm snapshot-tool-registry-before-removal.md
rm phase-3-testing-checklist.md production-readiness-checklist.md

# Phase 2: Consolidate
# - Merge @claude-plan-docs/ and claude-plan-docs/
# - Move BRANDING-UPDATE-SUMMARY.md to docs/
# - Review .serena/ and PRPs/
```

---

## Complete Production Readiness Scope

### Code Cleanup (~1,650 lines)
- Dead Workspace system: ~1,470 lines
- Legacy visualization tools: ~90 lines
- Root folder cleanup: ~10 files/folders

### Documentation Updates
- README.md fixes (images, URLs, counts)
- Archive stale markdown files
- Consolidate planning docs

### Outstanding Items (Not Yet Audited)
- Scrolling behavior (UX)
- Agent logic review
- Admin/users component review
- TODO/FIXME resolution (8 files)
- Test coverage gaps



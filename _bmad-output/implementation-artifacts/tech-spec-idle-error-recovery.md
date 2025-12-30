# Tech-Spec: Production Idle Error Recovery

**Created:** 2025-12-30
**Status:** Implemented (Retroactive Documentation)

## Overview

### Problem Statement

Users on ai.samba.com (production) experience a crash after staying idle on the page. The browser displays:

> "Application error: a client-side exception has occurred while loading ai.samba.com"

Refreshing the page resolves the issue temporarily, but it recurs after subsequent idle periods. This creates a poor user experience and gives the impression of an unstable application.

### Solution

Implement a multi-layer error recovery system:

1. **Global Error Boundaries** - Catch unhandled errors at app and root levels, providing graceful recovery UI instead of crashes
2. **WebGL Context Loss Handling** - Add event listeners for browser GPU resource reclamation after idle
3. **User Recovery Actions** - "Try Again" and "Go Home" buttons that clear stale state before retry

### Scope

**In Scope:**

- Create `global-error.tsx` for root-level error boundary
- Create `error.tsx` for app-level error boundary  
- Add `webglcontextlost` / `webglcontextrestored` handlers to WebGL components
- Clear potentially stale SWR cache on recovery

**Out of Scope:**

- SWR polling interval changes
- Auth session timeout handling
- Memory manager interval modifications
- Comprehensive WebGL component refactoring

## Context for Development

### Codebase Patterns

**Error Handling Pattern (from `shared.chat.ts`):**

```typescript
export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }
  if (NoSuchToolError.isInstance(error)) {
    // ... specific handling
  }
  // General fallback
  return errorToString(error.message);
}
```

**WebGL Component Pattern (from `light-rays.tsx`):**

```typescript
useEffect(() => {
  // Initialize WebGL
  const initializeWebGL = async () => { ... };
  
  // Cleanup function
  cleanupFunctionRef.current = () => {
    cancelAnimationFrame(animationIdRef.current);
    // ... cleanup resources
  };
  
  return () => cleanupFunctionRef.current?.();
}, [dependencies]);
```

**Next.js 15 Error Boundary Pattern:**

- `error.tsx` - Catches errors within route segments
- `global-error.tsx` - Catches errors at root level (must include `<html>` and `<body>`)
- Both receive `error` and `reset` props

### Files to Reference

| File | Purpose |
|------|---------|
| `src/app/not-found.tsx` | Existing 404 pattern for UI consistency |
| `src/components/chat-bot.tsx:1138-1165` | Existing local error handling pattern |
| `src/components/ui/button.tsx` | Button component for recovery actions |
| `src/app/(chat)/swr-config.tsx` | SWR configuration (context for cache clearing) |

### Technical Decisions

1. **Why global-error.tsx AND error.tsx?**
   - `global-error.tsx` catches errors in root layout (catastrophic failures)
   - `error.tsx` catches errors within app routes (preserves navigation)
   - Both needed for complete coverage

2. **Why clear SWR cache on recovery?**
   - Stale cache entries after idle can cause hydration mismatches
   - Selective clearing (keep theme/sidebar state) preserves UX

3. **Why event.preventDefault() on context loss?**
   - Prevents browser's default error behavior
   - Allows graceful degradation instead of crash

4. **Why not just wrap in try-catch?**
   - React error boundaries are the idiomatic pattern
   - try-catch doesn't catch render errors
   - Error boundaries provide recovery mechanism

## Implementation Plan

### Tasks

- [x] Task 1: Create `src/app/global-error.tsx`
  - Root-level error boundary with `<html>` and `<body>` tags
  - Log error for observability
  - Clear stale SWR cache on reset
  - Provide "Try Again" and "Go Home" actions

- [x] Task 2: Create `src/app/error.tsx`
  - App-level error boundary using existing UI components
  - Context-aware messaging (detect WebGL errors)
  - Trigger SWR revalidation on reset

- [x] Task 3: Add WebGL context loss handlers to `light-rays.tsx`
  - Listen for `webglcontextlost` event
  - Cancel animation frame on context loss
  - Listen for `webglcontextrestored` for recovery
  - Clean up listeners on unmount

- [x] Task 4: Add WebGL context loss handlers to `particles.tsx`
  - Same pattern as light-rays.tsx

### Acceptance Criteria

- [x] AC 1: Given a user is idle on ai.samba.com for extended period, When browser reclaims GPU resources, Then the app displays error recovery UI instead of crashing
- [x] AC 2: Given error recovery UI is displayed, When user clicks "Try Again", Then the app attempts recovery without full page reload
- [x] AC 3: Given error recovery UI is displayed, When user clicks "Go Home", Then user is redirected to home page
- [x] AC 4: Given WebGL context is lost, When context is restored, Then visual effects reinitialize without error
- [x] AC 5: Given error occurs, When in development mode, Then error details are shown for debugging

## Additional Context

### Dependencies

- No new dependencies required
- Uses existing: `lucide-react` (icons), `@/components/ui/button`

### Testing Strategy

**Manual Testing:**

1. Deploy to preview/staging
2. Open ai.samba.com, leave tab idle for 30+ minutes
3. Return to tab - should show error recovery UI (if error occurs) or work normally
4. Click "Try Again" - should recover
5. Test on Chrome, Safari, Firefox

**Simulated Testing:**

```javascript
// In browser console, simulate context loss:
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
const ext = gl.getExtension('WEBGL_lose_context');
ext.loseContext(); // Should trigger graceful handling
setTimeout(() => ext.restoreContext(), 1000); // Should recover
```

**Future: Automated Testing:**

- Add Playwright test that simulates WebGL context loss
- Add Vitest test for error boundary render

### Notes

- This is a **retroactive tech spec** - implementation was done before documentation
- Session timeout (7 days with 1-day refresh) was ruled out as cause
- The `cookieCache` (1 hour maxAge) could theoretically cause issues but wasn't the immediate cause
- Consider adding Sentry/error tracking integration for production monitoring
- Memory manager intervals (`memory-manager.ts`) have their own error handling and weren't the cause

### Code Review Checklist

For the reviewer in fresh context:

- [x] Verify `global-error.tsx` includes required `<html>` and `<body>` tags
- [x] Verify error logging goes to console (TODO added for production error tracking)
- [x] Verify WebGL event listeners are properly cleaned up on unmount
- [x] Verify "Try Again" actually calls the `reset()` function
- [x] Check for any TypeScript errors
- [x] Verify UI is consistent with app design (uses Tailwind classes)
- [x] Consider: Should we add error tracking service integration? → TODO added

**Code Review Fixes Applied (2025-12-30):**

- Fixed SWR cache key prefix (`$swr$` not `swr-`)
- Fixed `particles.tsx` context restore to actually reinitialize
- Removed irrelevant `window.caches` check in `error.tsx`
- Added TODO comments for error tracking integration

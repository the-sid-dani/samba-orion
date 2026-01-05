# Tech-Spec: Sidebar + Auth Logo with Theme-Aware Variants

**Created:** 2026-01-05
**Status:** Implementation Complete

## Overview

### Problem Statement

The app currently displays "Samba Agentic Audiences" as text (Season font) in multiple places. This needs to be replaced with the official logo image that adapts to light/dark themes - white logo on dark backgrounds, black logo on light backgrounds.

### Solution

Replace the text elements with theme-aware SVG logo images using Next.js `Image` and Tailwind's `dark:` class variants for seamless switching.

### Surfaces Affected (Pages / Layouts)

There are **two** locations in the app that currently render the Season-font text, and **both are in-scope**.

- **Chat / App shell**: `src/components/layouts/app-sidebar.tsx` (sidebar header, shown across all routes under `src/app/(chat)/...`)
- **Auth pages**: `src/app/(auth)/layout.tsx` (left panel headline, shown on `lg+` viewports)

### Scope (In/Out)

**In Scope:**

- Replace text with logo SVG images
- Theme-aware switching (dark mode → white logo, light mode → black logo)
- Maintain exact positioning and centering
- Preserve mobile close button behavior
- Keep brand rendering consistent across all surfaces listed above (Chat sidebar + Auth left panel)

**Out of Scope:**

- Changes to sidebar structure
- Logo redesign or modifications
- Changes to other branding elements
- Any additional surfaces not listed in “Surfaces Affected” (unless added intentionally)

## Context for Development

### Codebase Patterns

- Theme system: `next-themes` with `ThemeProvider`
- Themes: `["light", "dark"]` with `attribute="class"`
- Dark mode: `.dark` class on `<html>` element
- Tailwind pattern: `dark:hidden` / `hidden dark:block` for theme variants

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/layouts/app-sidebar.tsx` | Main file to modify (lines 76-81) |
| `src/app/(auth)/layout.tsx` | Auth left-panel headline surface (in-scope) |
| `src/components/ui/sidebar.tsx` | SidebarMenuButton has `h-8` (32px) height |
| `src/components/layouts/theme-provider.tsx` | Theme system implementation |
| `public/samba-resources/logos/samba-agentic-white.svg` | White logo (dark mode) - **CREATED** |
| `public/samba-resources/logos/samba-agentic-black.svg` | Black logo (light mode) - **CREATED** |

### Technical Decisions

1. **SVG over PNG** - Crisp scaling at any resolution, smaller file size
2. **Two Image components** - Simpler than CSS filters or dynamic src switching; avoids `useTheme()` hydration edge cases
3. **Preserve true aspect ratio** - Use intrinsic SVG aspect ratio (904×91) to avoid subtle distortion; scale via CSS height/width
4. **Avoid overflow in narrow layouts** - Add `w-auto max-w-full` (or similar) so the logo doesn't crowd the mobile close button / narrow containers
5. **`priority` prop** - NOTE: If used on both variants, it will preload **both**; acceptable for tiny SVGs, but be aware it's two preloads
6. **Fragment wrapper** - Keeps sibling mobile close button intact
7. **Surface-specific sizing** - Different contexts need different logo sizes:

| Surface | Logo Height | Rendered Width | Rationale |
|---------|-------------|----------------|-----------|
| Sidebar | `h-[24px]` | ~240px | Tight container (`h-8`), must coexist with close button; includes `ml-0.5 mt-0.5` for fine positioning |
| Auth panel | `h-[32px]` | ~320px | Hero layout, needs visual weight to anchor 776px+ panel |

## Implementation Plan

### Tasks

- [x] Task 1: Update `app-sidebar.tsx` - Replace `<span>` with theme-aware logo images
- [x] Task 2: Update `src/app/(auth)/layout.tsx` - Replace `<h1>` text with theme-aware logo images
- [x] Task 3: Verify visual alignment in both themes
- [x] Task 4: Test responsive behavior (mobile close button + narrow widths)

### Acceptance Criteria

- [x] AC 1: Given dark mode is active, when viewing the sidebar, then the white logo is displayed
- [x] AC 2: Given light mode is active, when viewing the sidebar, then the black logo is displayed
- [x] AC 3: Given any theme, when viewing the sidebar, then the logo is vertically centered within the header
- [x] AC 4: Given mobile viewport, when viewing the sidebar, then the close button remains visible and functional
- [x] AC 5: The logo does not overflow or visually collide with the mobile close button at small widths
- [x] AC 6: Auth layout left panel uses the same theme-aware logo behavior on `lg+`

## Additional Context

### Dependencies

- `next/image` - Already available in Next.js
- Logo SVG files - Already copied to `public/samba-resources/logos/`

### Testing Strategy

1. Visual inspection in dark mode - white logo visible
2. Visual inspection in light mode - black logo visible
3. Toggle theme - logo swaps correctly
4. Mobile viewport - close button still works; logo does not crowd the close icon
5. Narrow widths / long translations elsewhere in header (defensive): logo still fits (no overflow)
6. Sidebar state: expanded vs offcanvas-collapsed (ensure no stray layout jank when opening)
7. No layout shift on page load (especially on first paint)
8. `lg+` auth left panel renders correctly in both themes

### Code Change

**File:** `src/components/layouts/app-sidebar.tsx`

**Before (lines 76-81):**

```tsx
<span
  className="text-lg tracking-wide"
  style={{ fontFamily: "var(--font-season)", fontWeight: 300 }}
>
  Samba Agentic Audiences
</span>
```

**After:**

```tsx
<>
  {/* Dark mode - white logo */}
  <Image
    src="/samba-resources/logos/samba-agentic-white.svg"
    alt="Samba Agentic Audiences"
    width={904}
    height={91}
    className="hidden dark:block h-[24px] w-auto max-w-full ml-0.5 mt-0.5"
    priority
  />
  {/* Light mode - black logo */}
  <Image
    src="/samba-resources/logos/samba-agentic-black.svg"
    alt="Samba Agentic Audiences"
    width={904}
    height={91}
    className="block dark:hidden h-[24px] w-auto max-w-full ml-0.5 mt-0.5"
    priority
  />
</>
```

**Import to add:**

```tsx
import Image from "next/image";
```

---

**File:** `src/app/(auth)/layout.tsx`

**Before (around the existing `<h1>`):**

```tsx
<h1
  className="text-2xl tracking-wide animate-in fade-in duration-1000"
  style={{ fontFamily: "var(--font-season)", fontWeight: 300 }}
>
  Samba Agentic Audiences
</h1>
```

**After:**

```tsx
<h1 className="animate-in fade-in duration-1000">
  <Image
    src="/samba-resources/logos/samba-agentic-white.svg"
    alt="Samba Agentic Audiences"
    width={904}
    height={91}
    className="hidden dark:block h-[32px] w-auto max-w-full"
    priority
  />
  <Image
    src="/samba-resources/logos/samba-agentic-black.svg"
    alt="Samba Agentic Audiences"
    width={904}
    height={91}
    className="block dark:hidden h-[32px] w-auto max-w-full"
    priority
  />
</h1>
```

**Import to add:**

```tsx
import Image from "next/image";
```

### Notes

- Logo files already copied to public folder
- SVG aspect ratio: 904:91 ≈ 10:1
- **Sidebar**: Container height 32px (`h-8`), logo `h-[24px]` with `ml-0.5 mt-0.5` fine-tuning, fits alongside mobile close button
- **Auth panel**: Hero layout (776px+ wide), logo `h-[32px]` → ~320px wide, matches visual weight of original `text-2xl` headline
- Using intrinsic (904×91) avoids subtle distortion vs forcing smaller dimensions

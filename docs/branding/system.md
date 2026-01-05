# Samba AI Branding System

## Overview

Samba AI uses a clean, typography-focused branding approach that prioritizes content and user experience. The branding was updated in January 2026 to display "Samba Agentic Audiences" using the SeasonMix-Light font for brand consistency.

## Design Philosophy

### Core Principles

1. **Typography-First**: Brand identity through elegant custom typography
2. **Minimalist Aesthetic**: Clean, uncluttered interface
3. **Content Priority**: Focus on functionality over embellishment
4. **Accessibility**: Text inherits theme colors automatically

### Visual Identity

- **Brand Name**: "Samba Agentic Audiences" (displayed in UI)
- **Brand Font**: SeasonMix-Light (custom local font)
- **Color Palette**: Inherits from theme (light/dark modes)
- **Spacing**: Wide tracking for refined appearance

## Typography System

### Font Families

The application uses four fonts, each serving specific purposes:

#### 1. Geist (Sans-Serif)
- **Purpose**: Primary content font
- **Variable**: `--font-geist-sans`
- **Usage**: Body text, headings, UI elements

#### 2. Geist Mono (Monospace)
- **Purpose**: Code blocks, technical content
- **Variable**: `--font-geist-mono`
- **Usage**: Code snippets, JSON, file paths

#### 3. Montserrat (Branding - Legacy)
- **Purpose**: Secondary branding (available but not primary)
- **Variable**: `--font-montserrat`
- **Weights**: 300-600

#### 4. SeasonMix-Light (Primary Brand Font)
- **Purpose**: "Samba Agentic Audiences" brand text
- **Variable**: `--font-season`
- **Weight**: 300 (light)
- **Source**: `/public/fonts/SeasonMix-Light.woff2`

### Font Configuration

Fonts are configured in `src/app/layout.tsx`:

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

// Applied to body tag
<body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${seasonMix.variable} antialiased`}>
```

## Branding Implementation

### Authentication Pages

**File**: `src/app/(auth)/layout.tsx`

```tsx
<h1
  className="text-2xl tracking-wide animate-in fade-in duration-1000"
  style={{ fontFamily: "var(--font-season)", fontWeight: 300 }}
>
  Samba Agentic Audiences
</h1>
```

**Key Characteristics**:
- **Font**: SeasonMix-Light (weight 300)
- **Text Size**: `text-2xl` (24px)
- **Tracking**: `tracking-wide`
- **Animation**: Fade-in on page load

### Sidebar Navigation

**File**: `src/components/layouts/app-sidebar.tsx`

```tsx
<span
  className="text-lg tracking-wide"
  style={{ fontFamily: "var(--font-season)", fontWeight: 300 }}
>
  Samba Agentic Audiences
</span>
```

**Key Characteristics**:
- **Font**: SeasonMix-Light (weight 300)
- **Text Size**: `text-lg` (18px)
- **Tracking**: `tracking-wide`

## Brand Application Guidelines

### When to Use SeasonMix-Light

**✅ DO Use For**:
- "Samba Agentic Audiences" brand text
- Hero headings on marketing pages
- Brand-related announcements

**❌ DON'T Use For**:
- Body text or paragraphs
- Form labels or inputs
- Chat messages
- Documentation
- General UI elements

### Typography Hierarchy

```
Brand Identity (SeasonMix-Light)
  └── Auth page: 300 weight, 24px
  └── Sidebar: 300 weight, 18px

Content (Geist Sans)
  └── Headings: Bold, 24-16px
  └── Body: Regular, 16-14px

Code (Geist Mono)
  └── Inline code: Regular, 14px
  └── Code blocks: Regular, 13px
```

## Color System

The application uses a theme-based color system:

- **Light Mode**: Dark text on light background
- **Dark Mode**: Light text on dark background
- **Brand Text**: Inherits `currentColor` from theme automatically

## File Reference

### Font Files

| File | Purpose |
|------|---------|
| `public/fonts/SeasonMix-Light.woff2` | Primary font (WOFF2) |
| `public/fonts/SeasonMix-Light.woff` | Fallback font (WOFF) |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added `seasonMix` local font |
| `src/app/(auth)/layout.tsx` | Brand text with Season font |
| `src/components/layouts/app-sidebar.tsx` | Brand text with Season font |

## Benefits of Custom Font Approach

1. **Performance**: Small font files, no image loading
2. **Scalability**: Text scales perfectly at any resolution
3. **Theming**: Text inherits colors from theme automatically
4. **Accessibility**: Real text, screen-reader friendly
5. **Simplicity**: No light/dark logo variants needed

## Best Practices

### DO ✅

- Use SeasonMix-Light for brand identity elements
- Use weight 300 for consistent appearance
- Use `tracking-wide` for elegant spacing
- Let text inherit theme colors

### DON'T ❌

- Use SeasonMix-Light for body text
- Override theme colors for brand text
- Mix multiple brand fonts in same view
- Use the font at very small sizes

---

**Last Updated**: January 2026
**Version**: 2.0

# TPT Peptides — Aesthetic Redesign Plan

> **Codename:** Phase H (Heritage)  
> **Domain:** [TPTPeptides.com](https://tptpeptides.com)  
> **Goal:** Evolve from high-neon “flashy biotech” to **institutional terminal elegance** — dark, quiet, **subtle metallic gold**, box-free.  
> **Reference mood:** Deep charcoal canvas, wide-track caps, hairline dividers, implied surfaces — never loud.

---

## 1. Design Diagnosis — Today vs Target

| Dimension | Current | Target |
|-----------|---------|--------|
| **Brand** | MedFit / blue biotech | **TPT Peptides** — research terminal identity |
| **Accent** | Flat electric blue + glow | **Metallic gold/bronze** — brushed, not flat fill |
| **Background** | Flat `#050505` + blue blur orbs | Deep charcoal + soft radial warmth (no colored orbs) |
| **Typography** | Georgia serif + mixed weights | Single refined sans — wide caps for labels, light body |
| **Surfaces** | Bordered cards, rounded boxes | **Implied panels** — hairlines, inner luminance, no boxes |
| **Dividers** | `border-white/10` everywhere | **Metallic beams** — 1px, slow drift, low contrast |
| **Buttons** | Solid fills, heavy shadows | Text-forward actions (`VIEW →`) + minimal ghost |
| **Badges** | Colored pill chips | Dot + caps label (`● IN STOCK`) — no backgrounds |
| **Forms** | Bordered input boxes | Underline-only fields on void background |
| **Motion** | Hover lift + blue glow | Beam shimmer at ~5% opacity delta; respect reduced motion |

**Principle:** *Sophistication is restraint.* Metallic accents should feel like **brushed trim on dark hardware** — never jewelry, never neon.

---

## 2. Metallic Language (Non-Distracting)

Metallic ≠ shiny animation everywhere. Use **three tiers**:

| Tier | Use | Technique |
|------|-----|-----------|
| **Whisper** | Hairlines, beam cores | `linear-gradient` gold → champagne → gold at 8–15% opacity |
| **Presence** | Wordmark, prices, active nav | Static metallic gradient text (`background-clip: text`) — no animation |
| **Accent** | Hover on primary actions | Beam brightens one step; 200ms ease, no scale/lift |

**Avoid:** spinning gradients, large gold areas, pulsing glows, skeuomorphic chrome blobs.

### Beam spec (signature divider)

- Height/width: **1px** only  
- Gradient: `transparent → oklch(0.72 0.06 85 / 0.35) → transparent`  
- Animation: `--beam-offset` drift over **14–18s**, linear, infinite  
- `prefers-reduced-motion`: static gradient, no animation  
- Placement: below wordmark, between sections, above footer — **max 1 beam per viewport fold**

### Metallic text (wordmark / prices)

```css
.metallic-gold {
  background: linear-gradient(
    105deg,
    oklch(0.62 0.05 85) 0%,
    oklch(0.82 0.07 90) 45%,
    oklch(0.68 0.05 80) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

No animation on text — the material feel comes from the gradient stops, not movement.

---

## 3. Design Token System

Replace `app/globals.css` tokens with **oklch** (perceptually even metallics):

```css
@theme {
  /* Surfaces */
  --color-void: oklch(0.11 0.008 260);
  --color-surface: oklch(0.15 0.01 260);
  --color-surface-elevated: oklch(0.18 0.012 260);

  /* Text */
  --color-text-primary: oklch(0.94 0.008 260);
  --color-text-secondary: oklch(0.62 0.015 260);
  --color-text-muted: oklch(0.42 0.015 260);

  /* Metallic gold (brush, not flat) */
  --color-gold-deep: oklch(0.58 0.06 85);
  --color-gold-mid: oklch(0.72 0.07 88);
  --color-gold-light: oklch(0.82 0.05 92);
  --color-gold-beam: oklch(0.72 0.06 85 / 0.35);

  /* Hairlines */
  --line-hairline: oklch(1 0 0 / 0.05);
  --line-metallic: linear-gradient(
    90deg,
    transparent,
    var(--color-gold-beam),
    transparent
  );

  /* Type */
  --font-display: var(--font-inter), system-ui, sans-serif;
  --tracking-caps: 0.22em;
  --tracking-title: 0.1em;

  /* Motion */
  --duration-beam: 16s;
}
```

**Remove:** all `--medfit-*` blue tokens, blue box-shadows, Georgia as default display face.

---

## 4. Signature Components

Build in `components/ui/`, consume everywhere.

| Component | Role |
|-----------|------|
| `<MetallicBeam />` | 1px animated hairline divider (horizontal / vertical / top-rule) |
| `<TerminalPanel />` | Card without box — void surface + optional bottom beam on hover |
| `<TerminalLabel />` | Caps + optional gold dot — replaces pill badges |
| `<TerminalInput />` | Underline-only field, gold focus hairline |
| `<TerminalButton />` | Text + arrow; metallic underline on hover |
| `<PageHeader />` | Vertical beam → `TPT PEPTIDES` → subtitle → horizontal beam |

### Page header pattern

```
        │                    ← vertical metallic beam (~40px)
   TPT PEPTIDES             ← metallic gradient or white caps
 RESEARCH INVENTORY · v1     ← muted, tracking-caps
        ───────────          ← horizontal beam
```

---

## 5. Typography

| Role | Treatment |
|------|-----------|
| Wordmark | `TPT PEPTIDES` — caps, `tracking-title`, metallic or white |
| Section labels | `text-xs tracking-caps uppercase text-muted` |
| Headlines | Light weight (300–400), no serif |
| Body | 300 weight, `text-secondary`, relaxed leading |
| SKUs / order IDs | Geist Mono or IBM Plex Mono |

Fonts via `next/font`: Inter (300, 400, 500) — optional Geist Mono for terminal IDs.

---

## 6. Phased Build Plan

### H1 — Foundation (1–2 days) ✅ Complete
- [x] `lib/brand.ts` tokens used site-wide
- [x] oklch `@theme` block in `globals.css`
- [x] Beam keyframes + `.metallic-beam-*` utilities
- [x] Global void background + radial vignette
- [x] `<MetallicBeam />` + `<PageHeader />` components
- [x] Hero + navbar H1 restyle; `/design-system` preview route
- [x] Deprecate all `blue-` Tailwind in storefront

### H2 — Shell (1 day) ✅ Complete
- [x] Navbar: hairline bottom, metallic wordmark, muted nav → gold hover
- [x] Footer: `INSTITUTIONAL RESEARCH ARCHITECTURE · SYSTEM SECURE`
- [x] Age gate: full void, no white card box — beam + text confirm
- [x] Top viewport hairline (optional teal-gold fade at 6% opacity)

### H3 — Component library (2 days) ✅ Complete
- [x] Terminal Input / Button / Panel / Label (primitives in `components/ui/`)
- [x] Migrate checkout, account, admin modals
- [x] Rule: no `border border-white/10 rounded-xl` on new storefront work

### H4 — Storefront surfaces (2–3 days) ✅ Complete
- [x] Hero: beam header pattern, text CTAs not white blocks
- [x] Product cards: TerminalPanel, metallic price, `VIEW →`
- [x] Catalog filters: caps tabs separated by beams
- [x] PDP: hairline variant rows, beam section dividers
- [x] Cart: beam between line items, no nested boxes
- [x] Lab results, protocols, research pages migrated to terminal styling

### H5 — Admin (1–2 days) ✅ Complete
- [x] Same tokens; sidebar active = left metallic beam (not blue fill)
- [x] Tables: row hairlines only

### H6 — Motion & modern CSS (1–2 days) ✅ Complete
- [x] CSS `@property` beam drift
- [x] View Transitions (page crossfade)
- [x] `content-visibility: auto` on catalog grid
- [x] `prefers-reduced-motion` fallbacks

### H7 — QA (1 day) ✅ Complete
- [x] WCAG AA on muted gold text (muted token bumped to oklch 0.48)
- [x] Focus-visible: 1px gold offset ring
- [x] OG/social preview with new palette + TPT Peptides wordmark

---

## 7. Brand Copy Replacements

| Old | New |
|-----|-----|
| MedFit / MEDFIT | TPT Peptides / TPT PEPTIDES |
| medfit.com | TPTPeptides.com |
| medfit-cart (localStorage) | `tpt-cart` (migrate on read) |
| medfit-age-verified | `tpt-age-verified` |
| coa@medfit.com | coa@tptpeptides.com |

Legal pages: update entity name to **TPT Peptides** in `legalContent.ts`.

---

## 8. Anti-Patterns

- Flat gold fills (`#C9A962` blocks)
- Blue/indigo anywhere on storefront
- Animated metallic text
- More than one moving beam per screen fold
- White solid CTA buttons
- Pill category filters with filled backgrounds
- Heavy card lift on hover

---

## 9. Success Criteria

- [x] Site reads as **TPT Peptides** on every customer touchpoint
- [x] Zero `blue-` utilities in storefront components
- [x] Beams visible but never the first thing you notice
- [x] Forms feel like a terminal, not a signup wizard
- [x] Metallic accents on ≤ 10% of pixels in any screenshot

---

*Start with H1 + `<MetallicBeam />` in the hero — validate mood in one afternoon before site-wide rollout.*

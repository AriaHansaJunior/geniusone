# GENIUSONE UI 2.0 — Design System & Stylesheet Specification (CSS.md)

## 1. Document Overview
This document serves as the single authoritative design system specification for **GENIUSONE UI 2.0**.
It governs all visual styles, design tokens, layout foundations, component structures, responsive rules, and interaction patterns across the GENIUSONE enterprise platform.

---

## 2. Design Principles

1. **Professional Enterprise Operations Interface**
   - Designed for mission-critical procurement, inventory, warehouse logistics, and customs documentation.
   - Prioritizes information density, numerical accuracy, visual order, and operational speed over decorative ornamentation.

2. **Restrained Glassmorphism**
   - Employs subtle surface translucency (`rgba(255, 255, 255, 0.78)` – `rgba(255, 255, 255, 0.88)`) paired with soft background blurs (`backdrop-filter: blur(12px) saturate(160%)`) and ultra-fine border lines (`1px solid rgba(226, 232, 240, 0.8)`).
   - Glassmorphism is applied strictly to structural containers (top header, navigation sidebar, elevated cards, dropdowns, and modal dialogs).
   - **Strict Readability Rule:** Text, table cells, form inputs, and audit entries must NEVER be rendered with low-contrast transparency or heavy blur backgrounds that impair legibility.

3. **Clear Information Hierarchy**
   - Strict heading-to-body scale.
   - Data attributes, codes, quantities, and monetary values are visually distinguished from supporting labels.
   - Sequential, uninterrupted document workflows with zero competing duplicate headings.

4. **Serene Blue Identity & Controlled Contrast**
   - Retains the core GENIUSONE blue identity (`#0071E3`) supported by crisp neutral slates and subtle ambient canvas tones (`#F0F5FA` / `#F8FAFC`).
   - High text contrast exceeding WCAG 2.1 AA standards (minimum 4.5:1 for body copy and 3:1 for large headers).

5. **Functional Clarity Over Visual Decoration**
   - Eliminates decorative floating wave animations, non-functional icons, redundant count badges, and excessive decorative gradients.
   - Every pixel, border, and badge serves an operational purpose.

---

## 3. Color System & Design Tokens

### 3.1 Primary & Supporting Brand Palette
```css
:root {
  /* Brand Primary Blue */
  --blue-700: #005bb5;
  --blue-650: #0066cc;
  --blue-600: #0071e3; /* Core GeniusOne Brand Blue */
  --blue-550: #006edb;
  --blue-500: #0076df;
  --blue-400: #2997ff;
  --blue-300: #70b4ff;
  --blue-100: #dbeafe;
  --blue-50:  #eff6ff;
  --blue-25:  #f5f9ff;

  /* Accent & Functional Status Colors */
  --emerald-700: #047857;
  --emerald-600: #059669;
  --emerald-500: #10b981;
  --emerald-50:  #ecfdf5;

  --amber-700: #b45309;
  --amber-600: #d97706;
  --amber-500: #f59e0b;
  --amber-50:  #fffbeb;

  --rose-700: #be123c;
  --rose-600: #e11d48;
  --rose-500: #f43f5e;
  --rose-50:  #fff1f2;

  --purple-700: #6d28d9;
  --purple-600: #7c3aed;
  --purple-500: #8b5cf6;
  --purple-50:  #f5f3ff;
}
```

### 3.2 Neutral Palette & Slate Hierarchy
```css
:root {
  --white:      #ffffff;
  --slate-25:   #fcfdfe;
  --slate-50:   #f8fafc;
  --slate-100:  #f1f5f9;
  --slate-200:  #e2e8f0;
  --slate-300:  #cbd5e1;
  --slate-400:  #94a3b8;
  --slate-500:  #64748b;
  --slate-600:  #475569;
  --slate-700:  #334155;
  --slate-800:  #1e293b;
  --slate-900:  #0f172a;
  --slate-950:  #020617;
}
```

### 3.3 Semantic Token Aliases
```css
:root {
  /* Canvas & Page Backgrounds */
  --canvas:           #f0f5fb;
  --canvas-subtle:    #f8fafc;
  --canvas-ambient:   radial-gradient(130% 90% at 0% 0%, rgba(0, 113, 227, 0.05) 0%, rgba(240, 245, 251, 0) 65%);

  /* Surface Hierarchy */
  --surface-ground:    #f0f5fb;
  --surface-card:      #ffffff;
  --surface-card-sub:  #f8fafc;
  --surface-elevated:  #ffffff;

  /* Typography / Ink Tokens */
  --ink:               var(--slate-900); /* #0f172a - Primary Headings & Data */
  --ink-secondary:     var(--slate-700); /* #334155 - Body Copy */
  --ink-soft:          var(--slate-600); /* #475569 - Secondary Descriptions */
  --muted:             var(--slate-500); /* #64748b - Meta & Inactive */
  --muted-2:           var(--slate-400); /* #94a3b8 - Placeholders & Sublabels */

  /* Structural Borders & Dividers */
  --line-subtle:       rgba(226, 232, 240, 0.6);
  --line:              #e2e8f0;
  --line-strong:       #cbd5e1;
  --line-focus:        var(--blue-600);

  /* Interactive Actions */
  --action-primary:          var(--blue-600);
  --action-primary-hover:    var(--blue-700);
  --action-primary-active:   var(--blue-650);
  --action-secondary:        #ffffff;
  --action-secondary-border: var(--line);
  --action-secondary-hover:  var(--slate-50);

  /* Focus Indicator */
  --focus-ring:        0 0 0 3px rgba(0, 113, 227, 0.22);
  --focus-ring-danger: 0 0 0 3px rgba(225, 29, 72, 0.22);
}
```

---

## 4. Glassmorphism Architecture & Layering

### 4.1 Glass Tokens
```css
:root {
  /* Translucent Surface Tokens */
  --glass-header-bg:     rgba(255, 255, 255, 0.88);
  --glass-sidebar-bg:    rgba(255, 255, 255, 0.82);
  --glass-card-bg:       rgba(255, 255, 255, 0.85);
  --glass-elevated-bg:   rgba(255, 255, 255, 0.94);
  --glass-modal-bg:      rgba(255, 255, 255, 0.98);

  /* Glass Filter Tokens */
  --glass-blur:          blur(12px) saturate(160%);
  --glass-blur-deep:     blur(16px) saturate(180%);

  /* Glass Borders */
  --glass-border:        1px solid rgba(226, 232, 240, 0.82);
  --glass-border-light:  1px solid rgba(255, 255, 255, 0.9);
  --glass-border-subtle: 1px solid rgba(226, 232, 240, 0.5);

  /* Elevation Shadows */
  --shadow-xs:           0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-sm:           0 2px 6px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03);
  --shadow-md:           0 6px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
  --shadow-lg:           0 12px 28px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04);
  --shadow-glass:        0 8px 32px 0 rgba(0, 113, 227, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03);
  --shadow-glass-strong: 0 16px 40px -8px rgba(0, 113, 227, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05);
}
```

### 4.2 Elevation Layers
- **Layer 0 (Canvas Base):** `--canvas` (`#F0F5FA`) with subtle radial wash.
- **Layer 1 (Structural Shell):** Topbar header and sidebar navigation (`backdrop-filter: var(--glass-blur)`, `--glass-border`, `z-index: 20-40`).
- **Layer 2 (Content Cards):** Master data panels, KPIs, table wrappers (`background: var(--glass-card-bg)`, `border: var(--glass-border)`, `box-shadow: var(--shadow-glass)`).
- **Layer 3 (Floating Menus / Tooltips):** Dropdown menus, tooltips, date pickers (`z-index: 1000`, `box-shadow: var(--shadow-lg)`).
- **Layer 4 (Overlays / Modals):** Backdrop dimmers, confirm dialogs, detail drawers (`z-index: 9999`, `--glass-modal-bg`).

### 4.3 Fallbacks for Unsupported Backdrop Filters
```css
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .topbar,
  .sidebar,
  .dashboard-rate-card,
  .card,
  .user-dropdown {
    background-color: #ffffff !important;
  }
}
```

---

## 5. Typography and Spacing Scale

### 5.1 Font Family
- **Primary:** `"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Secondary / Supporting:** `"Noto Sans", sans-serif`
- **Monospace (Item Codes / Document IDs):** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### 5.2 Type Hierarchy
| Level | Font Size | Line Height | Font Weight | Letter Spacing | Target Usage |
|---|---|---|---|---|---|
| Page Eyebrow | 10px | 14px | 800 (Bold) | +1.2px uppercase | Module category tags |
| Page Heading (H1) | 22px | 28px | 800 (Bold) | -0.35px | Primary view title |
| Section Heading (H2)| 16px | 22px | 700 (Bold) | -0.2px | Card & panel titles |
| Sub-heading (H3) | 13.5px | 18px | 700 (Bold) | -0.1px | Sub-panel, drawer headers |
| Body Default | 13px | 18px | 500 (Medium) | normal | Table cells, body narrative |
| Body Strong | 13px | 18px | 700 (Bold) | normal | Row keys, emphasized values |
| Secondary / Meta | 11.5px | 16px | 500 (Medium) | normal | Filter labels, help text |
| Badge / Pill Text | 10.5px | 14px | 700 (Bold) | +0.3px | Status pills, code badges |
| Micro / Footnote | 10px | 13px | 600 (Semi) | +0.4px | Timestamps, table footer |

### 5.3 Spacing Scale
- `2px` (`--space-0-5`): Micro badge padding and border offsets.
- `4px` (`--space-1`): Inner icon gaps, small pill padding.
- `6px` (`--space-1-5`): Compact form input vertical padding.
- `8px` (`--space-2`): Standard button horizontal gaps, form row spacing.
- `12px` (`--space-3`): Card header padding, table cell vertical padding.
- `16px` (`--space-4`): Table cell horizontal padding, card padding.
- `20px` (`--space-5`): Standard page content gap.
- `24px` (`--space-6`): Workspace page outer margin / padding.
- `32px` (`--space-8`): Major layout partition gap.

### 5.4 Corner Radius System
- `--radius-xs`: `4px` (Inputs, buttons, small status badges).
- `--radius-sm`: `6px` (Standard action buttons, search bars, tooltips).
- `--radius-md`: `10px` (Cards, panels, dropdown containers).
- `--radius-lg`: `16px` (Modal windows, full-screen cards).
- `--radius-pill`: `9999px` (Status badges, pill counters, avatars).

---

## 6. Interaction, Animation & Motion Rules

### 6.1 Transition Timing & Curves
```css
:root {
  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

  --duration-fast:   120ms;
  --duration-normal: 180ms;
  --duration-expand: 240ms;
}
```

### 6.2 Motion Guidelines
1. **Micro-interactions:** Button hover/active states, checkbox toggles, and link colors transition at `120ms --ease-standard`.
2. **Structural Transitions:** Sidebar collapse/expand, accordion menus, and dropdown menus transition at `180ms - 240ms --ease-standard`.
3. **No Decorative Bouncing:** Prohibits spring/bounce effects that delay operational data access.

### 6.3 Reduced Motion Enforcement
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Responsive Design Strategy

### 7.1 Target Viewport Tiers
1. **Phone Viewport (`< 768px`)**
   - Single-column fluid layout.
   - Header features a mobile hamburger button to toggle the sidebar drawer.
   - Sidebar functions as an off-canvas drawer with a blurred backdrop overlay (`rgba(15, 23, 42, 0.4)`).
   - Data tables are contained inside scroll wrappers with soft horizontal overflow indicators.
   - Touch targets are padded to a minimum of 38px–44px for reliable touch input.
   - Fixed viewport footer collapses into a compact single-line or stacked status bar.

2. **Laptop & Desktop Viewport (`≥ 768px`)**
   - Multi-column enterprise workspace.
   - Persistent collapsible sidebar:
     - **Expanded State:** `240px` fixed width with hierarchical accordions.
     - **Collapsed State:** `72px` icon rail with floating hover tooltips.
   - Header is fixed/sticky at `64px` height with brand mark, company identifier, and user profile pill.
   - Data tables expand to full content container width with fixed table header and sequential numbering.

---

## 8. Shared Layout Architecture

### 8.1 Header (Topbar)
- **Visual Style:** Pristine translucent glass bar (`rgba(255, 255, 255, 0.88)`), subtle bottom border (`1px solid rgba(226, 232, 240, 0.8)`), soft ambient shadow (`0 2px 10px rgba(0, 113, 227, 0.03)`).
- **Decoration Removal:** The former multicolored, high-CPU flowing canvas wave is **completely removed** and replaced by a calm, authoritative enterprise aesthetic.
- **Brand Mark:** Retains the GeniusOne 3-bar metric mark with bold typography `GENIUSONE` in `--ink` (`#0f172a`) and subtitle `Enterprise Operations` in `--muted` (`#64748b`).
- **Context:** Displays company identifier (`PT GENIUS ONE`) in clear, legible slate typography.
- **User Profile Pill:** Compact interactive pill displaying user initials avatar (`RA`), name, role, and dropdown chevron.
- **Controls:** Includes settings button and sidebar expand/collapse trigger.

### 8.2 Sidebar (Navigation)
- **Visual Style:** Translucent glass panel (`rgba(255, 255, 255, 0.82)`), clean divider line, subtle scrollbar.
- **Hierarchy Preservation:** Retains all 3 main functional domains:
  1. **Procurement:** Transactions (PR, PO), Master Data (Supplier, Terms, Categories, etc.), Reports (PR Report, PO Report, PR-PO Traceability).
  2. **Warehouse:** Stock Notifications, BPB / Receive Note, Master Data (Warehouse Master, Type of Request, Destination Location), Adjustments, Incoming, Outcoming, Reports.
  3. **Exim:** Customs Master Data (Units, Items, QR Code Generator, Brand, Classification, HS Codes, Style, Color, Country, etc.), Operations (Receive Notes, Returns, Document History).
- **Interactive State Styling:**
  - Standard item: subtle hover with soft background (`rgba(0, 113, 227, 0.04)`) and crisp text color shift.
  - Active item: high-contrast blue badge styling with soft pill background (`var(--blue-50)`), bold text (`var(--blue-700)`), and an inset accent marker (`3px solid var(--blue-600)`).
  - Version footer: Clean, compact `v2.0` identifier at the base.

### 8.3 Footer (Application Viewport Footer)
- **Visual Style:** Fixed at viewport base, `38px` height, subtle border top (`1px solid var(--line)`), translucent white background (`rgba(255, 255, 255, 0.8)`).
- **Content:** Copyright `2026 © GENIUSONE` and legal entity `PT. GENIUS MANUFACTURING`.
- **Restraint:** No decorative widgets or redundant badges.

---

## 9. Icon & Decoration Policy

1. **Approved Icon System:** Reuse existing Lucide/Feather vector SVG icons configured in `resources/js/components/ui/Icon.tsx`.
2. **One Icon Per Action:** As mandated by `AGENTS.md`, buttons must never duplicate icons. The `Add New` button renders exactly one `plus` icon.
3. **No Decorative Floating Artworks:** Prohibits canvas particles, gradient meshes, or illustration characters across operational interfaces.
4. **Icons for Recognition:** Icons are reserved for navigation landmarks, search inputs, status indicators, and key operational verbs (Edit, Delete, Download, Print).

---

## 10. Verification & Quality Gates

Every session following this foundation must satisfy:
1. `npm run build` succeeds without bundle or chunk errors.
2. `npx tsc --noEmit` verifies strict TypeScript validity.
3. All existing Laravel route definitions (429 routes) remain fully functional and unbroken.
4. Accessibility contrast verified for text against glass and neutral surfaces.
5. Smooth responsive behavior tested at `<768px` (phone) and `≥768px` (laptop/desktop).

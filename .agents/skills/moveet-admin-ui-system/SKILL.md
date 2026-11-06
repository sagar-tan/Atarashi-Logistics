---
name: moveet-admin-ui-system
description: Industrial dark neomorphic UI design system and component architecture from Moveet Admin (https://moveet-admin.vercel.app) for CPO and fleet operations. Strict tactile surfaces, hairline borders, emerald accents, Tailwind CSS v4, Radix primitives, ZERO glassmorphism.
---

# Moveet Admin UI Design System & Component Architecture
> **Skill / Architecture Reference**: Industrial Dark Neomorphic design system reference adapted from Moveet Admin Portal (`https://moveet-admin.vercel.app`) for the **Atarashi Logistics Admin Portal** (`apps/admin`).

---

## Overview & Philosophy

The Moveet Admin UI is an industrial, high-density operations console engineered for Electric Vehicle (EV) fleet management and Charge Point Operator (CPO) logistics. It is designed with:

1. **Dark Surface Hierarchy (Strict Neomorphism)**: Deep obsidian canvas (`#0D0F0E`), dark matte container surfaces (`#151817`), and elevated control surfaces (`#1B1E1C`). Tactile extruded/inset feel without glossy or glassy reflections.
2. **ZERO GLASSMORPHISM**:
   - `GlassView`, translucent frosted backdrops, blurred gradient panels, and semi-transparent glassy borders are **STRICTLY PROHIBITED**.
   - All surfaces must be solid, tactile, and physically tangible. No `backdrop-blur` or semi-transparent glass cards.
3. **Emerald Neon Accents**: Brand EV green (`#27D968`) reserved for active states, live connectivity pulses, and key operational confirmations.
4. **Subtle Tactile Borders**: Hairline borders (`#282C29` subtle, `#363C38` hover/strong) replacing loud shadows to preserve visual clarity in dense data tables.
5. **Tailwind CSS v4 Engine**: Built on the native `@tailwindcss/vite` compiler without legacy `tailwind.config.js` bloat, using inline `@theme` mapping.
6. **Headless Radix UI Primitives**: Accessible modal dialogs, select dropdowns, popovers, and toolbars styled with strict dark-mode semantics.

---

## 1. Visual Token Architecture & CSS Setup

### 1.1 Complete CSS Theme Definition (`src/styles/theme.css`)

```css
@custom-variant dark (&:is(.dark *));

:root, .dark {
  --font-size: 14px;
  
  /* Core Canvas */
  --background: #0D0F0E;
  --foreground: #F2F4F2;
  
  /* Surface Scale (Base to Hover/Active) */
  --surface-primary: #151817;
  --surface-secondary: #1B1E1C;
  --surface-hover: #212623;
  --surface-active: #272C29;
  
  /* Card & Popovers */
  --card: #151817;
  --card-foreground: #F2F4F2;
  --popover: #151817;
  --popover-foreground: #F2F4F2;
  
  /* Functional Colors & Accents */
  --primary: #27D968;                  /* Neon Emerald Accent */
  --primary-foreground: #0D0F0E;
  --secondary: #1B1E1C;
  --secondary-foreground: #F2F4F2;
  --muted: #1B1E1C;
  --muted-foreground: #929892;
  --accent: #212623;
  --accent-foreground: #F2F4F2;
  --destructive: #EF4444;              /* Fault / Alarm Red */
  --destructive-foreground: #FFFFFF;
  
  /* Borders, Inputs & Radii */
  --border: #282C29;
  --border-subtle: #1F2321;
  --border-strong: #363C38;
  --input: #1B1E1C;
  --input-background: #1B1E1C;
  --switch-background: #282C29;
  --ring: #27D968;
  --radius: 0.5rem;                    /* 8px default radius */
  
  /* Sidebar Specific Tokens */
  --sidebar: #101211;
  --sidebar-foreground: #F2F4F2;
  --sidebar-primary: #27D968;
  --sidebar-primary-foreground: #0D0F0E;
  --sidebar-accent: #1B1E1C;
  --sidebar-accent-foreground: #F2F4F2;
  --sidebar-border: #282C29;
  --sidebar-ring: #27D968;
  
  /* Telemetry & Analytics Charts */
  --chart-1: #27D968;                  /* Active / Charging (Green) */
  --chart-2: #3B82F6;                  /* In Use / Network (Blue) */
  --chart-3: #F59E0B;                  /* Maintenance / Throttled (Amber) */
  --chart-4: #EF4444;                  /* Offline / Faulted (Red) */
  --chart-5: #929892;                  /* Inactive / Idle (Gray) */

  /* Typography Defaults */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-input-background: var(--input-background);
  --color-switch-background: var(--switch-background);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) + 6px);
  
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* Operations Semantic Surface Tokens */
  --color-surface-primary: var(--surface-primary);
  --color-surface-secondary: var(--surface-secondary);
  --color-surface-hover: var(--surface-hover);
  --color-surface-active: var(--surface-active);
  --color-border-subtle: var(--border-subtle);
  --color-border-strong: var(--border-strong);
  --color-moveet-green: #27D968;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }

  html {
    font-size: var(--font-size);
  }

  h1 { font-size: var(--text-2xl); font-weight: var(--font-weight-medium); line-height: 1.5; }
  h2 { font-size: var(--text-xl); font-weight: var(--font-weight-medium); line-height: 1.5; }
  h3 { font-size: var(--text-lg); font-weight: var(--font-weight-medium); line-height: 1.5; }
  h4 { font-size: var(--text-base); font-weight: var(--font-weight-medium); line-height: 1.5; }
  label { font-size: var(--text-base); font-weight: var(--font-weight-medium); line-height: 1.5; }
  button { font-size: var(--text-base); font-weight: var(--font-weight-medium); line-height: 1.5; }
  input { font-size: var(--text-base); font-weight: var(--font-weight-normal); line-height: 1.5; }
}
```

### 1.2 Tailwind v4 Source Injection (`src/styles/tailwind.css`)

```css
@import 'tailwindcss' source(none);
@source '../**/*.{js,ts,jsx,tsx}';

@import 'tw-animate-css';
```

### 1.3 Global Root Styles & Scrollbars (`src/styles/index.css`)

```css
@import './fonts.css';
@import './tailwind.css';
@import './theme.css';

:root {
  color-scheme: dark;
}

/* Dark Operations Scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #0D0F0E;
}

::-webkit-scrollbar-thumb {
  background: #282C29;
  border-radius: 9999px;
  border: 2px solid #0D0F0E;
}

::-webkit-scrollbar-thumb:hover {
  background: #363C38;
}

* {
  scrollbar-width: thin;
  scrollbar-color: #282C29 #0D0F0E;
}

/* Animations */
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.animate-slide-in {
  animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

---

## 2. Shell & Layout Architecture (`Layout.tsx`)

The shell structure provides:
- Collapsible desktop sidebar (256px expanded $\rightarrow$ 64px collapsed icon mode).
- Slide-over mobile drawer.
- Persistent session badge ("OCPP 2.0.1 LIVE" green heartbeat indicator).
- TopBar with live connection pulse, global quick search, and refresh state.
- Constrained main scroll viewport with background `#0D0F0E`.

---

## 3. UI Quality & Design Rules Summary

| Property | Rule / Token | Notes |
| :--- | :--- | :--- |
| **Canvas Background** | `#0D0F0E` | Pure dark obsidian, zero glare. |
| **Card / Surface Primary** | `#151817` | Standard container background (solid matte). |
| **Surface Secondary / Controls** | `#1B1E1C` | Input fields, active tab indicators, table headers. |
| **Hover State** | `#212623` | Subtle, muted shift on hover. |
| **Subtle Border** | `#282C29` | Hairline separator between surfaces. |
| **Hover / Focus Border** | `#363C38` / `#27D968` | Highlight border on hover or active focus. |
| **Brand Accent** | `#27D968` | Emerald green, reserved for primary actions & live signals. |
| **Corner Radius** | `8px` (`0.5rem`) | Uniform, modern rounded corners across cards, buttons, badges. |
| **Type Weights** | Medium (`500`) for headers, Mono for IDs | Serial numbers, UUIDs, and telemetry always use `font-mono`. |
| **Glassmorphism** | Strictly Forbidden | Zero frosted glass or backdrop blurs on cards. |

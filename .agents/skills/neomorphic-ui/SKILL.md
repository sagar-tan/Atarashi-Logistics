---
name: neomorphic-ui
description: Design system rules and technical specifications for Atarashi Logistics Neomorphic Light Theme UI, soft-shadow elevation, capsule buttons, light-green/white palette, and parcel delivery user experience hierarchy.
---

# Neomorphic UI Design System - Atarashi Logistics

## 1. Core Philosophy & Hard Rules
1. **Zero Glassmorphism**:
   - `GlassView`, translucent frosted backdrops, blurred gradient panels, and semi-transparent glassy borders are **STRICTLY PROHIBITED**.
   - All surfaces must be solid, tactile, and physically tangible.
2. **Strict Neomorphism**:
   - Depth is achieved via **dual soft shadows**: a dark shadow cast on the bottom-right and a soft light/white highlight cast on the top-left, simulating soft extrusion from the background canvas.
   - Pressed/depressed states (e.g. active inputs, active pill segments) use soft inset/debossed styling or contrasting pill fills.
3. **Light Mode Foundation**:
   - Background Canvas: Soft tinted chalk/mint-white (`#F4F7F4` or `#F7FAF7`).
   - Surfaces: Pure white (`#FFFFFF`) or off-white (`#EFF3EF`).
   - Primary Accent: Fresh light mint green (`#6EE787`, `#5EDB79`).
   - Contrast/Text: High-contrast rich charcoal/black (`#111813`, `#1A221C`).
   - Secondary Text: Slate sage (`#5A6E60`, `#7D8F82`).
   - Subtle Borders: Soft clay hairline borders (`#E1E8E2`, `#E5ECE6`).
4. **Rounded Geometry & Pill Capsules**:
   - Action buttons, vehicle tabs, segmented controls, and badges **MUST** use continuous capsule pill curves (`borderRadius: 9999` or `32`).
   - Cards and structural tiles use generous rounded corners (`borderRadius: 24` or `28`).
   - Icon holders, quick toggles, and status markers use circular geometry (`borderRadius: 50%`).
5. **Information Architecture & Logistics Hierarchy**:
   - **Customer App (Parcel Senders)**:
     - **Primary (P0)**:
       - "Send a parcel" trigger & Pickup / Dropoff location selection.
       - Vehicle Selector: Bike, Auto, Car, Pickup (with capacity & fare preview).
       - Fare Estimation in integer paise (displayed in rupees ₹).
       - Live Parcel Tracking Cockpit (Driver location, status, ETA).
       - In-app Wallet Balance & Quick Add Money.
     - **Secondary (P1)**:
       - Past Bookings, E-receipts, and Saved Addresses.
   - **Driver App (Courier Partners)**:
     - **Primary (P0)**:
       - Online / Offline Status Toggle Pill.
       - Incoming Booking Dispatch Card (Pickup distance, Dropoff, Fare in ₹, Accept / Reject).
       - Active Delivery Workflow (Arrived at Pickup -> Parcel Picked Up -> In Transit -> Completed).
       - Today's Earnings Summary.
     - **Secondary (P1)**:
       - Vehicle selection, KYC status badge, and Payout Ledger.

---

## 2. Design Tokens & Palette

### Colors
```typescript
export const neomorphTheme = {
  colors: {
    // Canvas & Surfaces
    background: '#F4F7F4',        // Soft off-white chalk canvas
    surface: '#FFFFFF',           // Pure white extruded surface
    surfaceSubtle: '#EDF2EE',     // Slightly recessed surface
    surfacePressed: '#E5EBE6',    // Depressed / active inset surface

    // Primary Accents (Fresh Light Mint Green)
    primary: '#6EE787',           // Vibrant light mint green
    primaryHover: '#5EDB79',
    primaryLight: '#E8F9EC',      // Soft pastel green tint for badges / tags
    primaryDark: '#2F8544',       // Text on light green badges

    // High Contrast Dark Elements
    dark: '#111813',              // Deep charcoal/black for primary text & high-impact buttons
    darkHover: '#1D2720',
    textPrimary: '#111813',       // 100% readable bold text
    textSecondary: '#5A6E60',     // Muted secondary copy
    textMuted: '#8A9E90',         // Subtitles and timestamps
    border: '#E1E8E2',            // Hairline borders between surfaces

    // Logistics Booking Status Colors
    pending: '#FBBF24',           // Pending driver acceptance (Amber)
    assigned: '#38BDF8',          // Driver assigned / approaching pickup (Sky Cyan)
    picked_up: '#818CF8',         // Parcel picked up (Indigo)
    in_transit: '#6EE787',        // Out for delivery / in transit (Mint Green)
    completed: '#22C55E',         // Successfully delivered (Emerald)
    cancelled: '#F87171',         // Cancelled / timed out (Soft Crimson)
  },
  borderRadius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 30,
    pill: 9999,                   // Absolute capsule pills
    circle: 9999,
  },
  shadows: {
    // Extruded Neomorphic Card (Elevated Soft Box)
    extruded: {
      shadowColor: '#1A3320',
      shadowOffset: { width: 4, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 4,
    },
    // Floating Pill / Button
    button: {
      shadowColor: '#1A3320',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 3,
    },
    // Floating Action Circle (FAB / Call / Location Button)
    floating: {
      shadowColor: '#1A3320',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 6,
    },
    // Subtle Inset / Soft Groove
    subtle: {
      shadowColor: '#1A3320',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
  }
};
```

---

## 3. UI Component Archetypes

### 1. Capsule Buttons (`pill-button.tsx`)
- Pill-shaped (`borderRadius: 9999`).
- Primary button: Light Mint Green `#6EE787` with high-contrast `#111813` bold text.
- Dark High-Impact button: Rich `#111813` with pure white `#FFFFFF` bold text.
- Secondary button: Pure `#FFFFFF` surface with soft shadow and `#111813` text.

### 2. Vehicle Selector Pills
- Horizontal pill cards for Bike, Auto, Car, and Pickup.
- Selected vehicle displays mint accent border and subtle elevated shadow.
- Displays estimated delivery time and fare in rupees (converted from paise: `paise / 100`).

### 3. Neomorphic Card Tile (`neomorph-card.tsx`)
- White surface (`#FFFFFF`), `borderRadius: 24`, dual-soft shadow.
- Border: 1px hairline `#E5ECE6` for crisp anti-aliasing on all Android & iOS screens.
- Generous internal padding (18-20px).

### 4. Active Delivery Cockpit
- Live parcel delivery status card showing driver avatar, vehicle type, and real-time progress.
- Status steps: "Driver assigned" -> "Picked up" -> "In transit" -> "Delivered".
- Slide-to-confirm action pill for drivers upon delivery completion.

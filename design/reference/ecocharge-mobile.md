# Atarashi EcoCharge mobile app: design reference

Source: `C:\Users\tw_strat\Atarashi EcoCharge\ecocharge-frontend` (Expo, React Native, expo-router). Tokens are in `src/theme/theme.ts`. Shared components are in `src/components/common/`.

Use this as the design direction for the logistics customer and driver apps. Take the look and the component patterns. Do not copy EV-specific screens or features.

## Look and feel

- Neomorphic light mode: soft extruded white cards on a chalk canvas, with low-contrast shadows. No glassmorphism or blur.
- Mint green is the accent. Dark charcoal is used for primary buttons and headings.
- Pill and capsule shapes for buttons, tabs, and the tab bar. Cards use large rounded corners.
- Icons are `lucide-react-native`.
- Typography uses the system font. Sizes run 11, 13, 15, 17, 20, 24, 32, and 40.

## Color tokens

| Role | Token | Value |
| --- | --- | --- |
| Accent | `primary` | `#6EE787` |
| Accent hover | `primaryHover` | `#5EDB79` |
| Accent tint | `primaryLight` | `#E8F9EC` |
| Accent dark | `primaryDark` | `#2F8544` |
| Dark (buttons, headings) | `dark` / `darkHover` | `#111813` / `#1D2720` |
| Canvas | `background` | `#F4F7F4` |
| Surface (cards) | `surface` | `#FFFFFF` |
| Recessed surface | `surfaceSubtle` | `#EDF2EE` |
| Pressed surface | `surfacePressed` | `#E5EBE6` |
| Text primary | `textPrimary` | `#111813` |
| Text secondary | `textSecondary` | `#5A6E60` |
| Text muted | `textMuted` | `#8A9E90` |
| Border | `border` | `#E2E9E3` |
| Success | `success` | `#5EDB79` |
| Warning | `warning` | `#FBBF24` |
| Error | `error` | `#F87171` |
| Info / in use | `info` | `#38BDF8` |

Status colors for EV states (available, charging, faulted, reserved, offline) should carry over to booking states: pending, assigned, in transit, completed, and cancelled.

## Spacing, radius, shadow

- Spacing: 4, 8, 16, 24, 32, 48.
- Radius: 8, 12, 18, 24, 30, and 9999 (capsule). Cards use 30 (`xl`).
- Shadows are soft and low-contrast. `card` uses offset (0, 2), opacity 0.04, radius 8. `button` uses opacity 0.06, radius 6. `floating` uses offset (0, 4), opacity 0.07, radius 10. Shadow color is `#0E1E12`.

## Components to reuse

- **NeomorphCard** (`NeomorphCard.tsx`): card with variants `elevated`, `flat`, `pressed`, and `mint`. Wraps `TactileCard` for press feedback (scale to 0.982) when it has `onPress`.
- **Button** (`Button.tsx`): variants `primary`, `dark`, `secondary`, `outline`, and `ghost`. Sizes `sm`, `md`, and `lg`. Supports `isLoading`, `disabled`, and an `icon` slot.
- **CustomTabBar** (`CustomTabBar.tsx`): a floating capsule bar at the bottom. The active tab gets a filled circle icon. Tabs are Home, Chargers, Activity, and Wallet.
- **PillTabs** (`PillTabs.tsx`): segmented control with a sliding capsule indicator. Spring physics, a haptic tick on change, and optional count badges.
- **Input**, **FeatheredHorizontalScroll**, **FilterBottomSheet**, and **ChargerCard / VehicleCard**: reuse as patterns for list items and forms.

## Screen patterns

- Home: greeting header with an initials avatar and a bell. Then an active-session banner, a primary "scan" hero card, a vehicle status card, and a feature grid. Pull-to-refresh with `RefreshControl`.
- Lists: cards with a leading icon tile, a title, a muted subtitle, and a trailing chevron or status pill.
- Receipts: "Digital Tax Invoice" layout. Centered logo and name, an uppercase green label, then dotted dividers between sections.
- Bottom padding on scroll views must clear the floating tab bar (`insets.bottom + 85`, minimum 115).

## Not for reuse

- The EV screens: charger maps, live kWh meter, RFID, OCPP, and trip planner.
- The sample invoice screenshot (`screen.png`). It shows real names in a share sheet, so it is not copied into the project.
- The stored `.env` and `google-services.json` in that folder.

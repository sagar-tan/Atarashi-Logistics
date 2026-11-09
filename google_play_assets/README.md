# Google Play Store Media & Upload Package: Atarashi Logistics

This directory contains the production-ready creative assets, formatted screenshots, and copy metadata required to publish both the **Customer App** and **Driver App** on the Google Play Console.

---

## Directory Overview

```
google_play_assets/
├── customer_app/                           # com.atarashi.customer
│   ├── icon/
│   │   ├── icon_512x512.png                # Play Store Icon (512x512, 32-bit PNG with alpha)
│   │   └── adaptive_icon_foreground.png    # Android Adaptive Foreground
│   ├── feature_graphic/
│   │   └── feature_graphic_1024x500.png    # Store Banner (1024x500, 24-bit RGB PNG, no alpha)
│   ├── screenshots/                        # Phone Screenshots (1080x2424, 24-bit RGB PNG, no alpha)
│   │   ├── 01_fleet_vehicle_selection.png  # Fleet Choice: 2-Wheeler, 3-Wheeler, Trucks & Shifting
│   │   ├── 02_instant_pricing_and_booking.png # Live Fare Breakdown (Paise standard) & Booking
│   │   ├── 03_phone_otp_authentication.png # India-first +91 Mobile & OTP Card
│   │   └── 04_enterprise_operations_login.png # Enterprise & B2B Operations Sign In
│   └── metadata/
│       ├── app_details.txt                 # Title, Short Description, Full Description
│       └── store_urls.txt                  # Privacy Policy & Account Deletion endpoints
│
├── driver_app/                             # com.atarashi.driver
│   ├── icon/
│   │   ├── icon_512x512.png                # Play Store Icon (512x512, 32-bit PNG with alpha)
│   │   └── adaptive_icon_foreground.png    # Android Adaptive Foreground
│   ├── feature_graphic/
│   │   └── feature_graphic_1024x500.png    # Store Banner (1024x500, 24-bit RGB PNG, no alpha)
│   ├── screenshots/                        # Phone Screenshots (1080x2424, 24-bit RGB PNG, no alpha)
│   │   ├── 01_driver_cockpit_and_earnings.png # Offline Cockpit & Shift Earnings
│   │   ├── 02_online_dispatch_radar.png    # Live Online Dispatch Radar & Status
│   │   ├── 03_instant_delivery_order_offer.png # Incoming Order Request Card with Payout
│   │   ├── 04_live_courier_route_navigation.png # Turn-by-Turn Courier Route Navigation
│   │   └── 05_active_trip_lifecycle.png    # Order State Machine: Pickup OTP to Completion
│   └── metadata/
│       ├── app_details.txt                 # Title, Short Description, Full Description
│       ├── location_disclosure_script.txt  # Background location declaration & demo video guide
│       └── store_urls.txt                  # Privacy Policy & Account Deletion endpoints
│
└── shared_brand/
    ├── app_icon_master_512.png             # Master 512x512 PNG
    ├── logo_brand_horizontal.png           # Master Horizontal Brand Logo
    ├── emblem_master.png                   # Hexagonal Brand Emblem
    └── brand_tokens.json                   # Color codes, geometry, technical specs
```

---

## Step-by-Step Google Play Console Upload Mapping

### 1. Main Store Listing > Graphics
For each app in Google Play Console (*Grow* > *Store presence* > *Main store listing*):

| Google Play Console Field | Source File | Requirements |
| :--- | :--- | :--- |
| **App Icon** | `customer_app/icon/icon_512x512.png`<br/>`driver_app/icon/icon_512x512.png` | 512x512 px, 32-bit PNG with alpha, < 1024 KB |
| **Feature Graphic** | `customer_app/feature_graphic/feature_graphic_1024x500.png`<br/>`driver_app/feature_graphic/feature_graphic_1024x500.png` | 1024x500 px, 24-bit RGB PNG (no alpha), < 15 MB |
| **Phone Screenshots** | `customer_app/screenshots/*.png`<br/>`driver_app/screenshots/*.png` | 1080x2424 px, 24-bit RGB PNG (no alpha), min 2, max 8 |

### 2. Main Store Listing > Listing Details
Copy and paste from `metadata/app_details.txt`:
- **App name**: Max 30 characters
- **Short description**: Max 80 characters
- **Full description**: Formatted with clear bullet points and feature breakdown

### 3. App Content & Regulatory Declarations
- **Privacy Policy**: Enter the URL from `metadata/store_urls.txt`.
- **Account Deletion**: Enter the Web Account Deletion URL from `metadata/store_urls.txt`.
- **Driver Background Location**: Follow the script in `driver_app/metadata/location_disclosure_script.txt` for the video submission and questionnaire answers.

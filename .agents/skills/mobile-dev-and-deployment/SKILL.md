---
name: mobile-dev-and-deployment
description: Standard operational procedures and automated testing commands for building, running, deploying, and debugging the Atarashi Logistics Customer and Driver mobile apps on Android Studio Emulators and USB-connected physical Android devices.
---

# Mobile Development, Emulator Testing & Device Runbook

## 1. Overview & Scope
This skill provides the exact commands, automated testing workflows, and troubleshooting procedures for running and testing the **Atarashi Logistics** Expo React Native mobile applications:
- **Customer App**: `@atarashi/customer` (`apps/customer`), package `com.atarashi.customer`
- **Driver App**: `@atarashi/driver` (`apps/driver`), package `com.atarashi.driver`

Both applications use Expo SDK 58, React Native 0.88+, Expo Router, and React Native Reanimated.

---

## 2. Android Studio Emulator & Device Workflow

### Step 1: Detect Connected Emulator or Physical Device
Check if ADB sees the running emulator or USB device:
```powershell
adb devices -l
```
*Expected Outputs:*
- **Android Studio Emulator:** `emulator-5554 device product:sdk_gphone64_x86_64 model:Pixel_9 device:emu64x`
- **Physical Device:** `<device_serial> device ...`

> [!TIP]
> If the Android Studio emulator is not running, it can be launched directly via CLI:
> ```powershell
> & "C:\Users\tw_strat\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_9
> ```
> Wait ~15 seconds until `adb shell getprop sys.boot_completed` returns `1`.

If multiple devices are attached, use `-s <device_id>` (e.g. `adb -s emulator-5554 ...`).

### Step 2: Set Up Reverse Port Forwarding
Ensure the device/emulator can communicate with Metro on port 8081:
```powershell
adb reverse tcp:8081 tcp:8081
adb reverse --list
```

### Step 3: Native Build & Run on Target Device
Run either app using Expo or Gradle:

**For Customer App (`apps/customer`):**
```powershell
cd apps\customer
npx expo run:android
# Or via Gradle directly:
cd android
.\gradlew.bat installDebug
cd ..\..\..
```

**For Driver App (`apps/driver`):**
```powershell
cd apps\driver
npx expo run:android
# Or via Gradle directly:
cd android
.\gradlew.bat installDebug
cd ..\..\..
```

### Step 4: Wake & Launch MainActivity
Launch the desired app:

```powershell
# Customer App:
adb shell am force-stop com.atarashi.customer
adb shell am start -n com.atarashi.customer/.MainActivity

# Driver App:
adb shell am force-stop com.atarashi.driver
adb shell am start -n com.atarashi.driver/.MainActivity
```

---

## 3. Automated App Testing & UI Inspection Protocol

Any coding agent can autonomously interact with, test, and visually inspect the apps on the emulator or device using ADB.

### 1. Visual Verification (Screen Capture)
Capture an instant screenshot from the emulator/device to inspect rendering, layout, and visual fidelity:
```powershell
adb exec-out screencap -p > screen.png
```
*Then use `read_file` on `screen.png` to inspect the live interface.*

### 2. UI Layout Hierarchy Dump
Inspect the exact on-screen UI components, text labels, bounds `[x1,y1][x2,y2]`, and clickable states:
```powershell
adb shell uiautomator dump /sdcard/ui_dump.xml
adb pull /sdcard/ui_dump.xml ui_dump.xml
```
*Read `ui_dump.xml` to locate exact click coordinates for buttons, inputs, and tabs.*

### 3. User Input & Touch Simulation
Simulate touch gestures, typing, and system buttons:
- **Tap Coordinates:**
  ```powershell
  adb shell input tap <x> <y>
  ```
- **Enter Text into Active Input:**
  ```powershell
  adb shell input text "9876543210"
  ```
- **Swipe / Scroll:**
  ```powershell
  # Swipe up (scroll down):
  adb shell input swipe 540 1800 540 600 300
  ```
- **Key Events:**
  - Back button: `adb shell input keyevent 4`
  - Home button: `adb shell input keyevent 3`
  - Enter: `adb shell input keyevent 66`
  - React Native Dev Menu: `adb shell input keyevent 82`
  - Reload JS: `adb shell input keyevent 46` twice (press 'R' twice)

### 4. Reading Runtime Logs & Crash Traces
Check for uncaught JavaScript exceptions, Hermes crashes, or native errors:
```powershell
adb logcat -d *:E | Select-String "ReactNativeJS|AndroidRuntime|FATAL"
```

---

## 4. Troubleshooting & Rules
- **Page Size Compatibility (16 KB vs 4 KB)**: Android 15/17 16KB page-size images require all native `.so` binaries to be 16KB aligned. If Hermes or native modules fail on API 37, use an API 34/35 emulator.
- **Continuous Native Generation**: Never edit `android/` or `ios/` manually without good cause; prefer configuring native behaviors via `app.json` and Expo config plugins.
- **Port Conflicts**: If port 8081 is busy or blocked, run `adb reverse tcp:8081 tcp:8081` and restart Metro with `npx expo start --clear`.

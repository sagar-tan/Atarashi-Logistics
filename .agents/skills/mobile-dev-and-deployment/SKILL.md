---
name: mobile-dev-and-deployment
description: Standard operational procedures and automated testing commands for building, running, deploying, and debugging the Atarashi Logistics Customer and Driver mobile apps on Android Studio Emulators and USB-connected physical Android devices.
---

# Mobile Development, Emulator Testing & Device Runbook

> [!CRITICAL]
> ## STRICT DEVICE TARGET PROTOCOL
> 1. **Autonomous Development & Testing -> EMULATOR ONLY**:
>    - While implementing features, making edits, fixing bugs, and verifying UI, **ONLY target the Android Studio Emulator** (`emulator-5554` / `Pixel_9`).
>    - **NEVER** push, deploy, or install development changes to a connected physical device during autonomous coding iterations.
>    - Always qualify ADB commands with `-s emulator-5554` to ensure traffic never spills onto attached hardware.
> 2. **Physical Device Installation -> ONLY ON EXPLICIT USER REQUEST**:
>    - Install onto the physical phone via USB debugging **ONLY AND STRICTLY when the user asks to test it themselves** (e.g. *"install on my phone"*, *"install via USB debugging"*, *"let me test it"*).

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

When both emulator and physical device are connected, **always specify `-s emulator-5554`** for all development operations.

### Step 2: Set Up Reverse Port Forwarding (Emulator)
Ensure the emulator can communicate with Metro on port 8081:
```powershell
adb -s emulator-5554 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse --list
```

### Step 3: Development Loop on Android Studio Emulator (Default & Exclusive for Dev)
Run or install the debug build onto the emulator:

**For Customer App (`apps/customer`):**
```powershell
cd apps\customer\android
.\gradlew.bat installDebug -PreactNativeArchitectures=x86_64
cd ..\..\..
```

**For Driver App (`apps/driver`):**
```powershell
cd apps\driver\android
.\gradlew.bat installDebug -PreactNativeArchitectures=x86_64
cd ..\..\..
```

### Step 4: Physical Device Installation via USB Debugging (ON-DEMAND ONLY)
> [!NOTE]
> Execute this step **ONLY** when the user explicitly asks: *"install on my phone"*, *"test it myself"*, or *"install via USB"*.

1. Identify the physical device serial from `adb devices`:
   ```powershell
   adb devices -l
   # Example: RZGL304MCMB device product:pa1qxins model:SM_S931B
   ```
2. Build standalone release or debug APK:
   - For standalone APK (recommended for testing on phone without Metro):
     ```powershell
     cd apps\customer\android
     .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
     cd ..\..\..
     ```
3. Install onto the physical device using its exact serial:
   ```powershell
   adb -s <physical_serial> install -r apps\customer\android\app\build\outputs\apk\release\app-release.apk
   ```
4. Launch app on the physical device:
   ```powershell
   adb -s <physical_serial> shell am start -n com.atarashi.customer/.MainActivity
   ```

### Step 5: Wake & Launch MainActivity on Emulator (Dev Verification)
Launch on emulator:

```powershell
# Customer App:
adb -s emulator-5554 shell am force-stop com.atarashi.customer
adb -s emulator-5554 shell am start -n com.atarashi.customer/.MainActivity

# Driver App:
adb -s emulator-5554 shell am force-stop com.atarashi.driver
adb -s emulator-5554 shell am start -n com.atarashi.driver/.MainActivity
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

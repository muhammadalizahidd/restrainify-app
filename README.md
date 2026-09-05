# Restrainify Mobile App

Android-first Restrainify V1 implementation workspace.

This repository is intentionally scaffolded around the approved source documents:

- `AGENT.md`
- `DESIGN.md`
- `Restrainify_V1_Product_PRD.md`
- `Restrainify_V1_Technical_PRD.md`

Every implementation task must read those documents first. They define the mandatory product behavior, technical boundaries, privacy constraints, and UI rules.

## Architecture

```text
apps/
  mobile/          React Native presentation layer and native bridge contracts
packages/
  contracts/       Shared TypeScript contracts for sync, health, and API payloads
  config/          Shared lint, TypeScript, and environment conventions
supabase/
  migrations/      PostgreSQL/RLS migrations
docs/
  architecture/    Implementation plans and system notes
  decisions/       Architecture decision records for unresolved PRD choices
  security/        Threat model and privacy notes
  testing/         Validation strategy and release gates
```

## Non-Negotiable Invariants

- Real-time protection decisions stay on-device.
- React Native never owns protection truth.
- Kotlin owns Android protection runtime, Room access, service lifecycle, UsageStats, Accessibility, VPN/DNS filtering, and visual ML scheduling.
- Cloud sync never sits in the real-time protection path.
- Raw screen frames are never persisted or uploaded.
- The product must not claim absolute uninstall prevention.
- UI state must reconcile from native truth on app foreground.

## Web Ownership

The public website, web auth surfaces, and web/API backend live in the separate `restrainify.com` repository. This repository owns the Android mobile app and shared mobile-facing contracts only.

## Brand Token Gate

`DESIGN.md` requires extracting exact colors from `restrainify.com` before visual implementation. The live site could not be inspected from this environment during scaffold creation, so the mobile design token file contains temporary values and a release-blocking note. Replace those values with verified production website tokens before implementing final UI styling.

## Getting Started

The runtime stack is recorded in `docs/decisions/ADR-0002-runtime-stack.md` and `docs/decisions/ADR-0003-adopt-expo-tooling.md` (React Native 0.86.3, Expo SDK 57, AGP 8.12.0, Gradle 9.3.1, JDK 17+, Node >= 22.13).

```bash
npm install
npm run check
```

On Windows PowerShell in this local environment, the bare `npm` shim may point at a broken roaming profile path. Use `C:\Program Files\nodejs\npm.cmd` directly if that happens.

## Daily Workflow

All commands from `apps/mobile/` (or from the repo root with `--workspace=@restrainify/mobile`).

### Emulator

```bash
emulator @Pixel_9_Pro            # or start any AVD from Android Studio Device Manager
npm run android                  # builds (incremental), installs, launches the dev client, hosts Metro
```

### Physical phone

Enable Developer options and USB debugging, connect, then:

```bash
adb devices                      # verify the phone is listed as "device"
npm run android                  # installs on the connected phone
npx expo run:android --device    # explicit device picker when emulator + phone are connected
```

Over Wi-Fi (same network, no cable): `npm start` and scan the QR code with the dev client.

### JS development loop

```bash
npm start                        # keep running
```

Saving a file applies fast refresh automatically. Shortcuts: `r` reload, `j` debugger, `m` dev menu. Do not press `s` — it switches the server to Expo Go mode, which this project cannot use (custom native code).

### Native changes

```bash
npm run android                  # required after any Kotlin/Gradle/native dependency change
cd android && ./gradlew clean    # only if the build state gets inconsistent
```

### Android Studio

Run `npm start` in a terminal first, then open `apps/mobile/android` and press Run. The app connects to Metro for JavaScript.

## Local Development Setup

The build uses standard Node.js, React Native, Expo CLI, and Android tooling. Nothing in the build depends on external environment managers. Personal environment configurations (such as `devenv` or `direnv`) are gitignored and remain local-only.

1. **Node.js >= 22.13.0 and npm >= 10.9.0** — enforced by `engines` in `package.json` with `engine-strict=true` in `.npmrc`.
2. **JDK 17+** — any distribution works (AGP 8.12 requirement); Android Studio's bundled JBR is fine. Ensure `JAVA_HOME` points at it when running Gradle from the CLI.
3. **Android Studio** (or standalone cmdline-tools) with the SDK, then install these SDK components via SDK Manager:
   - Android SDK Platform 36
   - Build-Tools 36.0.0
   - NDK 27.1.12297006
   - CMake, Platform-Tools, Emulator
4. **`ANDROID_HOME`** pointing at the SDK (e.g. `~/Android/Sdk`), or let Android Studio generate `apps/mobile/android/local.properties`. Accept SDK licenses (`sdkmanager --licenses`) so Gradle can auto-provision missing NDK/CMake pieces.
5. **Emulator**: create any AVD in Android Studio's Device Manager (e.g. `Pixel_9_Pro`).
6. From the repository root:

```bash
npm install
npm run android --workspace=@restrainify/mobile   # builds with Gradle, installs on the running emulator/device
npm run start --workspace=@restrainify/mobile     # Expo dev server (dev client); press 'a' or open the app
```

The Gradle wrapper downloads Gradle 9.3.1 itself. `watchman` is optional; Metro falls back to Node file watching without it.

### Windows notes

Watchman has no official Windows build — skip it (Metro uses Node file watching). Additional Windows-specific steps:

1. Clone to a short local path (e.g. `C:\dev\restrainify-app`), not a OneDrive/desktop path. Recommended: `git config --global core.autocrlf false` before cloning.
2. Set `ANDROID_HOME` (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`) and add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `PATH`. PowerShell one-liner (reopen the terminal afterwards):

   ```powershell
   $sdk = "$env:LOCALAPPDATA\Android\Sdk"
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
   [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";$sdk\platform-tools;$sdk\emulator", "User")
   ```

   Verify with `adb version` and `emulator -list-avds`.

3. In SDK Manager, enable "Show Package Details" to pick NDK exactly `27.1.12297006`.
4. If bare `npm` errors with a roaming-profile path in PowerShell, call `C:\Program Files\nodejs\npm.cmd` directly.
5. If `npx` is blocked by execution policy: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
6. If the emulator fails to start, enable virtualization in BIOS or "Windows Hypervisor Platform" in Windows features.

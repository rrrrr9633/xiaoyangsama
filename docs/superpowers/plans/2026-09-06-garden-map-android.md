# Garden Map Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Android prototype into a map-first birthday adventure game with a calm pastoral-girl visual language, persistent progression, and the three confirmed Shenyang route nodes.

**Architecture:** Keep AMap `MapView` as the persistent world surface. Compose renders a restrained HUD, route overlays, and a bottom quest drawer over the map; pure Kotlin reducer/checkpoint code owns progression and remains testable without Android. Content and coordinates stay centralized so the physical route can be calibrated before release.

**Tech Stack:** Kotlin, Jetpack Compose Material 3, AMap Android 3D Map SDK, Android Location SDK, DataStore, JUnit.

---

### Task 1: Lock the route content and progression contract

**Files:**
- Modify: `android/app/src/main/java/top/sama/yangyang/content/RouteContent.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/game/GameState.kt`
- Modify: `android/app/src/test/java/top/sama/yangyang/game/CheckpointEngineTest.kt`
- Modify: `android/app/src/test/java/top/sama/yangyang/game/GameReducerTest.kt`

- [ ] **Step 1: Add/adjust tests for the confirmed three-stop order and idempotent rewards.**
- [ ] **Step 2: Run the focused unit tests and confirm any missing behavior fails.**
- [ ] **Step 3: Update route titles, story copy, and checkpoint metadata without enabling uncalibrated GPS.**
- [ ] **Step 4: Run the full debug unit test suite.**

### Task 2: Refine the map-first game surface

**Files:**
- Modify: `android/app/src/main/java/top/sama/yangyang/ui/GameHud.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/ui/QuestDrawer.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/ui/InventorySheet.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/ui/GardenOverlay.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/ui/DemoMapBackdrop.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/map/MapWorld.kt`
- Modify: `android/app/src/main/java/top/sama/yangyang/ui/theme/Color.kt`

- [ ] **Step 1: Define the visual rules in code: muted botanical colors, one accent for active quest, 44dp touch targets, no childlike rainbow UI.**
- [ ] **Step 2: Replace generic card repetition with a compact top status rail and a map-integrated quest drawer.**
- [ ] **Step 3: Make node markers communicate locked, active, and completed states through botanical symbols and restrained animation.**
- [ ] **Step 4: Build the debug APK and inspect generated resources for regressions.**

### Task 3: Verify the Android delivery path

**Files:**
- Modify: `android/README.md`
- Modify: `docs/android-setup.md`
- Modify: `android/app/build.gradle.kts` only if verification finds a configuration defect

- [ ] **Step 1: Verify the Android Key is injected only through the build environment and that the Web JS security code is absent.**
- [ ] **Step 2: Run `:app:testDebugUnitTest`, `:app:assembleDebug`, and `:app:lintDebug`.**
- [ ] **Step 3: Report the APK path and remaining real-device/field-calibration checks.**


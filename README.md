# Mecha Bayanihan Tactics — Android app

Gawang Pinoy tactical mecha RPG (3D hex battles, attack cut-ins, Workshop, Sound Studio).
The game is a React app built into one offline `index.html`, wrapped in a small Android WebView app.
GitHub Actions builds and signs the APK — nothing to install on your computer.

**Direct download (latest build):**
https://github.com/gnotesamsung7-hue/mecha-bayanihan/releases/latest/download/MechaBayanihan.apk

## One-time setup
1. Create a **public** GitHub repository named **mecha-bayanihan** (account `gnotesamsung7-hue`). Leave it empty (no README).
2. Open the repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, and add the 4 secrets from `github-secrets-mecha-bayanihan.txt`:
   `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEYSTORE_BASE64`.
3. Push this folder to the repo. The **Actions** tab runs “Build Mecha Bayanihan APK” (about 4–6 minutes).
4. Download `MechaBayanihan.apk` from **Releases**, or scan the QR in the game's **Share** tab.

Keep `mecha-bayanihan-release.jks` and the secrets file backed up somewhere safe (not in this repo).
Every build is signed with that same key, so new versions install over the old one and keep progress.

## Updating
Change the game in `src/`, bump `APP_VERSION` in `src/data.js` if you like, and push to `main`.
The build number goes up automatically, and the newest APK becomes the “latest” release the QR points to.

## Folders
- `src/` — game source (React + Tailwind + three.js), built with Vite into `dist/index.html`
- `android/` — Android WebView wrapper (`com.markdave.mechabayanihan`)
- `.github/workflows/build-apk.yml` — builds the game, signs the APK, publishes the release

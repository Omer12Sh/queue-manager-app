# QueueManager Mobile App

React Native / Expo app for iOS (App Store) and Android (Google Play).

## Requirements

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
- Expo account: `eas login`

## Getting started

```bash
cd mobile
npm install
npm start          # Expo Dev Tools (scan QR with Expo Go)
npm run ios        # iOS simulator
npm run android    # Android emulator
```

## i18n / Languages

The app ships with **English** and **Hebrew** (RTL) support via `i18next`.
Translation files live in `src/i18n/locales/`.

- Language is persisted per-device via `AsyncStorage`.
- Service providers can set their default language in the Settings page (web); the mobile app respects it.

## Building for stores

### Development / Preview build

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

### Production build

```bash
# iOS (requires Apple Developer account + App Store Connect)
eas build --platform ios --profile production

# Android (requires Google Play Console)
eas build --platform android --profile production
```

### Submitting to stores

```bash
eas submit --platform ios     # Upload .ipa to App Store Connect
eas submit --platform android  # Upload .aab to Google Play
```

## Configuration

Before production builds, update `app.json`:
- `extra.eas.projectId` → your EAS project ID (`eas init`)
- `ios.bundleIdentifier` → your Apple bundle ID
- `android.package` → your Android package name

Update `eas.json`:
- `submit.production.ios.*` → Apple credentials
- `submit.production.android.serviceAccountKeyPath` → Google service account JSON

## Project structure

```
app/
  _layout.tsx       # Root layout (providers)
  index.tsx         # Redirect to login or tabs
  login.tsx         # Login screen
  (tabs)/
    _layout.tsx     # Tab bar
    index.tsx       # Dashboard (Client or Provider)
    appointments.tsx
    services.tsx
src/
  contexts/         # AuthContext, LanguageContext
  i18n/             # i18n config + locale files
  screens/          # Screen components
  services/         # API client
  types/            # TypeScript types
```

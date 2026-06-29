# SyndeoCare Mobile Production Readiness

This Expo app uses Expo Router, TanStack Query, SecureStore-backed auth sessions, Expo Notifications, and EAS Build. It is configured for development and internal preview builds now, with store submission intentionally left unconfigured until Apple and Google credentials are available.

## Required GitHub Secrets

- `EXPO_TOKEN`: required for GitHub Actions to start EAS cloud builds.

## Required GitHub / EAS Variables

- `EXPO_PUBLIC_API_GATEWAY_BASE_URL`: optional override for the API gateway. If unset, the app defaults to `https://api.syndeocare.ai/v1`.

## EAS Profiles

- `development`: internal development client, Android APK, iOS simulator.
- `preview`: internal testing build, Android APK, iOS simulator.
- `production`: prepared for later store builds with remote versioning and auto-increment.

Production App Store and Play Store submission are not enabled yet because Apple Developer and Google Play Console credentials are not available.

## Future Store Credentials

- Apple Developer account access.
- App Store Connect API key or Apple ID credentials managed through EAS.
- Google Play Console app.
- Google Play service account JSON configured in EAS secrets, not committed to the repo.
- Privacy policy and terms URLs finalized for store metadata.

## Notifications

The mobile app can request Expo push tokens through `expo-notifications`. The AWS backend currently provides in-app notifications through the notifications service and API gateway. Native push fan-out should remain backend-side; do not hardcode AWS, APNs, FCM, or Expo service secrets in the mobile app.

Production push notification completion requires:

- Backend endpoint for registering/removing Expo push tokens per authenticated actor and device.
- Durable push token storage with uniqueness by actor, device, platform, and token.
- Token cleanup on logout or explicit unregister.
- Backend fan-out from notification events such as `new_message`.
- APNs/FCM credentials configured through EAS/Expo and/or AWS, depending on the chosen push provider.
- Localized notification titles/bodies generated server-side.

Until token registration exists server-side, the app safely continues to use in-app notifications and app badge syncing without exposing secrets.

## Privacy Prompts

Configured prompts:

- Location: used for city and coordinate matching.
- Photo library: used for profile images, clinic logos, and attachments.
- Notifications: requested only after sign-in on real devices.

## CI

The `Mobile` GitHub Actions workflow runs for mobile paths and shared workspace files required by the mobile build. It runs Expo dependency checks, TypeScript, ESLint, and Android/iOS export builds. It starts EAS cloud builds only when `EXPO_TOKEN` is configured.

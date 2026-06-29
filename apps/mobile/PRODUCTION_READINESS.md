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

The mobile app requests Expo push tokens through `expo-notifications` after sign-in and registers them through the authenticated API gateway route `POST /v1/notifications/push-tokens`. Tokens are stored backend-side per actor/device/provider/platform and removed with `DELETE /v1/notifications/push-tokens` during logout. The AWS backend also provides in-app notifications through the notifications service and API gateway.

Native push fan-out must remain backend-side; do not hardcode AWS, APNs, FCM, Expo, or provider secrets in the mobile app.

Implemented:

- Backend endpoint for registering/removing Expo push tokens per authenticated actor.
- Durable push token storage with uniqueness by actor/device/platform/provider/token.
- Mobile token registration after sign-in on real devices.
- Token cleanup on logout.

Production push notification completion still requires:

- Backend fan-out from notification events such as `new_message`.
- Provider delivery implementation, for example Expo push service now and AWS SNS/Pinpoint later if selected.
- APNs/FCM credentials configured through EAS/Expo and/or AWS, depending on the chosen push provider.
- Localized notification titles/bodies generated server-side.

Until provider fan-out is enabled server-side, the app safely continues to use in-app notifications and app badge syncing without exposing secrets.

## Privacy Prompts

Configured prompts:

- Location: used for city and coordinate matching.
- Photo library: used for profile images, clinic logos, and attachments.
- Notifications: requested only after sign-in on real devices.

## CI

The `Mobile` GitHub Actions workflow runs for mobile paths and shared workspace files required by the mobile build. It runs Expo dependency checks, TypeScript, ESLint, and Android/iOS export builds. It starts EAS cloud builds only when `EXPO_TOKEN` is configured.

The platform workflows are path-scoped:

- `Mobile`: mobile app and mobile build metadata.
- `CI`: web, docs, backend services, shared packages, scripts, infra, and workspace build metadata.
- `Deploy Platform`: deployable web frontend, backend services, shared packages, scripts, and infrastructure.
- `Release`: changesets and package/product code, excluding mobile-only changes.

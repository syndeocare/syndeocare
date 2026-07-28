# SyndeoCare Mobile Production Readiness

This Expo app uses Expo Router, TanStack Query, SecureStore-backed auth sessions, Expo Notifications, EAS Build, and EAS Update. Development, preview, production, App Store Connect, and production OTA metadata are configured.

## Required GitHub Secrets

- `EXPO_TOKEN`: configured for GitHub Actions to start EAS builds and publish production OTA updates. Rotate it in Expo and GitHub together if it is ever revoked.

## Required GitHub / EAS Variables

- `EXPO_PUBLIC_API_GATEWAY_BASE_URL`: optional override for the API gateway. If unset, the app defaults to `https://api.syndeocare.ai/v1`.

Configured EAS project variables:

- `development`: `EXPO_PUBLIC_API_GATEWAY_BASE_URL=https://api.syndeocare.ai/v1`
- `preview`: `EXPO_PUBLIC_API_GATEWAY_BASE_URL=https://api.syndeocare.ai/v1`
- `production`: `EXPO_PUBLIC_API_GATEWAY_BASE_URL=https://api.syndeocare.ai/v1`

## EAS Profiles

- `development`: internal development client on the `development` update channel, Android APK, iOS simulator.
- `preview`: internal testing build on the `preview` update channel, Android APK, iOS simulator.
- `production`: store build on the `production` update channel, Android App Bundle, iOS App Store build, remote versioning, and auto-increment.

The Apple bundle identifier `ai.syndeocare.mobile` and App Store Connect app `6795712203` are registered. The production submit profile targets that app and Apple team `QH658DPPK4`.

## Remaining Store Credentials

- Apple Distribution certificate and App Store provisioning profile managed through EAS.
- App Store Connect API key or a valid Apple ID session for automated TestFlight submission.
- Google Play Console app.
- Google Play service account JSON configured in EAS secrets, not committed to the repo.

Privacy and terms are published at `https://syndeocare.ai/privacy` and `https://syndeocare.ai/terms`. Both are linked from the mobile registration flow.

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

The `Mobile OTA update` workflow publishes to the `production` channel after validating changes to mobile JavaScript, TypeScript, or assets. The app uses Expo's fingerprint runtime policy so native-incompatible changes require a new store build instead of being sent to an incompatible installed binary.

Manual workflow dispatch supports:

- platform: `android`, `ios`, or `all`
- profile: `development`, `preview`, or `production`
- build-only or build-and-submit through EAS `--auto-submit`
- waiting for build completion when store submission is requested

The platform workflows are path-scoped:

- `Mobile`: mobile app and mobile build metadata.
- `CI`: web, docs, backend services, shared packages, scripts, infra, and workspace build metadata.
- `Deploy Platform`: deployable web frontend, backend services, shared packages, scripts, and infrastructure.
- `Release`: changesets and package/product code, excluding mobile-only changes.

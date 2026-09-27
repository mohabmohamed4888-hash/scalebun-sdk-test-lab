/**
 * Client-safe build-time values injected by react-native-dotenv from `.env`.
 * NEVER add a server secret, personal access token, APNs key, Firebase
 * service-account key, or OTA signing key here — everything below ships inside
 * the app bundle.
 */
declare module '@env' {
  export const SCALEBUN_APP_ID: string | undefined;
  export const SCALEBUN_CLIENT_KEY: string | undefined;
  export const SCALEBUN_PROJECT_ID: string | undefined;
  export const SCALEBUN_PUBLISHABLE_KEY: string | undefined;
  export const SCALEBUN_ENVIRONMENT: string | undefined;
  export const SCALEBUN_PROJECT_NAME: string | undefined;
  export const SCALEBUN_OTA_CHANNEL: string | undefined;
  export const SCALEBUN_OTA_ENABLED: string | undefined;
  export const SCALEBUN_DESKTOP_DEBUG_HOST: string | undefined;
  export const NETWORK_TEST_SERVER_URL: string | undefined;
  export const ENABLE_DANGEROUS_TESTS: string | undefined;
}

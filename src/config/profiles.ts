import type { LabEnv } from './envValidation';

/**
 * Init profiles.
 *
 * `ScaleBun.init()` is idempotent per JS runtime (the facade singleton ignores a
 * second init), so every configuration variant — feature-disable matrix,
 * privacy combinations, invalid credentials, malformed config — is a PROFILE
 * that is persisted and applied on the next app (re)start. The Config screen
 * shows exactly which capabilities are intentionally disabled.
 */

export type ProfileId =
  | 'default'
  | 'direct-init'
  | 'direct-legacy-root'
  | 'pre-init-probe'
  | 'legacy-credentials'
  | 'verbose'
  | 'invalid-credentials'
  | 'malformed-config'
  | 'custom-endpoint'
  | 'flush-fast'
  | 'small-queue'
  | 'no-replay'
  | 'no-network'
  | 'no-crashes'
  | 'no-session'
  | 'no-journey'
  | 'no-performance'
  | 'replay-record-off'
  | 'replay-low-navigation'
  | 'privacy-strict'
  | 'privacy-relaxed'
  | 'capture-bodies'
  | 'perf-full-sampling'
  | 'console-capture'
  | 'auto-scroll'
  | 'no-auto-events'
  | 'short-session-cap'
  | 'memory-persistence'
  | 'ota-enabled'
  | 'ota-withhold'
  | 'desktop-debug'
  | 'custom';

export type Integration = 'provider' | 'direct' | 'direct-legacy-root';

export type FeatureKey = 'replay' | 'network' | 'crashes' | 'session' | 'journey' | 'performance';
export const FEATURE_KEYS: readonly FeatureKey[] = ['replay', 'network', 'crashes', 'session', 'journey', 'performance'];

export interface PrivacyToggles {
  redactAuth?: boolean;
  redactCookies?: boolean;
  redactBodies?: boolean;
  maskTextInputs?: boolean;
  maskImages?: boolean;
}

export interface CustomOverrides {
  features: Partial<Record<FeatureKey, boolean>>;
  privacy: PrivacyToggles;
  captureNetworkBodies?: boolean;
}

export interface InitProfile {
  id: ProfileId;
  label: string;
  description: string;
  integration: Integration;
  /** Call identify/track/log before init() starts (identify-before-init tests). */
  preInitProbe?: boolean;
  /** Features intentionally OFF in this profile (drives the feature-matrix smoke test). */
  disabled: readonly FeatureKey[];
  /** Emit a warning banner (e.g. credentials intentionally broken). */
  warning?: string;
  build: (env: LabEnv, custom?: CustomOverrides) => Record<string, unknown>;
}

/** Base SaaS config shared by every profile. Only client-safe values. */
export function baseConfig(env: LabEnv): Record<string, unknown> {
  const cfg: Record<string, unknown> = {
    appId: env.appId,
    clientKey: env.clientKey,
    // The SDK's public types still REQUIRE projectId/publishableKey even in SaaS
    // mode; pass them when configured so both lanes are exercised.
    projectId: env.projectId,
    publishableKey: env.publishableKey,
    verbose: __DEV__,
    automaticEventTracking: true,
    autoLifecycleEvents: true,
    eventTracking: true,
    replay: { record: true, captureMode: 'interactions', quality: 'normal' },
    privacy: { maskTextInputs: true, maskImages: false, redactAuth: true, redactCookies: true, redactBodies: false },
    performance: { enabled: true, tier1: { appLaunch: true, screenLoad: true, network: true, uiHang: true }, tier2: { enabled: true, sampleRate: 0.1 } },
  };
  for (const k of Object.keys(cfg)) {
    if (cfg[k] === undefined) delete cfg[k];
  }
  return cfg;
}

const off = (feature: FeatureKey): Pick<InitProfile, 'disabled' | 'build'> => ({
  disabled: [feature],
  build: env => ({ ...baseConfig(env), features: { [feature]: false } }),
});

export const PROFILES: readonly InitProfile[] = [
  {
    id: 'default',
    label: 'Default (Provider, all features on)',
    description: 'ScaleBunProvider with navigationRef; SaaS credentials; every feature enabled; default privacy.',
    integration: 'provider',
    disabled: [],
    build: env => baseConfig(env),
  },
  {
    id: 'direct-init',
    label: 'Direct ScaleBun.init()',
    description: 'Imperative ScaleBun.init() + setNavigationRef + EngagePromptProvider (no ScaleBunProvider).',
    integration: 'direct',
    disabled: [],
    build: env => baseConfig(env),
  },
  {
    id: 'direct-legacy-root',
    label: 'Direct init + ScaleBunDebugRoot (legacy)',
    description: 'Direct init wrapped in the deprecated ScaleBunDebugRoot to verify it still mounts.',
    integration: 'direct-legacy-root',
    disabled: [],
    build: env => baseConfig(env),
  },
  {
    id: 'pre-init-probe',
    label: 'Pre-init calls probe',
    description: 'identify/track/log/captureError are called BEFORE init() starts (direct integration) to test buffering.',
    integration: 'direct',
    preInitProbe: true,
    disabled: [],
    build: env => baseConfig(env),
  },
  {
    id: 'legacy-credentials',
    label: 'Legacy projectId + publishableKey only',
    description: 'Exactly the README quick-start config: no clientKey/appId. Exercises the legacy handshake lane.',
    integration: 'provider',
    disabled: [],
    warning: 'SaaS clientKey/appId intentionally omitted.',
    build: env => ({ projectId: env.projectId ?? 'proj_missing', publishableKey: env.publishableKey ?? 'pk_missing' }),
  },
  {
    id: 'verbose',
    label: 'Verbose / debug logging',
    description: 'verbose: true and runtime logLevel "debug". Inspect logcat / Xcode console for [ScaleBun] lines.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), verbose: true, logLevel: 'debug' }),
  },
  {
    id: 'invalid-credentials',
    label: 'Invalid credentials (isolated)',
    description: 'Well-formed but FAKE client key for the configured app. The backend must reject; the app must keep working.',
    integration: 'provider',
    disabled: [],
    warning: 'Credentials are intentionally invalid — rejections are the expected result.',
    build: env => ({ ...baseConfig(env), clientKey: 'skb_test_ck_sdktestlab_invalid_000000000000', appId: env.appId ?? 'app_sdktestlab_invalid' }),
  },
  {
    id: 'malformed-config',
    label: 'Malformed optional config',
    description: 'flushIntervalMs: 10 (schema minimum is 1000). The SDK schema rejects the whole config; init must not throw.',
    integration: 'provider',
    disabled: [],
    warning: 'The SDK is expected to stay UNINITIALIZED in this profile.',
    build: env => ({ ...baseConfig(env), flushIntervalMs: 10 }),
  },
  {
    id: 'custom-endpoint',
    label: 'apiBaseUrl override (unreachable)',
    description: 'apiBaseUrl: https://unreachable.invalid/api/v1. 2.4.0 documents the endpoint as LOCKED; the override must be ignored.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), apiBaseUrl: 'https://unreachable.invalid/api/v1' }),
  },
  {
    id: 'flush-fast',
    label: 'Fast flush (1s, batch 10)',
    description: 'flushIntervalMs: 1000, maxQueueSize: 10 — batching must split large bursts.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), flushIntervalMs: 1000, maxQueueSize: 10 }),
  },
  {
    id: 'small-queue',
    label: 'Small queue + slow flush',
    description: 'maxQueueSize: 5, flushIntervalMs: 60000, persistence.maxEntries: 50 — queue limits and drop counters.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), maxQueueSize: 5, flushIntervalMs: 60000, persistence: { enabled: true, maxEntries: 50 } }),
  },
  { id: 'no-replay', label: 'Feature off: replay', description: 'features.replay = false', integration: 'provider', ...off('replay') },
  { id: 'no-network', label: 'Feature off: network', description: 'features.network = false', integration: 'provider', ...off('network') },
  { id: 'no-crashes', label: 'Feature off: crashes', description: 'features.crashes = false', integration: 'provider', ...off('crashes') },
  { id: 'no-session', label: 'Feature off: session', description: 'features.session = false', integration: 'provider', ...off('session') },
  { id: 'no-journey', label: 'Feature off: journey', description: 'features.journey = false', integration: 'provider', ...off('journey') },
  { id: 'no-performance', label: 'Feature off: performance', description: 'features.performance = false', integration: 'provider', ...off('performance') },
  {
    id: 'replay-record-off',
    label: 'Replay record: false',
    description: 'Replay feature on, but auto-record disabled; recording only via replay.start()/startSession().',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), replay: { record: false } }),
  },
  {
    id: 'replay-low-navigation',
    label: 'Replay low quality, navigation capture',
    description: "replay: { captureMode: 'navigation', quality: 'grayscale', intervalMs: 2000 }",
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), replay: { record: true, captureMode: 'navigation', quality: 'grayscale', intervalMs: 2000 } }),
  },
  {
    id: 'privacy-strict',
    label: 'Privacy strict',
    description: 'maskTextInputs + maskImages + redactAuth + redactCookies + redactBodies all true.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), privacy: { maskTextInputs: true, maskImages: true, redactAuth: true, redactCookies: true, redactBodies: true } }),
  },
  {
    id: 'privacy-relaxed',
    label: 'Privacy relaxed (fake data only!)',
    description: 'maskTextInputs:false, redactAuth:false, redactCookies:false. Only FAKE values are ever used in the Test Lab.',
    integration: 'provider',
    disabled: [],
    warning: 'Masking/redaction intentionally relaxed — use only the Test Lab fake PII.',
    build: env => ({ ...baseConfig(env), privacy: { maskTextInputs: false, maskImages: false, redactAuth: false, redactCookies: false, redactBodies: false } }),
  },
  {
    id: 'capture-bodies',
    label: 'Network bodies captured',
    description: 'Runtime-only key captureNetworkBodies: true (+ redactBodies: true) — body redaction tests become meaningful.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), captureNetworkBodies: true, privacy: { maskTextInputs: true, redactAuth: true, redactCookies: true, redactBodies: true } }),
  },
  {
    id: 'perf-full-sampling',
    label: 'Performance: tier-2 sampled at 100%',
    description: 'performance.tier2.sampleRate: 1 so frame_metrics / js_stall collectors are always on.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), performance: { enabled: true, tier2: { enabled: true, sampleRate: 1 } } }),
  },
  {
    id: 'console-capture',
    label: 'Console log capture',
    description: 'captureConsoleLogs: true — console.* lines reach Diagnose → Logs.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), captureConsoleLogs: true }),
  },
  {
    id: 'auto-scroll',
    label: 'Auto-instrument ScrollViews',
    description: 'autoInstrumentScrollViews: true (patches RN ScrollView globally).',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), autoInstrumentScrollViews: true }),
  },
  {
    id: 'no-auto-events',
    label: 'No automatic events',
    description: 'automaticEventTracking:false, autoLifecycleEvents:false, eventTracking:false (direct init).',
    integration: 'direct',
    disabled: [],
    build: env => ({ ...baseConfig(env), automaticEventTracking: false, autoLifecycleEvents: false, eventTracking: false }),
  },
  {
    id: 'short-session-cap',
    label: 'Short background session cap (60s)',
    description: 'Runtime-only sessionBackgroundCapMs: 60000 — backgrounding >60s must start a new session.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), sessionBackgroundCapMs: 60000 }),
  },
  {
    id: 'memory-persistence',
    label: 'Persistence disabled (memory queue)',
    description: 'Runtime-only persistence.enabled:false — queued events are expected to be LOST on kill while offline.',
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), persistence: { enabled: false } }),
  },
  {
    id: 'ota-enabled',
    label: 'OTA enabled (channel sdk-test)',
    description: "Runtime-only ota: { enabled, channelOverride: <SCALEBUN_OTA_CHANNEL>, checkOnForeground, mandatoryBlocksUi }.",
    integration: 'provider',
    disabled: [],
    build: env => ({
      ...baseConfig(env),
      ota: { enabled: true, channelOverride: env.otaChannel, checkOnForeground: true, mandatoryBlocksUi: true, healthyAfterMs: 10000 },
    }),
  },
  {
    id: 'ota-withhold',
    label: 'OTA withhold on compromised devices',
    description: "ota.onCompromisedDevice: 'withhold' — on a rooted/jailbroken/emulator device sync must return WITHHELD.",
    integration: 'provider',
    disabled: [],
    build: env => ({ ...baseConfig(env), ota: { enabled: true, channelOverride: env.otaChannel, onCompromisedDevice: 'withhold' } }),
  },
  {
    id: 'desktop-debug',
    label: 'Desktop debugger',
    description: 'desktopDebug: { host: SCALEBUN_DESKTOP_DEBUG_HOST } — requires a bundle built with devTools.',
    integration: 'provider',
    disabled: [],
    build: env => ({
      ...baseConfig(env),
      desktopDebug: env.desktopDebugHost ? { host: env.desktopDebugHost, appName: 'SDK Test Lab' } : true,
    }),
  },
  {
    id: 'custom',
    label: 'Custom feature / privacy combination',
    description: 'Any combination of feature flags and privacy toggles chosen on the Config screen.',
    integration: 'provider',
    disabled: [],
    build: (env, custom) => ({
      ...baseConfig(env),
      features: { ...(custom?.features ?? {}) },
      privacy: { ...(baseConfig(env).privacy as object), ...(custom?.privacy ?? {}) },
      ...(custom?.captureNetworkBodies !== undefined ? { captureNetworkBodies: custom.captureNetworkBodies } : {}),
    }),
  },
];

export function getProfile(id: string | null | undefined): InitProfile {
  return PROFILES.find(p => p.id === id) ?? PROFILES[0];
}

/** Features effectively disabled for a profile (custom resolves from overrides). */
export function disabledFeatures(profile: InitProfile, custom?: CustomOverrides): FeatureKey[] {
  if (profile.id !== 'custom') return [...profile.disabled];
  return FEATURE_KEYS.filter(k => custom?.features[k] === false);
}

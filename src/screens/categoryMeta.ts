import type { Category } from '../testRunner/types';

export interface CategoryMeta {
  route: string;
  category: Category;
  title: string;
  description: string;
  prerequisites: string[];
}

export const CATEGORY_META: readonly CategoryMeta[] = [
  { route: 'Setup', category: 'Setup & Init', title: 'Setup & Initialization', description: 'Init modes (provider / direct / pre-init), idempotency, invalid & malformed config, endpoint lock, flush/queue config, optional deps, doctor.', prerequisites: ['.env client credentials', 'Profile selected on Config screen'] },
  { route: 'Analytics', category: 'Analytics', title: 'Events & Product Analytics', description: 'Custom events, property types, Unicode/Arabic, bursts, lifecycle/interaction/screen/deep-link auto events, flush, purchases, subscriptions, funnel, typed plan, UI state, permissions, impressions.', prerequisites: ['SCALEBUN_APP_ID + CLIENT_KEY for the /batch envelope lane'] },
  { route: 'Sessions', category: 'Sessions', title: 'Sessions & Lifecycle', description: 'Automatic sessions, start/stop, namespace API, rotation, background/foreground, timeout, attributes, relaunch continuity.', prerequisites: [] },
  { route: 'Identity', category: 'Identity', title: 'Identity', description: 'Anonymous → identify → traits → setUser → clear → second user; purge; replay identity; rapid cycles; identify-before-init (INIT-003).', prerequisites: ['Fake opaque ids only'] },
  { route: 'Errors', category: 'Logs, Errors & Bugs', title: 'Logs, Errors, Crashes & Bug Reports', description: 'Log levels, handled errors (Error/string/fatal/context), named capture exports, ErrorBoundary, rejections, bug reports, breadcrumbs, console capture, native crash (Danger Zone).', prerequisites: ['Native crash only via Danger Zone'] },
  { route: 'Network', category: 'Network', title: 'Network Monitoring', description: 'fetch + axios against the deterministic test server: statuses, redirects, timeouts, cancel, slow, concurrent, large, DNS failure; header/cookie/body/query redaction with transmitted-data needles.', prerequisites: ['npm run network-server', 'NETWORK_TEST_SERVER_URL'] },
  { route: 'Offline', category: 'Offline & Queue', title: 'Offline, Batching, Retries & Persistence', description: 'Step-by-step offline wizard, kill/relaunch persistence, stress bursts, queue limits, retry spacing, memory persistence.', prerequisites: ['Ability to toggle airplane mode'] },
  { route: 'Performance', category: 'Performance', title: 'Performance Monitoring', description: 'isActive, custom traces with spans/measurements, manual screen marks, metrics, app launch, JS stalls, disabled profile.', prerequisites: ['perf-full-sampling profile for deterministic tier-2'] },
  { route: 'Replay', category: 'Session Replay', title: 'Session Replay', description: 'Recording state & control, manual frames, quality/mode, runtime privacy, masking verification on the Replay Playground.', prerequisites: ['react-native-view-shot installed', 'Native build (not Expo Go)'] },
  { route: 'Navigation', category: 'Navigation', title: 'Navigation & Auto-instrumentation', description: 'navigationRef wiring, stack/tabs/modal/back, repeated visits, deep links, screen beacons, legacy root.', prerequisites: [] },
  { route: 'Push', category: 'Push', title: 'Push Notifications', description: 'enablePush, adapters, permission, token registration, foreground/opened/cold-start callbacks, manual provider round-trip.', prerequisites: ['Firebase config + APNs key in dashboard (else NOT_CONFIGURED)', 'Physical iPhone for APNs'] },
  { route: 'Engage', category: 'Engagement', title: 'Engagement & Feedback', description: 'Ratings, config fetch, campaign prompts, in-app messages, trigger events, survey responses & attachments, tracking lanes, store review, inline slots, anchors, renderer & throttle utilities.', prerequisites: ['Dashboard campaigns for visual prompts'] },
  { route: 'Attribution', category: 'Attribution', title: 'Attribution & Identifiers', description: 'Consent-safe identifiers, click ids, install referrer (Android), SKAdNetwork (iOS).', prerequisites: [] },
  { route: 'Privacy', category: 'Privacy & Consent', title: 'Privacy Lab', description: 'Effective policy, consent withdrawal (transmitted check), purge/erase, PII in props/errors, replay masking/ignored screens/events-only, report privacy.', prerequisites: ['Use privacy-strict / privacy-relaxed / capture-bodies profiles for combinations'] },
  { route: 'Ota', category: 'OTA', title: 'OTA Updates', description: 'Orchestrator state, read-only check, hook state, sync/download/stage, apply/restart, mandatory UI, rollback, withhold policy.', prerequisites: ['Channel sdk-test with a published test bundle', 'Release build for bundle loading'] },
  { route: 'Diagnostics', category: 'Diagnostics', title: 'SDK Diagnostics', description: 'DIAGNOSTIC-ONLY: debug subsystem, desktop debugger, report export, calibration, ids/stats, remote config & flags.', prerequisites: [] },
  { route: 'FeatureMatrix', category: 'Feature Matrix', title: 'Feature-disable Matrix', description: 'Run FMX-001 under each no-* profile: disabled capability inert, all others still working.', prerequisites: ['Switch profile + restart between runs'] },
  { route: 'Edge', category: 'Edge Cases', title: 'Edge Cases & Resilience', description: 'Rapid calls, empty/long/special names, large & non-serializable values, malformed runtime input, concurrent flush, background calls, calls after reload.', prerequisites: [] },
];

export const META_BY_ROUTE = new Map(CATEGORY_META.map(m => [m.route, m]));

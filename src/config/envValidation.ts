/**
 * Pure validation of client-side Test Lab configuration (unit-tested).
 *
 * The mobile app may only ever carry PUBLISHABLE / CLIENT credentials. Anything
 * that looks like a server secret, personal access token or private key is
 * REJECTED here and the app runs in NOT_CONFIGURED mode instead — we never
 * forward such a value to the SDK, and never display it.
 */

export interface RawEnv {
  SCALEBUN_APP_ID?: string;
  SCALEBUN_CLIENT_KEY?: string;
  SCALEBUN_PROJECT_ID?: string;
  SCALEBUN_PUBLISHABLE_KEY?: string;
  SCALEBUN_ENVIRONMENT?: string;
  SCALEBUN_PROJECT_NAME?: string;
  SCALEBUN_OTA_CHANNEL?: string;
  SCALEBUN_OTA_ENABLED?: string;
  SCALEBUN_DESKTOP_DEBUG_HOST?: string;
  NETWORK_TEST_SERVER_URL?: string;
  ENABLE_DANGEROUS_TESTS?: string;
}

export type CredentialState = 'CONFIGURED' | 'NOT_CONFIGURED' | 'REJECTED';

export interface LabEnv {
  appId?: string;
  clientKey?: string;
  projectId?: string;
  publishableKey?: string;
  environment: string;
  projectName: string;
  otaChannel: string;
  otaEnabled: boolean;
  desktopDebugHost?: string;
  networkServerUrl?: string;
  dangerousTestsAllowed: boolean;
  saasCredentials: CredentialState;
  legacyCredentials: CredentialState;
  /** Human-readable problems, safe to display (never contain the secret itself). */
  problems: string[];
}

const PLACEHOLDER = /^(your_|<|changeme|xxx|todo)/i;

/** Prefixes/markers of credentials that must never be embedded in a mobile app. */
const FORBIDDEN_MARKERS: readonly RegExp[] = [
  /_sk_/i, // server/secret key (client keys are *_ck_*)
  /^scalebun_pat_/i, // personal access token
  /secret/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /"private_key"/, // service-account JSON
];

function clean(v: string | undefined): string | undefined {
  const t = v?.trim();
  if (!t || PLACEHOLDER.test(t)) return undefined;
  return t;
}

export function looksLikeServerSecret(value: string): boolean {
  return FORBIDDEN_MARKERS.some(re => re.test(value));
}

/** Show only a non-sensitive prefix of a publishable value. */
export function maskKey(value: string | undefined): string {
  if (!value) return '—';
  return value.length <= 12 ? `${value.slice(0, 4)}…` : `${value.slice(0, 12)}…`;
}

function validHttpUrl(v: string): boolean {
  return /^https?:\/\/[^\s/]+(:\d+)?(\/.*)?$/i.test(v);
}

export function validateEnv(raw: RawEnv, opts: { isDev: boolean }): LabEnv {
  const problems: string[] = [];

  let clientKey = clean(raw.SCALEBUN_CLIENT_KEY);
  const appId = clean(raw.SCALEBUN_APP_ID);
  let publishableKey = clean(raw.SCALEBUN_PUBLISHABLE_KEY);
  const projectId = clean(raw.SCALEBUN_PROJECT_ID);

  let saas: CredentialState = clientKey && appId ? 'CONFIGURED' : 'NOT_CONFIGURED';
  if (clientKey && looksLikeServerSecret(clientKey)) {
    problems.push(
      'SCALEBUN_CLIENT_KEY looks like a SERVER secret or access token. It was rejected and NOT passed to the SDK. Use the SDK client key (…_ck_…) from the dashboard.',
    );
    clientKey = undefined;
    saas = 'REJECTED';
  } else if (clientKey && !appId) {
    problems.push('SCALEBUN_CLIENT_KEY is set but SCALEBUN_APP_ID is missing — the envelope event lane (/batch) stays disabled.');
  } else if (!clientKey && appId) {
    problems.push('SCALEBUN_APP_ID is set but SCALEBUN_CLIENT_KEY is missing — SaaS mode disabled.');
  } else if (clientKey && !/_ck_/i.test(clientKey)) {
    problems.push('SCALEBUN_CLIENT_KEY does not contain "_ck_"; double-check it is the SDK client key for this environment.');
  }

  let legacy: CredentialState = projectId && publishableKey ? 'CONFIGURED' : 'NOT_CONFIGURED';
  if (publishableKey && looksLikeServerSecret(publishableKey)) {
    problems.push('SCALEBUN_PUBLISHABLE_KEY looks like a secret and was rejected.');
    publishableKey = undefined;
    legacy = 'REJECTED';
  }

  let networkServerUrl = clean(raw.NETWORK_TEST_SERVER_URL)?.replace(/\/+$/, '');
  if (networkServerUrl && !validHttpUrl(networkServerUrl)) {
    problems.push(`NETWORK_TEST_SERVER_URL "${networkServerUrl}" is not an http(s) URL.`);
    networkServerUrl = undefined;
  }

  if (saas !== 'CONFIGURED' && legacy !== 'CONFIGURED') {
    problems.push('No usable ScaleBun credentials: the app runs, but SDK-dependent tests report NOT_CONFIGURED.');
  }

  const dangerousFlag = (raw.ENABLE_DANGEROUS_TESTS ?? '').toLowerCase() === 'true';

  return {
    appId,
    clientKey,
    projectId,
    publishableKey,
    environment: clean(raw.SCALEBUN_ENVIRONMENT) ?? 'development',
    projectName: clean(raw.SCALEBUN_PROJECT_NAME) ?? '(unnamed)',
    otaChannel: clean(raw.SCALEBUN_OTA_CHANNEL) ?? 'sdk-test',
    otaEnabled: (raw.SCALEBUN_OTA_ENABLED ?? '').toLowerCase() === 'true',
    desktopDebugHost: clean(raw.SCALEBUN_DESKTOP_DEBUG_HOST),
    networkServerUrl,
    // Dangerous tests: always available in debug builds; release builds need the explicit flag.
    dangerousTestsAllowed: opts.isDev || dangerousFlag,
    saasCredentials: saas,
    legacyCredentials: legacy,
    problems,
  };
}

import type { InitProfile, CustomOverrides, ProfileId } from '../config/profiles';

export type InitPhase = 'IDLE' | 'INITIALIZING' | 'READY' | 'NOT_INITIALIZED' | 'FAILED' | 'NOT_CONFIGURED';

export interface PreInitProbe {
  userId: string;
  eventName: string;
  calledAt: string;
  /** Results captured immediately after init() resolved. */
  afterInit?: {
    idsUserId?: string;
    identifiedUserId?: string;
  };
  errors: string[];
}

export interface LabState {
  runId: string;
  runStartedAt: string;
  profileId: ProfileId;
  profile: InitProfile;
  custom?: CustomOverrides;
  initPhase: InitPhase;
  initStartedAt?: number;
  initFinishedAt?: number;
  initError?: string;
  /** Sanitized snapshot of the config passed to init (keys masked). */
  configSnapshot?: Record<string, unknown>;
  preInit?: PreInitProbe;
  bootCount: number;
  previousInstallationId?: string;
  pendingCrashMarker?: { armedAt: string; runId: string } | null;
  restartMarker?: { at: string; runId: string; token: string } | null;
  navReady: boolean;
  currentRoute?: string;
}

type Listener = (s: LabState) => void;

let state: LabState | null = null;
const listeners = new Set<Listener>();

export function initLabState(s: LabState): void {
  state = s;
  listeners.forEach(l => l(s));
}

export function getLabState(): LabState {
  if (!state) throw new Error('Lab state not initialized yet');
  return state;
}

export function hasLabState(): boolean {
  return state !== null;
}

export function patchLabState(patch: Partial<LabState>): void {
  if (!state) return;
  state = { ...state, ...patch };
  const s = state;
  listeners.forEach(l => l(s));
}

export function subscribeLabState(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

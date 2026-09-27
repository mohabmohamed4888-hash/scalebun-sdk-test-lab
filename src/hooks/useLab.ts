import { useEffect, useReducer, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { getLabState, subscribeLabState, type LabState } from '../scalebun/labState';
import { resultsStore } from '../testRunner/labRunner';
import { getIntegrationErrors, subscribeIntegrationErrors } from '../scalebun/integrationErrors';
import { egressObserver } from '../services/egressObserver';

export function useLabState(): LabState {
  const [s, set] = useState(getLabState());
  useEffect(() => subscribeLabState(set), []);
  return s;
}

/** Re-render whenever test results change. */
export function useResults(): typeof resultsStore {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => resultsStore.subscribe(force), []);
  return resultsStore;
}

export function useIntegrationErrors() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribeIntegrationErrors(force), []);
  return getIntegrationErrors();
}

export function useNetInfo(): NetInfoState | null {
  const [s, set] = useState<NetInfoState | null>(null);
  useEffect(() => {
    NetInfo.fetch().then(set);
    return NetInfo.addEventListener(set);
  }, []);
  return s;
}

/** Re-render on egress activity (throttled to 2 Hz). */
export function useEgress() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsub = egressObserver.subscribe(() => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        force();
      }, 500);
    });
    return () => {
      unsub();
      if (pending) clearTimeout(pending);
    };
  }, []);
  return egressObserver;
}

/** Poll a value (for SDK getters that have no subscription API). */
export function usePoll<T>(read: () => T, ms = 1000): T {
  const [v, set] = useState<T>(read);
  useEffect(() => {
    const id = setInterval(() => {
      try {
        set(read());
      } catch {
        // SDK getter failed; keep last value
      }
    }, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
  return v;
}

/** Subscribe to one of the labBridge callback logs. */
export function useCallbackLog(log: { list: () => readonly unknown[]; subscribe: (l: () => void) => () => void }) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => log.subscribe(force), [log]);
  return log.list();
}

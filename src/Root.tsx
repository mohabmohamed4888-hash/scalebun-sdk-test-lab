import React, { useCallback, useEffect, useState } from 'react';
import App, { BootError, BootSplash } from './App';
import { prepareLab, installLifecycleLog, markInitStarted } from './scalebun/bootstrap';
import { resultsStore } from './testRunner/labRunner';

/**
 * Loads persisted Test Lab state (profile, testRunId, markers, results) BEFORE
 * the SDK is initialized, because the chosen profile decides the init config.
 */
export function Root() {
  const [plan, setPlan] = useState<{ config: Record<string, unknown>; shouldInit: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([prepareLab(), resultsStore.hydrate()])
      .then(([p]) => {
        installLifecycleLog();
        // Provider mode: ScaleBunProvider starts init on mount → mark the start now.
        if (p.shouldInit) markInitStarted();
        setPlan(p);
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(load, [load]);

  if (error) return <BootError error={error} retry={load} />;
  if (!plan) return <BootSplash />;
  return <App config={plan.config} shouldInit={plan.shouldInit} />;
}

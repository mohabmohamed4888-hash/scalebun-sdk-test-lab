import { t, DASH, fakePii, withNeedles, ids, stats } from './helpers';

const C = 'Privacy & Consent' as const;

export const privacyTests = [
  t({
    id: 'PRIV-001',
    category: C,
    name: 'Effective privacy policy matches the profile',
    description: 'getEffectivePrivacyPolicy() vs the privacy block the profile passed to init.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Each of the 5 flags equals the configured value (or the SDK default).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.getEffectivePrivacyPolicy', 'config.privacy.maskTextInputs', 'config.privacy.maskImages', 'config.privacy.redactAuth', 'config.privacy.redactCookies', 'config.privacy.redactBodies'],
    run: async ctx => {
      const policy = ctx.sdk.ScaleBun.getEffectivePrivacyPolicy();
      const cfg = (ctx.profile.build(ctx.env).privacy ?? {}) as Record<string, boolean | undefined>;
      const defaults = { maskTextInputs: true, maskImages: false, redactAuth: true, redactCookies: true, redactBodies: false } as Record<string, boolean>;
      for (const k of Object.keys(defaults)) {
        const expected = cfg[k] ?? defaults[k];
        ctx.expect((policy as Record<string, boolean>)[k] === expected, `${k}: effective ${String((policy as Record<string, boolean>)[k])}, configured ${expected}`);
      }
      return { output: { policy, configured: cfg } };
    },
  }),
  t({
    id: 'PRIV-002',
    category: C,
    name: 'setConsent(false) stops capture (transmitted)',
    description: 'With consent withdrawn, a tracked needle event must NOT be uploaded. Consent restored afterwards.',
    requires: ['sdkInitialized'],
    expectedLocal: '0 needle hits while consent=false; after setConsent(true) a second needle IS uploaded (JS lanes).',
    expectedScaleBun: 'Only test_consent_after (not test_consent_during) appears.',
    dashboardLocation: DASH.events,
    covers: ['facade.setConsent'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const during = `consentoff${ctx.runId.replace(/[^a-z0-9]/gi, '')}`;
      const after = `consenton${ctx.runId.replace(/[^a-z0-9]/gi, '')}`;
      S.setConsent(false);
      let r1;
      try {
        r1 = await withNeedles(ctx, { during }, () => S.track('test_consent_during', ctx.tag({ marker: during })));
      } finally {
        S.setConsent(true);
      }
      const r2 = await withNeedles(ctx, { after }, () => S.track('test_consent_after', ctx.tag({ marker: after })));
      ctx.expect(r1.hits.during === 0, 'event uploaded while consent was withdrawn');
      return { output: { whileOff: r1, afterOn: r2, afterUploaded: r2.hits.after > 0 }, note: r2.hits.after > 0 ? undefined : 'Capture did not resume after setConsent(true) within the window — check KNOWN_SDK_ISSUES.' };
    },
  }),
  t({
    id: 'PRIV-003',
    category: C,
    name: 'setConsent(false, { purgeLocal: true })',
    description: 'Consent withdrawal with local purge; then consent restored.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'stats().pending 0 after purge; ids() before/after recorded.',
    expectedScaleBun: 'Queued-but-unsent events from before the purge never arrive.',
    dashboardLocation: DASH.events,
    covers: ['facade.setConsent'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const before = ids(ctx);
      S.track('test_before_purge_unsent', ctx.tag());
      S.setConsent(false, { purgeLocal: true });
      await ctx.sleep(500);
      const pending = stats(ctx)?.pending;
      S.setConsent(true);
      const after = ids(ctx);
      return { output: { before, after, pendingAfterPurge: pending } };
    },
  }),
  t({
    id: 'PRIV-004',
    category: C,
    name: 'eraseLocalData()',
    description: 'Erases durable queue, pre-init buffer and KV store (cached ids).',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'Resolves; pending 0; records whether installation/anonymous ids rotate.',
    expectedScaleBun: 'Later activity may appear as a new installation (document).',
    dashboardLocation: DASH.sessions,
    covers: ['facade.eraseLocalData'],
    run: async ctx => {
      const before = ids(ctx);
      await ctx.sdk.ScaleBun.eraseLocalData();
      const after = ids(ctx);
      const s = stats(ctx);
      return { output: { before, after, stats: s } };
    },
  }),
  t({
    id: 'PRIV-005',
    category: C,
    name: 'Fake PII in analytics properties (transmitted)',
    description: 'Tracks an event whose properties contain fake email / card / JWT. Documents whether the SDK scrubs analytics props (it is NOT documented to).',
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Needle hit counts recorded per value.',
    expectedScaleBun: 'Behaviour documented: host apps must not put PII into track() properties.',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const res = await withNeedles(ctx, { email: p.email, jwt: p.jwt, card: p.cardCompact }, () =>
        ctx.sdk.ScaleBun.track('test_pii_in_props', ctx.tag({ email: p.email, token: p.jwt, card: p.cardCompact })),
      );
      return { output: res };
    },
  }),
  t({
    id: 'PRIV-006',
    category: C,
    name: 'Fake PII in handled error message (transmitted)',
    description: 'captureError with a message containing a fake email and JWT.',
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Needle hit counts recorded.',
    expectedScaleBun: 'Document whether error messages/metadata are scrubbed.',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const res = await withNeedles(ctx, { email: p.email, jwt: p.jwt }, () =>
        ctx.sdk.ScaleBun.captureError(new Error(`login failed for ${p.email} token=${p.jwt}`), { metadata: { password: p.password, testRunId: ctx.runId } }),
      );
      return { output: res };
    },
  }),
  t({
    id: 'PRIV-007',
    category: C,
    name: 'Replay masking: images, element ids, ignored screens',
    description: 'Open Replay Playground (images) and the PrivacySecret screen after RPL-005 configured maskedElementIds/ignoredScreens.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'n/a',
    expectedScaleBun: 'Masked view (nativeID sdk-test-secret-view) is a solid block; PrivacySecret screen has NO frames; images masked with privacy-strict.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.setPrivacy', 'config.privacy.maskImages'],
    run: async ctx => {
      await ctx.sdk.ScaleBun.replay.setPrivacy({ maskedElementIds: ['sdk-test-secret-view'], ignoredScreens: ['PrivacySecret'] });
      ctx.navigate('PrivacySecret');
      await ctx.sleep(2000);
      ctx.navigate('ReplayPlayground');
      return {};
    },
  }),
  t({
    id: 'PRIV-008',
    category: C,
    name: 'Events-only replay (disableScreenshots)',
    description: 'replay.setPrivacy({ disableScreenshots: true }) then interact; restore afterwards.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Resolves.',
    expectedScaleBun: 'Timeline events without frames for the window.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.setPrivacy'],
    run: async ctx => {
      await ctx.sdk.ScaleBun.replay.setPrivacy({ disableScreenshots: true });
      ctx.navigate('NavA');
      await ctx.sleep(1500);
      ctx.navigate('Home');
      await ctx.sdk.ScaleBun.replay.setPrivacy({ disableScreenshots: false });
      return {};
    },
  }),
  t({
    id: 'PRIV-009',
    category: C,
    name: 'Report privacy & branding round-trip',
    description: 'report.setPrivacy/getPrivacy and setBranding/getBranding (desktop report export settings).',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'get* returns what set* stored.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.report.setPrivacy', 'facade.report.getPrivacy', 'facade.report.setBranding', 'facade.report.getBranding'],
    run: async ctx => {
      const R = ctx.sdk.ScaleBun.report;
      const prevP = R.getPrivacy();
      const prevB = R.getBranding();
      R.setPrivacy({ redactAuth: true, redactCookies: true, redactBodies: true, maskTextInputs: true, maskImages: true });
      R.setBranding({ company: 'SDK Test Lab', confidential: true, footer: `run ${ctx.runId}` });
      const p = R.getPrivacy();
      const b = R.getBranding();
      ctx.expect(p.redactBodies === true && b.company === 'SDK Test Lab', 'round-trip mismatch');
      R.setPrivacy(prevP);
      R.setBranding(prevB);
      return { output: { privacy: p, branding: b } };
    },
  }),
  t({
    id: 'PRIV-010',
    category: C,
    name: 'redactBodies:true changes behaviour?',
    description: 'Profile privacy-strict vs capture-bodies: records needle hits for a body field NOT on the built-in key list (e.g. "nickname") to see whether redactBodies adds anything beyond the default denylist (KSI-003).',
    profiles: ['privacy-strict', 'capture-bodies'],
    requires: ['sdkInitialized', 'networkServer'],
    verification: 'MANUAL',
    expectedLocal: 'Hit count for the non-denylisted field recorded.',
    expectedScaleBun: 'With redactBodies:true the public docs imply bodies are redacted; compare with the dashboard.',
    dashboardLocation: DASH.network,
    covers: ['config.privacy.redactBodies'],
    run: async ctx => {
      const nick = `nick${ctx.runId.replace(/[^a-z0-9]/gi, '')}`;
      const { labFetch } = await import('../services/networkClient');
      const res = await withNeedles(ctx, { nick }, async () => {
        await labFetch(ctx.env.networkServerUrl!, '/echo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: nick }) });
      });
      return { output: { policy: ctx.sdk.ScaleBun.getEffectivePrivacyPolicy(), hits: res.hits } };
    },
  }),
];

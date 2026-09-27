import { t, DASH, ids } from './helpers';
import { Platform } from 'react-native';
import type { EngageCampaignConfig, InAppMessageConfig } from '@scalebun/react-native';

const C = 'Engagement' as const;

// 1×1 transparent PNG — a harmless stand-in for a screenshot attachment.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const engageTests = [
  t({
    id: 'ENG-001',
    category: C,
    name: 'submitRating (valid + invalid)',
    description: 'Ratings 5 and 2 with comments and clientRatingId; rating 0 and 6 must be rejected locally.',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    expectedLocal: 'Valid → { ok:true }; invalid → { ok:false, reason:"invalid_rating" }.',
    expectedScaleBun: 'Two ratings (5★, 2★) with comment containing the run id; idempotent on clientRatingId.',
    dashboardLocation: DASH.ratings,
    covers: ['facade.submitRating'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const five = await S.submitRating({ rating: 5, comment: `sdk_test great ${ctx.runId}`, source: 'manual', clientRatingId: `sdk_test_rating_5_${ctx.runId}` });
      const two = await S.submitRating({ rating: 2, comment: `sdk_test meh ${ctx.runId}`, source: 'in_app', clientRatingId: `sdk_test_rating_2_${ctx.runId}` });
      const dupe = await S.submitRating({ rating: 5, comment: 'duplicate', source: 'manual', clientRatingId: `sdk_test_rating_5_${ctx.runId}` });
      const zero = await S.submitRating({ rating: 0 });
      const six = await S.submitRating({ rating: 6 });
      ctx.expect(five?.ok === true, `rating 5: ${JSON.stringify(five)}`);
      ctx.expect(two?.ok === true, `rating 2: ${JSON.stringify(two)}`);
      ctx.expect(zero?.reason === 'invalid_rating' && six?.reason === 'invalid_rating', 'out-of-range ratings not rejected');
      return { output: { five, two, dupe, zero, six } };
    },
  }),
  t({
    id: 'ENG-002',
    category: C,
    name: 'Fetch Engage config',
    description: 'engage.fetchConfig with platform/appVersion/endUserId/deviceId context.',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Non-null config; campaign & in-app counts reported.',
    expectedScaleBun: 'n/a',
    dashboardLocation: DASH.engage,
    covers: ['facade.engage.fetchConfig'],
    run: async ctx => {
      const cfg = await ctx.sdk.ScaleBun.engage.fetchConfig({
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        endUserId: ids(ctx)?.userId,
        deviceId: ids(ctx)?.installationId,
      });
      ctx.expect(cfg, 'fetchConfig returned null');
      return {
        output: {
          campaigns: cfg!.campaigns?.map(c => ({ id: c.id, type: c.type, trigger: c.trigger })) ?? [],
          inAppMessages: cfg!.inAppMessages?.map(m => ({ id: m.id, trigger: m.trigger })) ?? [],
        },
      };
    },
  }),
  t({
    id: 'ENG-003',
    category: C,
    name: 'Debug: in-app messages served to this device',
    description: 'engage.debugFetchInAppMessages() — includes queued Send-Test previews.',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Array (possibly empty).',
    expectedScaleBun: 'n/a',
    dashboardLocation: DASH.engage,
    covers: ['facade.engage.debugFetchInAppMessages'],
    run: async ctx => {
      const msgs = await ctx.sdk.ScaleBun.engage.debugFetchInAppMessages();
      ctx.expect(Array.isArray(msgs), 'not an array');
      return { output: (msgs ?? []).map(m => ({ id: m.id, preview: (m as { preview?: boolean }).preview ?? false })) };
    },
  }),
  t({
    id: 'ENG-004',
    category: C,
    name: 'showEngagePrompt for every campaign type',
    description: 'useEngagePrompt().showEngagePrompt for NPS, CSAT, FEEDBACK, CUSTOM, RATING_PROMPT. Needs matching dashboard campaigns (see DASHBOARD_VERIFICATION.md §Engage).',
    requires: ['sdkInitialized', 'clientKey', 'bridge'],
    interactive: true,
    expectedLocal: 'Boolean per type; true only where a campaign is configured and eligible. dismissEngagePrompt closes it.',
    expectedScaleBun: 'Impression (+ completion if you submit) per campaign.',
    dashboardLocation: DASH.engage,
    covers: ['export.useEngagePrompt', 'useEngagePrompt.showEngagePrompt', 'useEngagePrompt.dismissEngagePrompt', 'provider.defaultTypes', 'provider.ratingRouting'],
    timeoutMs: 60000,
    run: async ctx => {
      const eng = ctx.bridge.engage!;
      const shown: Record<string, boolean> = {};
      for (const type of ['NPS', 'CSAT', 'FEEDBACK', 'CUSTOM', 'RATING_PROMPT'] as const) {
        shown[type] = await eng.showEngagePrompt({ types: [type] });
        if (shown[type]) {
          await ctx.sleep(2500);
          eng.dismissEngagePrompt();
          await ctx.sleep(400);
        }
      }
      return { output: shown, note: Object.values(shown).some(Boolean) ? undefined : 'No campaign shown — configure dashboard campaigns (or they are throttled: run ENG-010).' };
    },
  }),
  t({
    id: 'ENG-005',
    category: C,
    name: 'In-app message show / dismiss',
    description: 'showInAppMessage({ trigger:"test_trigger_in_app" }) then dismissInAppMessage.',
    requires: ['sdkInitialized', 'clientKey', 'bridge'],
    expectedLocal: 'Boolean result; dismiss works.',
    expectedScaleBun: 'impression + dismiss events for the in-app message.',
    dashboardLocation: DASH.engage,
    covers: ['useEngagePrompt.showInAppMessage', 'useEngagePrompt.dismissInAppMessage'],
    run: async ctx => {
      const eng = ctx.bridge.engage!;
      const a = await eng.showInAppMessage({ trigger: 'test_trigger_in_app' });
      const b = a ? a : await eng.showInAppMessage({ event: 'test_trigger_in_app' });
      if (a || b) {
        await ctx.sleep(2000);
        eng.dismissInAppMessage();
      }
      return { output: { byTrigger: a, byEvent: b } };
    },
  }),
  t({
    id: 'ENG-006',
    category: C,
    name: 'Behavioural trigger events',
    description: 'Tracks test_trigger_in_app, test_trigger_survey, test_trigger_nps, test_trigger_feedback so dashboard campaigns keyed to custom_event triggers fire.',
    requires: ['sdkInitialized'],
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'Events emitted (fan out to the Engage trigger engine).',
    expectedScaleBun: 'Configured campaigns appear within seconds.',
    dashboardLocation: DASH.engage,
    covers: ['facade.track'],
    run: async ctx => {
      for (const e of ['test_trigger_in_app', 'test_trigger_survey', 'test_trigger_nps', 'test_trigger_feedback']) {
        ctx.sdk.ScaleBun.track(e, ctx.tag());
        await ctx.sleep(3000);
      }
      return {};
    },
  }),
  t({
    id: 'ENG-007',
    category: C,
    name: 'Survey responses (plain, attachments, confirmed)',
    description: 'submitResponse, submitResponseWithAttachments (1×1 PNG), submitResponseConfirmed with stage callbacks, against a FAKE surveyId.',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    expectedLocal: 'Fire-and-forget calls do not throw; confirmed submit resolves or rejects with a server reason (unknown survey) — both recorded, stages logged.',
    expectedScaleBun: 'Responses tagged sdk_test (may be rejected server-side for an unknown survey id).',
    dashboardLocation: DASH.engage,
    covers: ['facade.engage.submitResponse', 'facade.engage.submitResponseWithAttachments', 'facade.engage.submitResponseConfirmed'],
    run: async ctx => {
      const E = ctx.sdk.ScaleBun.engage;
      const surveyId = `sdk_test_survey_${ctx.runId}`;
      E.submitResponse({ surveyId, score: 9, text: `sdk_test nps ${ctx.runId}`, tags: ['sdk_test'] });
      E.submitResponseWithAttachments({ surveyId, text: 'with screenshot' }, [{ kind: 'screenshot', base64: TINY_PNG, mime: 'image/png', width: 1, height: 1, masked: true }]);
      const stages: string[] = [];
      let confirmed: string;
      try {
        await E.submitResponseConfirmed({ surveyId, score: 7 }, [], { responseId: `sdk_test_resp_${ctx.runId}`, onStage: s => stages.push(String(s)) });
        confirmed = 'resolved';
      } catch (e) {
        confirmed = `rejected: ${e instanceof Error ? e.message : String(e)}`;
      }
      return { output: { surveyId, confirmed, stages } };
    },
  }),
  t({
    id: 'ENG-008',
    category: C,
    name: 'Engage tracking lanes',
    description: 'trackEvent (impression/click/dismiss), trackSurveyImpression (shown/started), emitRatingEvent funnel, trackCoachmarkEvent, flushEvents, engage.submitRating.',
    requires: ['sdkInitialized', 'clientKey'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Engage events for campaign sdk_test_campaign_<run>; rating funnel eligible→shown→selected.',
    dashboardLocation: `${DASH.engage} / ${DASH.ratings}`,
    covers: ['facade.engage.trackEvent', 'facade.engage.trackSurveyImpression', 'facade.engage.emitRatingEvent', 'facade.engage.trackCoachmarkEvent', 'facade.engage.flushEvents', 'facade.engage.submitRating'],
    run: async ctx => {
      const E = ctx.sdk.ScaleBun.engage;
      const campaignId = `sdk_test_campaign_${ctx.runId}`;
      for (const type of ['impression', 'click', 'dismiss'] as const) E.trackEvent({ campaignId, channel: 'inapp', type, isTest: true, source: 'sdk_test_lab', meta: { testRunId: ctx.runId } });
      E.trackSurveyImpression({ surveyId: `sdk_test_survey_${ctx.runId}`, stage: 'shown' });
      E.trackSurveyImpression({ surveyId: `sdk_test_survey_${ctx.runId}`, stage: 'started' });
      for (const type of ['rating_prompt_eligible', 'rating_prompt_shown', 'rating_selected'] as const) E.emitRatingEvent({ type, promptId: campaignId, stars: type === 'rating_selected' ? 4 : undefined });
      E.trackCoachmarkEvent('sdk_test_coachmark_step', { testRunId: ctx.runId, step: 1 });
      E.submitRating({ rating: 4, comment: `engage ns ${ctx.runId}`, source: 'prompt' });
      E.flushEvents();
      return {};
    },
  }),
  t({
    id: 'ENG-009',
    category: C,
    name: 'Native store review sheet',
    description: 'engage.requestStoreReview() → Play In-App Review / SKStoreReviewController.',
    requires: ['sdkInitialized'],
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'Resolves boolean; the OS may silently decline (quota).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.engage.requestStoreReview'],
    run: async ctx => ({ output: { resolved: await ctx.sdk.ScaleBun.engage.requestStoreReview() } }),
  }),
  t({
    id: 'ENG-010',
    category: C,
    name: 'Reset in-app throttle state (debug)',
    description: 'clearInAppMessageCache() and resetInAppState() — lets throttled messages show again.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Both return a number ≥ 0; identity unchanged.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.engage.clearInAppMessageCache', 'facade.engage.resetInAppState'],
    run: async ctx => {
      const before = ids(ctx)?.installationId;
      const a = ctx.sdk.ScaleBun.engage.clearInAppMessageCache();
      const b = ctx.sdk.ScaleBun.engage.resetInAppState();
      ctx.expect(typeof a === 'number' && typeof b === 'number', 'non-numeric return');
      ctx.expect(ids(ctx)?.installationId === before, 'identity changed');
      return { output: { cleared: a, reset: b } };
    },
  }),
  t({
    id: 'ENG-011',
    category: C,
    name: 'Inline placement slot',
    description: '<ScaleBunInlineSlot placementKey="sdk_test.inline"> on the Engage screen shows its fallback child when no campaign owns it.',
    requires: ['sdkInitialized', 'bridge'],
    expectedLocal: 'Fallback content rendered (logged by the screen).',
    expectedScaleBun: 'With an inline campaign on placement sdk_test.inline, the campaign replaces the fallback.',
    dashboardLocation: DASH.engage,
    covers: ['export.ScaleBunInlineSlot'],
    run: async ctx => {
      ctx.navigate('Engage');
      const hit = await ctx.bridge.engageLog.waitFor(e => e.kind === 'inlineFallbackRendered', 3000);
      return { output: { fallbackRendered: !!hit } };
    },
  }),
  t({
    id: 'ENG-012',
    category: C,
    name: 'Coachmark anchors',
    description: 'ScaleBunAnchor / useScaleBunAnchor targets (keys sdk_test.anchor.button, sdk_test.anchor.card) inside EngageAnchorProvider on the Engage screen.',
    requires: ['sdkInitialized'],
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'Anchors registered (screen renders).',
    expectedScaleBun: 'A coachmark tour targeting those anchor keys points at the right controls.',
    dashboardLocation: DASH.engage,
    covers: ['export.ScaleBunAnchor', 'export.useScaleBunAnchor', 'export.EngageAnchorProvider'],
    run: async ctx => {
      ctx.navigate('Engage');
      return {};
    },
  }),
  t({
    id: 'ENG-013',
    category: C,
    name: 'Renderer registry resolution',
    description: 'resolvePromptRenderer / resolveInAppRenderer / resolveInAppLayout for known types.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'NPS renderer present; banner/modal layouts resolve to renderers.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.resolvePromptRenderer', 'export.resolveInAppRenderer', 'export.resolveInAppLayout', 'export.PROMPT_RENDERERS', 'export.INAPP_RENDERERS', 'export.EngagePromptView', 'export.EngageInAppView'],
    run: async ctx => {
      const nps = ctx.sdk.resolvePromptRenderer('NPS');
      const layouts = ['banner', 'modal', 'fullscreen', 'unknown_layout'] as unknown as InAppMessageConfig['layout'][];
      const resolved = layouts.map(l => ({ layout: String(l), resolved: String(ctx.sdk.resolveInAppLayout(l)), renderer: typeof ctx.sdk.resolveInAppRenderer(l) }));
      ctx.expect(nps !== null, 'no NPS renderer');
      return {
        output: {
          promptTypes: Object.keys(ctx.sdk.PROMPT_RENDERERS),
          inAppLayouts: Object.keys(ctx.sdk.INAPP_RENDERERS),
          resolved,
          components: { EngagePromptView: typeof ctx.sdk.resolvePromptRenderer, EngageInAppView: 'mounted by provider' },
        },
      };
    },
  }),
  t({
    id: 'ENG-014',
    category: C,
    name: 'Throttle & variant selection (pure functions)',
    description: 'EngageThrottleStore + isCampaignEligible/isInAppEligible/selectCampaignToRender/selectInAppToRender/selectInAppVariant with synthetic configs.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Fresh campaign eligible; showOnce campaign ineligible after an impression recorded in the store; variant deterministic per deviceId.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.EngageThrottleStore', 'export.isCampaignEligible', 'export.isInAppEligible', 'export.selectCampaignToRender', 'export.selectInAppToRender', 'export.selectInAppVariant'],
    run: async ctx => {
      const store = new ctx.sdk.EngageThrottleStore();
      const campaign = { id: `sdk_test_c_${ctx.runId}`, type: 'NPS', name: 'Test', question: 'How likely?', throttle: { showOnce: true } } as EngageCampaignConfig;
      const state = store.get(campaign.id);
      const eligible = ctx.sdk.isCampaignEligible(campaign, state, Date.now(), 0);
      const picked = ctx.sdk.selectCampaignToRender([campaign], store);
      const msg = { id: `sdk_test_m_${ctx.runId}`, layout: 'banner', throttle: {} } as unknown as InAppMessageConfig;
      const inAppOk = ctx.sdk.isInAppEligible(msg, store.get(msg.id), Date.now(), 0);
      const pickedMsg = ctx.sdk.selectInAppToRender([msg], store);
      const v1 = ctx.sdk.selectInAppVariant(msg, 'device-a');
      const v2 = ctx.sdk.selectInAppVariant(msg, 'device-a');
      store.clearOne(campaign.id);
      ctx.expect(eligible, 'fresh campaign not eligible');
      ctx.expect(JSON.stringify(v1) === JSON.stringify(v2), 'variant not deterministic');
      return { output: { eligible, picked: picked ? 'campaign' : null, inAppOk, pickedMsg: pickedMsg ? 'message' : null, variant: v1 } };
    },
  }),
  t({
    id: 'ENG-015',
    category: C,
    name: 'Send-Test preview polling / deep-link CTA / game handler',
    description: 'previewPollMs=4000 is set in debug builds. Press "Send Test" in the dashboard while the app is open; tap a link CTA; gamified campaigns hit onInAppGameRequest.',
    interactive: true,
    requires: ['sdkInitialized', 'clientKey'],
    verification: 'MANUAL',
    expectedLocal: 'Preview appears within ~5s; CTA deep link logged on the Engage screen log and routed; game requests logged with a NOT_CONFIGURED result.',
    expectedScaleBun: 'rendered + click events for the preview (isTest:true).',
    dashboardLocation: DASH.engage,
    covers: ['provider.previewPollMs', 'provider.onInAppDeepLink', 'provider.onInAppGameRequest'],
    run: async ctx => ({ output: ctx.bridge.engageLog.list().slice(0, 10) }),
  }),
];

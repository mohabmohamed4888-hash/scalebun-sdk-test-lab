import { t, DASH, flushAndObserve, stats } from './helpers';
import { writeJson, KEYS, readJson } from '../services/persistence';
import { Linking } from 'react-native';

const C = 'Analytics' as const;

export const analyticsTests = [
  t({
    id: 'ANA-001',
    category: C,
    name: 'Single custom event (ScaleBun.track)',
    description: 'track("test_single_event") with the run tag, then flush.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw; an SDK upload is observed after flush.',
    expectedScaleBun: 'One test_single_event with property testRunId.',
    dashboardLocation: DASH.events,
    covers: ['facade.track', 'facade.flush'],
    run: async ctx => {
      const mark = ctx.egress.mark();
      ctx.sdk.ScaleBun.track('test_single_event', ctx.tag({ token: ctx.token() }));
      const s = await flushAndObserve(ctx, mark);
      ctx.expect(s.requests > 0, 'no SDK upload observed after flush');
      return { output: s };
    },
  }),
  t({
    id: 'ANA-002',
    category: C,
    name: 'Envelope lane events.track',
    description: 'ScaleBun.events.track() writes straight to the /batch envelope lane.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'stats().pending increments then drains after events.flush().',
    expectedScaleBun: 'Event test_envelope_event.',
    dashboardLocation: DASH.events,
    covers: ['facade.events.track', 'facade.events.flush', 'facade.events.stats'],
    run: async ctx => {
      const before = stats(ctx);
      ctx.sdk.ScaleBun.events.track('test_envelope_event', ctx.tag());
      const queued = stats(ctx);
      await ctx.sdk.ScaleBun.events.flush();
      const after = await ctx.waitFor(() => (stats(ctx)?.pending === 0 ? stats(ctx) : null), 8000, 300);
      ctx.expect(queued && before && queued.pending >= before.pending, 'pending did not increase');
      ctx.expect(after, `pending never drained: ${JSON.stringify(stats(ctx))}`);
      return { output: { before, queued, after } };
    },
  }),
  t({
    id: 'ANA-003',
    category: C,
    name: 'Property types: string/number/boolean/null/nested/array',
    description: 'One event carrying every JSON property type the SDK accepts.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw; stats().dropped unchanged.',
    expectedScaleBun: 'test_property_types with all fields; nested/array fields either preserved or flattened as documented.',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      ctx.sdk.ScaleBun.track(
        'test_property_types',
        ctx.tag({
          str: 'hello',
          int: 42,
          float: 3.14159,
          negative: -7,
          zero: 0,
          boolTrue: true,
          boolFalse: false,
          nullValue: null,
          nested: { level1: { level2: { level3: 'deep' } } },
          array: [1, 'two', true, null],
          emptyString: '',
          emptyObject: {},
        }),
      );
      await ctx.sdk.ScaleBun.flush();
      const d1 = stats(ctx)?.dropped ?? 0;
      ctx.expect(d1 === d0, `event dropped by validation (dropped ${d0}→${d1})`);
      return { output: { droppedBefore: d0, droppedAfter: d1 } };
    },
  }),
  t({
    id: 'ANA-004',
    category: C,
    name: 'Unicode, Arabic, RTL and emoji properties',
    description: 'Arabic text, mixed RTL/LTR, CJK, combining characters and emoji in names and values.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'test_unicode_props renders Arabic "اختبار" and emoji correctly (no mojibake).',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      ctx.sdk.ScaleBun.track(
        'test_unicode_props',
        ctx.tag({
          arabic: 'اختبار حزمة تطوير البرمجيات',
          mixedRtl: 'Order رقم 123 تم',
          cjk: '测试 テスト 테스트',
          emoji: '🧪🚀✅👩🏽‍💻',
          combining: 'é (é)',
          zeroWidth: 'a​b',
          'مفتاح_عربي': 'arabic key',
        }),
      );
      ctx.sdk.ScaleBun.track('اختبار_حدث', ctx.tag({ note: 'Arabic event name' }));
      return {};
    },
  }),
  t({
    id: 'ANA-005',
    category: C,
    name: 'Rapid event burst (100) without blocking the UI',
    description: 'Tracks 100 numbered events in chunks of 20 yielding to the UI between chunks.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Completes < 5s; dropped counter reported (should stay 0).',
    expectedScaleBun: '100 events test_burst with seq 1..100, no gaps/duplicates.',
    dashboardLocation: DASH.events,
    covers: ['facade.track', 'facade.events.stats'],
    run: async ctx => {
      const t0 = Date.now();
      const d0 = stats(ctx)?.dropped ?? 0;
      for (let i = 1; i <= 100; i++) {
        ctx.sdk.ScaleBun.track('test_burst', ctx.tag({ seq: i }));
        if (i % 20 === 0) await ctx.sleep(0);
      }
      const elapsed = Date.now() - t0;
      await ctx.sdk.ScaleBun.flush();
      const s = stats(ctx);
      ctx.expect(elapsed < 5000, `burst took ${elapsed}ms`);
      return { output: { generated: 100, elapsedMs: elapsed, droppedDelta: (s?.dropped ?? 0) - d0, stats: s } };
    },
  }),
  t({
    id: 'ANA-006',
    category: C,
    name: 'Automatic lifecycle events',
    description: 'first_open / app_open / session_start are emitted on init when autoLifecycleEvents is on (default).',
    requires: ['sdkInitialized'],
    expectedLocal: 'Nothing to call — observes that init produced SDK uploads.',
    expectedScaleBun: 'first_open (first install only), app_open and session_start for this installation.',
    dashboardLocation: DASH.events,
    covers: ['config.autoLifecycleEvents', 'config.automaticEventTracking', 'config.eventTracking'],
    run: async ctx => ({ output: { sdkEgressSinceBoot: ctx.egress.sdkSummary(0).paths }, note: 'Filter events by installationId shown on Home.' }),
  }),
  t({
    id: 'ANA-007',
    category: C,
    name: 'Automatic interaction tracking',
    description: 'Provider captureInteractions (default true) records privacy-safe root touch metadata. Tap 5 buttons on the Replay Playground.',
    interactive: true,
    verification: 'MANUAL',
    requires: ['sdkInitialized'],
    expectedLocal: 'n/a',
    expectedScaleBun: 'Interaction/tap events with target metadata but NO text/input values.',
    dashboardLocation: `${DASH.sessions} (interactions) / heatmaps`,
    covers: ['provider.captureInteractions', 'config.captureInteractionHeatmap'],
    run: async ctx => {
      ctx.navigate('ReplayPlayground');
      return { note: 'Tap several buttons, then verify taps in the session timeline/heatmap.' };
    },
  }),
  t({
    id: 'ANA-008',
    category: C,
    name: 'Screen tracking via navigation ref',
    description: 'Programmatically navigates Home → Analytics → Identity → Analytics → Home.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Navigation succeeded.',
    expectedScaleBun: 'screen_viewed sequence: Analytics, Identity, Analytics, Home in the same session.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.setNavigationRef', 'provider.navigationRef'],
    run: async ctx => {
      const seq = ['Analytics', 'Identity', 'Analytics', 'Home'];
      for (const r of seq) {
        ctx.expect(ctx.navigate(r), `navigation to ${r} failed`);
        await ctx.sleep(700);
      }
      return { output: { sequence: seq } };
    },
  }),
  t({
    id: 'ANA-009',
    category: C,
    name: 'Manual flush drains the queue',
    description: 'Tracks 5 events then awaits ScaleBun.flush() and events.flush().',
    requires: ['sdkInitialized', 'appId', 'online'],
    expectedLocal: 'events.stats().pending === 0 within 8s after flush.',
    expectedScaleBun: '5 test_manual_flush events.',
    dashboardLocation: DASH.events,
    covers: ['facade.flush', 'facade.events.flush'],
    run: async ctx => {
      for (let i = 0; i < 5; i++) ctx.sdk.ScaleBun.track('test_manual_flush', ctx.tag({ n: i }));
      await ctx.sdk.ScaleBun.flush();
      await ctx.sdk.ScaleBun.events.flush();
      const s = await ctx.waitFor(() => (stats(ctx)?.pending === 0 ? stats(ctx) : null), 8000, 300);
      ctx.expect(s, `pending not drained: ${JSON.stringify(stats(ctx))}`);
      return { output: s };
    },
  }),
  t({
    id: 'ANA-010',
    category: C,
    name: 'Event immediately before backgrounding',
    description: 'Tracks test_before_background; background the app within 2 seconds of tapping Run.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'SDK flushes on background (lifecycle listener).',
    expectedScaleBun: 'test_before_background arrives, followed by app_backgrounded.',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      ctx.sdk.ScaleBun.track('test_before_background', ctx.tag());
      return { note: 'Press Home NOW. Return after 10s and check the dashboard.' };
    },
  }),
  t({
    id: 'ANA-011',
    category: C,
    name: 'Event immediately before restart (part 1)',
    description: 'Tracks test_before_restart and stores a marker; then kill & relaunch the app and run ANA-012.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Marker persisted.',
    expectedScaleBun: 'test_before_restart arrives exactly once (queue persisted across restart).',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const token = ctx.token('restart');
      ctx.sdk.ScaleBun.track('test_before_restart', ctx.tag({ token }));
      await writeJson(KEYS.restartMarker, { at: new Date().toISOString(), runId: ctx.runId, token });
      return { note: 'Now swipe the app away (force stop) and relaunch, then run ANA-012.' };
    },
  }),
  t({
    id: 'ANA-012',
    category: C,
    name: 'Event after restart (part 2)',
    description: 'Reads the ANA-011 marker, emits test_after_restart with the same token.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Marker from the previous process found.',
    expectedScaleBun: 'test_before_restart then test_after_restart share the token, no duplicate.',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const marker = await readJson<{ token: string; runId: string } | null>(KEYS.restartMarker, null);
      ctx.expect(marker, 'no restart marker — run ANA-011 first');
      ctx.sdk.ScaleBun.track('test_after_restart', ctx.tag({ token: marker!.token, previousRunId: marker!.runId }));
      return { output: marker };
    },
  }),
  t({
    id: 'ANA-013',
    category: C,
    name: 'Purchase via ScaleBun.trackPurchase (full fields)',
    description: 'One-time purchase with productId, productName, quantity, tax, fee, discount.',
    requires: ['sdkInitialized'],
    expectedLocal: 'stats().dropped unchanged (valid purchase).',
    expectedScaleBun: '$29.00 USD gross, net = 29 - 2.10 - 0.90; product pro_monthly_test.',
    dashboardLocation: DASH.revenue,
    covers: ['facade.trackPurchase'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      const transactionId = `sdk_test_txn_${ctx.runId}_1`;
      ctx.sdk.ScaleBun.trackPurchase({
        revenue: 29,
        currency: 'usd',
        transactionId,
        productId: 'pro_monthly_test',
        productName: 'Pro monthly (TEST)',
        quantity: 1,
        tax: 2.1,
        fee: 0.9,
        discount: 0,
        testRunId: ctx.runId,
      });
      await ctx.sdk.ScaleBun.flush();
      ctx.expect((stats(ctx)?.dropped ?? 0) === d0, 'valid purchase was dropped');
      return { output: { transactionId } };
    },
  }),
  t({
    id: 'ANA-014',
    category: C,
    name: 'Purchase via events.trackPurchase',
    description: 'Same purchase through the envelope namespace.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'No drop.',
    expectedScaleBun: 'Transaction sdk_test_txn_<run>_2, 9.99 EUR.',
    dashboardLocation: DASH.revenue,
    covers: ['facade.events.trackPurchase'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      ctx.sdk.ScaleBun.events.trackPurchase({ revenue: 9.99, currency: 'EUR', transactionId: `sdk_test_txn_${ctx.runId}_2`, productId: 'coins_pack_test', testRunId: ctx.runId });
      ctx.expect((stats(ctx)?.dropped ?? 0) === d0, 'valid purchase dropped');
      return {};
    },
  }),
  t({
    id: 'ANA-015',
    category: C,
    name: 'Repeated transactionId (idempotency)',
    description: 'Sends the SAME transactionId three times.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Revenue counted ONCE (backend dedups by appId + transactionId).',
    dashboardLocation: DASH.revenue,
    covers: ['facade.trackPurchase'],
    run: async ctx => {
      const transactionId = `sdk_test_txn_${ctx.runId}_dup`;
      for (let i = 0; i < 3; i++) ctx.sdk.ScaleBun.trackPurchase({ revenue: 5, currency: 'USD', transactionId, productId: 'dup_test', attempt: i, testRunId: ctx.runId });
      await ctx.sdk.ScaleBun.flush();
      return { output: { transactionId, sent: 3 }, note: 'Dashboard must show exactly one $5.00 transaction for this id.' };
    },
  }),
  t({
    id: 'ANA-016',
    category: C,
    name: 'Refund / dispute / adjustment sign convention',
    description: 'refund & dispute sent with POSITIVE amounts must be stored negative; adjustment keeps the caller sign.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No drop.',
    expectedScaleBun: 'refund -29, dispute -5, adjustment +1.50 and -0.50 in the transaction ledger.',
    dashboardLocation: DASH.revenue,
    covers: ['facade.trackPurchase'],
    run: async ctx => {
      const id = (s: string) => `sdk_test_txn_${ctx.runId}_${s}`;
      ctx.sdk.ScaleBun.trackPurchase({ revenue: 29, currency: 'USD', transactionId: id('refund'), type: 'refund', productId: 'pro_monthly_test' });
      ctx.sdk.ScaleBun.trackPurchase({ revenue: 5, currency: 'USD', transactionId: id('dispute'), type: 'dispute' });
      ctx.sdk.ScaleBun.trackPurchase({ revenue: 1.5, currency: 'USD', transactionId: id('adj_plus'), type: 'adjustment' });
      ctx.sdk.ScaleBun.trackPurchase({ revenue: -0.5, currency: 'USD', transactionId: id('adj_minus'), type: 'adjustment' });
      return {};
    },
  }),
  t({
    id: 'ANA-017',
    category: C,
    name: 'Invalid purchases are dropped and counted',
    description: 'Missing currency, missing transactionId, string fee — each must be DROPPED (not sent) and counted in stats().dropped.',
    requires: ['sdkInitialized', 'appId'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'stats().dropped increases by 3.',
    expectedScaleBun: 'None of the invalid purchases appear.',
    dashboardLocation: DASH.revenue,
    covers: ['facade.trackPurchase', 'facade.events.stats'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      const bad = ctx.sdk.ScaleBun.trackPurchase as unknown as (x: Record<string, unknown>) => void;
      bad({ revenue: 10, currency: '', transactionId: `sdk_test_bad1_${ctx.runId}` });
      bad({ revenue: 10, currency: 'USD' });
      bad({ revenue: 10, currency: 'USD', transactionId: `sdk_test_bad3_${ctx.runId}`, fee: '0.30' });
      const d1 = stats(ctx)?.dropped ?? 0;
      ctx.expect(d1 - d0 === 3, `expected 3 drops, got ${d1 - d0}`);
      return { output: { droppedDelta: d1 - d0 } };
    },
  }),
  t({
    id: 'ANA-018',
    category: C,
    name: 'Subscription lifecycle',
    description: 'trial_started → trial_converted → renewed → plan_changed → cancel_scheduled → canceled, via both trackSubscription entry points; one invalid id.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'Valid calls not dropped; the invalid subscriptionId ("!bad id") increments dropped by 1.',
    expectedScaleBun: 'Subscription sdk_test_sub_<run> with 6 ledger entries; repeated subscriptionEventId kept once.',
    dashboardLocation: DASH.subscriptions,
    covers: ['facade.trackSubscription', 'facade.events.trackSubscription'],
    run: async ctx => {
      const subscriptionId = `sdk_test_sub_${ctx.runId.replace(/[^a-zA-Z0-9]/g, '')}`;
      const plan = { id: 'pro_monthly_test', name: 'Pro monthly (TEST)', amount: 29, currency: 'USD', interval: 'month' as const };
      const d0 = stats(ctx)?.dropped ?? 0;
      const steps = ['trial_started', 'trial_converted', 'renewed', 'plan_changed', 'cancel_scheduled', 'canceled'] as const;
      steps.forEach((status, i) => {
        const fn = i % 2 === 0 ? ctx.sdk.ScaleBun.trackSubscription.bind(ctx.sdk.ScaleBun) : ctx.sdk.ScaleBun.events.trackSubscription;
        fn({
          subscriptionId,
          subscriptionEventId: `${subscriptionId}:${status}`,
          status,
          plan,
          cancellationReason: status === 'canceled' ? 'other' : undefined,
          properties: { testRunId: ctx.runId },
        });
      });
      // same logical change again → backend keeps the first
      ctx.sdk.ScaleBun.trackSubscription({ subscriptionId, subscriptionEventId: `${subscriptionId}:renewed`, status: 'renewed', plan });
      const d1 = stats(ctx)?.dropped ?? 0;
      ctx.sdk.ScaleBun.trackSubscription({ subscriptionId: '!bad id', status: 'started' });
      const d2 = stats(ctx)?.dropped ?? 0;
      ctx.expect(d1 === d0, `valid subscription events dropped (${d1 - d0})`);
      ctx.expect(d2 - d1 === 1, `invalid subscriptionId not dropped (delta ${d2 - d1})`);
      return { output: { subscriptionId } };
    },
  }),
  t({
    id: 'ANA-019',
    category: C,
    name: 'Mini e-commerce funnel',
    description: 'Product Viewed → Add To Cart → Checkout Started → Purchase Completed (+ trackPurchase) for the current identity.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'A 4-step funnel with 100% conversion for this user; purchase linked to Purchase Completed.',
    dashboardLocation: `${DASH.funnels} + ${DASH.userJourney}`,
    covers: ['facade.track', 'facade.trackPurchase'],
    run: async ctx => {
      const product = { product_id: 'sku_test_mug', product_name: 'Test Mug', price: 12.5, currency: 'USD' };
      const cartId = `cart_${ctx.runId}`;
      ctx.sdk.ScaleBun.track('Product Viewed', ctx.tag(product));
      await ctx.sleep(300);
      ctx.sdk.ScaleBun.track('Add To Cart', ctx.tag({ ...product, cart_id: cartId, quantity: 2 }));
      await ctx.sleep(300);
      ctx.sdk.ScaleBun.track('Checkout Started', ctx.tag({ cart_id: cartId, value: 25, currency: 'USD', item_count: 2 }));
      await ctx.sleep(300);
      const transactionId = `sdk_test_txn_${ctx.runId}_funnel`;
      ctx.sdk.ScaleBun.track('Purchase Completed', ctx.tag({ cart_id: cartId, order_id: transactionId, value: 25, currency: 'USD' }));
      ctx.sdk.ScaleBun.trackPurchase({ revenue: 25, currency: 'USD', transactionId, productId: 'sku_test_mug', quantity: 2, testRunId: ctx.runId });
      await ctx.sdk.ScaleBun.flush();
      return { output: { cartId, transactionId } };
    },
  }),
  t({
    id: 'ANA-020',
    category: C,
    name: 'Typed tracking plan',
    description: 'createTypedTracker / defineTrackingPlan: typed track(), trackUnchecked(), plan object.',
    requires: ['sdkInitialized'],
    expectedLocal: 'plan.events contains the declared event; runtime does NOT enforce (documented: mobile has no runtime governance).',
    expectedScaleBun: 'test_typed_checkout and test_untyped_event.',
    dashboardLocation: DASH.events,
    covers: ['export.createTypedTracker', 'export.defineTrackingPlan', 'typedTracker.track', 'typedTracker.trackUnchecked', 'typedTracker.plan'],
    run: async ctx => {
      const plan = ctx.sdk.defineTrackingPlan({
        test_typed_checkout: { required: ['cart_id'], props: { cart_id: 'string', items: 'number', gift: 'boolean' } },
      } as const);
      const tracker = ctx.sdk.createTypedTracker(ctx.sdk.ScaleBun, plan);
      tracker.track('test_typed_checkout', { cart_id: `cart_${ctx.runId}`, items: 3, gift: false });
      tracker.trackUnchecked('test_untyped_event', ctx.tag());
      ctx.expect('test_typed_checkout' in tracker.plan.events, 'plan missing declared event');
      return { output: { plan: tracker.plan } };
    },
  }),
  t({
    id: 'ANA-021',
    category: C,
    name: 'UI state dimensions (setUiState / clearUiState)',
    description: 'Declares filter-sheet=open, taps are attributed to it, then clears. Includes ;:| and >32-char values to test sanitization.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Taps between set/clear carry ui state filter-sheet:open; sanitized long value capped at 32 chars without ;:|.',
    dashboardLocation: `${DASH.sessions} → interactions / heatmap by UI state`,
    covers: ['facade.setUiState', 'facade.clearUiState'],
    run: async ctx => {
      ctx.sdk.ScaleBun.setUiState('filter-sheet', 'open');
      ctx.sdk.ScaleBun.setUiState('checkout;step:x|y', 'payment_method_selection_extremely_long_value_over_32');
      ctx.sdk.ScaleBun.track('test_ui_state_set', ctx.tag());
      await ctx.sleep(500);
      ctx.sdk.ScaleBun.clearUiState('filter-sheet');
      ctx.sdk.ScaleBun.clearUiState();
      return {};
    },
  }),
  t({
    id: 'ANA-022',
    category: C,
    name: 'Permission outcome tracking',
    description: 'trackPermission for every documented status with host-reported permissions.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'permission_result events: camera granted, location denied, contacts blocked, microphone undetermined, photos limited.',
    dashboardLocation: `${DASH.events} (permission_result) / Funnels`,
    covers: ['facade.trackPermission'],
    run: async ctx => {
      const statuses = [
        ['camera', 'granted'],
        ['location', 'denied'],
        ['contacts', 'blocked'],
        ['microphone', 'undetermined'],
        ['photos', 'limited'],
      ] as const;
      for (const [p, s] of statuses) ctx.sdk.ScaleBun.trackPermission(p, s, ctx.tag({ simulated: true }));
      return { note: 'These are SIMULATED host-reported results (no OS prompt shown).' };
    },
  }),
  t({
    id: 'ANA-023',
    category: C,
    name: 'Impression tracking (<ScaleBunImpression>)',
    description: 'Opens the Impressions screen whose promo card is wrapped in ScaleBunImpression; waits for visibility dwell.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Screen rendered.',
    expectedScaleBun: 'element_viewed name=sdk_test_promo (once per resetKey).',
    dashboardLocation: DASH.events,
    covers: ['export.ScaleBunImpression', 'impression.resetKey'],
    run: async ctx => {
      ctx.expect(ctx.navigate('Impressions', { runId: ctx.runId }), 'navigation failed');
      await ctx.sleep(2500);
      ctx.navigate('Home');
      return {};
    },
  }),
  t({
    id: 'ANA-024',
    category: C,
    name: 'Deep link opened',
    description: 'Opens scalebuntestlab://analytics?utm_source=sdk_test&scalebun_click_id=<run> through Linking.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Linking.openURL resolves; app routes to Analytics.',
    expectedScaleBun: 'Automatic deep-link event with the URL (query tokens redacted where applicable).',
    dashboardLocation: DASH.events,
    covers: ['config.automaticEventTracking'],
    run: async ctx => {
      const url = `scalebuntestlab://analytics?utm_source=sdk_test&scalebun_click_id=${encodeURIComponent(ctx.runId)}`;
      await Linking.openURL(url);
      return { output: { url } };
    },
  }),
];

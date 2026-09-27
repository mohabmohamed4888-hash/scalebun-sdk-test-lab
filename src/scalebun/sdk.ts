/**
 * The ONLY module that imports the ScaleBun SDK runtime. Everything else gets
 * the SDK through `LabSdk` (tests receive it via TestContext), which keeps the
 * test catalog importable from Jest without loading native modules.
 */
import ScaleBun, {
  captureException,
  captureMessage,
  otaOrchestrator,
  OtaOrchestrator,
  otaEventEmitter,
  createTypedTracker,
  defineTrackingPlan,
  getDebugTransport,
  getPerformanceFeature,
  getProfilerFeature,
  EngageThrottleStore,
  isCampaignEligible,
  isInAppEligible,
  selectCampaignToRender,
  selectInAppToRender,
  selectInAppVariant,
  resolvePromptRenderer,
  resolveInAppRenderer,
  resolveInAppLayout,
  PROMPT_RENDERERS,
  INAPP_RENDERERS,
} from '@scalebun/react-native';

const sdkPackage = require('@scalebun/react-native/package.json') as { version: string };

export const sdk = {
  ScaleBun,
  captureException,
  captureMessage,
  otaOrchestrator,
  OtaOrchestrator,
  otaEventEmitter,
  createTypedTracker,
  defineTrackingPlan,
  getDebugTransport,
  getPerformanceFeature,
  getProfilerFeature,
  EngageThrottleStore,
  isCampaignEligible,
  isInAppEligible,
  selectCampaignToRender,
  selectInAppToRender,
  selectInAppVariant,
  resolvePromptRenderer,
  resolveInAppRenderer,
  resolveInAppLayout,
  PROMPT_RENDERERS,
  INAPP_RENDERERS,
  version: sdkPackage.version,
};

export type LabSdk = typeof sdk;
export type ScaleBunFacade = typeof ScaleBun;

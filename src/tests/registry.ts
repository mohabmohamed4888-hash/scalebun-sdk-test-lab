import type { TestDefinition } from '../testRunner/types';
import { initTests } from './init';
import { analyticsTests } from './analytics';
import { sessionTests } from './sessions';
import { identityTests } from './identity';
import { errorTests } from './errors';
import { networkTests } from './network';
import { offlineTests } from './offline';
import { performanceTests } from './performance';
import { replayTests } from './replay';
import { navigationTests } from './navigation';
import { pushTests } from './push';
import { engageTests } from './engage';
import { attributionTests } from './attribution';
import { privacyTests } from './privacy';
import { otaTests } from './ota';
import { diagnosticsTests } from './diagnostics';
import { featureMatrixTests } from './featureMatrix';
import { edgeTests } from './edge';

export const ALL_TESTS: readonly TestDefinition[] = [
  ...initTests,
  ...analyticsTests,
  ...sessionTests,
  ...identityTests,
  ...errorTests,
  ...networkTests,
  ...offlineTests,
  ...performanceTests,
  ...replayTests,
  ...navigationTests,
  ...pushTests,
  ...engageTests,
  ...attributionTests,
  ...privacyTests,
  ...otaTests,
  ...diagnosticsTests,
  ...featureMatrixTests,
  ...edgeTests,
];

export const TESTS_BY_ID: ReadonlyMap<string, TestDefinition> = new Map(ALL_TESTS.map(t => [t.id, t]));

export function testsInCategory(category: TestDefinition['category']): TestDefinition[] {
  return ALL_TESTS.filter(t => t.category === category);
}

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withScaleBun } = require('@scalebun/react-native/metro');

/**
 * Metro configuration.
 *
 * `withScaleBun` stubs the SDK's OPTIONAL integration modules when absent
 * (expo-router is intentionally not installed in this bare RN Test Lab).
 *
 * `devTools` bundles the ScaleBun desktop-debugger bridge + profiler so the
 * Diagnostics tests (enableDebug / debug.* / report.export / getProfilerFeature)
 * can exercise it. Build a production-shaped bundle with SCALEBUN_DEVTOOLS=0 to
 * verify those APIs degrade gracefully when excluded (see TEST_PLAN.md, DIAG-*).
 */
const devTools = process.env.SCALEBUN_DEVTOOLS !== '0';

// tools/ holds Node-only companions (network server, SERVER-SIDE verifier with a
// secret .env.verifier). Block them from the app bundle so nothing there can
// ever be required by React Native code by accident.
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const projectTools = new RegExp(`^${escapeRe(path.join(__dirname, 'tools'))}[\\\\/].*`);

const config = {
  resolver: {
    blockList: [projectTools, /\.env\.verifier$/],
  },
};

module.exports = withScaleBun(mergeConfig(getDefaultConfig(__dirname), config), {
  features: { devTools },
});

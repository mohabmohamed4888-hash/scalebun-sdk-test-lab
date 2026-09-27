module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['tools/**/node_modules/**', 'android/**', 'ios/**', 'coverage/**'],
  rules: {
    // Test Lab screens intentionally use small inline layout styles.
    'react-native/no-inline-styles': 'off',
    // ScaleBunErrorBoundary's documented `fallback` prop is a render function.
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
  },
  overrides: [
    {
      files: ['tools/**/*.js', '*.config.js', 'jest.setup.js'],
      env: { node: true },
    },
  ],
};

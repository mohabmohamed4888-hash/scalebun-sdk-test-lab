module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        // Only client-safe values are ever read from .env (see src/config/env.ts).
        // Server-side secrets live in tools/scalebun-verifier/.env.verifier, which
        // this plugin never reads.
        safe: false,
        allowUndefined: true,
        verbose: false,
      },
    ],
  ],
};

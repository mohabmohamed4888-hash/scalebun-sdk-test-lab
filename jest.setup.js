/* eslint-env jest */
// Jest runs the Test Lab's OWN logic (runner, store, report, redaction, config
// validation). It never stands in for the ScaleBun SDK: tests that need the SDK
// are integration tests executed on a device from the app itself.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-device-info', () =>
  require('react-native-device-info/jest/react-native-device-info-mock'),
);

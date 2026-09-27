/**
 * @format
 *
 * ORDER MATTERS:
 * 1. The egress observer wraps global fetch BEFORE the ScaleBun SDK module is
 *    evaluated, so every JS-lane SDK upload passes through it (pass-through,
 *    never modified). See src/services/egressObserver.ts.
 * 2. Only then is the app (and with it the SDK) required.
 */
import { egressObserver } from './src/services/egressObserver';
egressObserver.install();

const { AppRegistry } = require('react-native');
const { name: appName } = require('./app.json');
const { Root } = require('./src/Root');

AppRegistry.registerComponent(appName, () => Root);

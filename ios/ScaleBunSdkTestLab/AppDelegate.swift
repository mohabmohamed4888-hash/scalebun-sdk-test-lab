import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
#if canImport(FirebaseCore)
import FirebaseCore
#endif

/// ScaleBun native hooks.
///
/// `npx scalebun init ios` prints `import scalebun_react_native` +
/// `ScaleBunEngage.didFinishLaunching(...)` for Swift AppDelegates. In
/// @scalebun/react-native 2.4.0 the Swift classes are declared `internal`
/// (`class ScaleBunEngageModule`, `class ScaleBunOtaModule`) and are only
/// renamed to `ScaleBunEngage` / `ScaleBunOta` for the Objective-C runtime, so
/// the printed Swift snippet cannot resolve those symbols from the app module.
/// The SDK's ObjC codemod has the mirror-image problem: it emits
/// `[ScaleBunOtaModule getBundleURL]`, but the class is exported to ObjC as
/// `ScaleBunOta`. See KNOWN_SDK_ISSUES.md (KSI-004). Until that is fixed we
/// reach the same @objc static methods through the Objective-C runtime by their
/// registered runtime names, which works regardless of Swift access level.
enum ScaleBunNativeHooks {
  private static func cls(_ name: String) -> AnyObject? {
    NSClassFromString(name) as AnyObject?
  }

  /// Runtime bridge to the SDK's `@objc static func getBundleURL()` on the
  /// class registered as `ScaleBunOta` (Swift type `ScaleBunOtaModule`).
  static func getBundleURL() -> URL? {
    guard let ota = cls("ScaleBunOta") else { return nil }
    let sel = NSSelectorFromString("getBundleURL")
    guard ota.responds(to: sel) else { return nil }
    return ota.perform(sel)?.takeUnretainedValue() as? URL
  }

  static func didFinishLaunching(_ launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    guard let engage = cls("ScaleBunEngage") else { return }
    let sel = NSSelectorFromString("didFinishLaunchingWithLaunchOptions:")
    guard engage.responds(to: sel) else { return }
    let opts: NSDictionary? = launchOptions.map { dict in
      NSDictionary(dictionary: Dictionary(uniqueKeysWithValues: dict.map { ($0.key as AnyHashable, $0.value) }))
    }
    _ = engage.perform(sel, with: opts)
  }

  static func didRegister(deviceToken: Data) {
    guard let engage = cls("ScaleBunEngage") else { return }
    let sel = NSSelectorFromString("didRegisterForRemoteNotificationsWithDeviceToken:")
    guard engage.responds(to: sel) else { return }
    _ = engage.perform(sel, with: deviceToken as NSData)
  }

  static func didFailToRegister(error: Error) {
    guard let engage = cls("ScaleBunEngage") else { return }
    let sel = NSSelectorFromString("didFailToRegisterForRemoteNotificationsWithError:")
    guard engage.responds(to: sel) else { return }
    _ = engage.perform(sel, with: error as NSError)
  }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    #if canImport(FirebaseCore)
    // Firebase is optional for the Test Lab. Without GoogleService-Info.plist the
    // Push screen reports NOT_CONFIGURED instead of the app crashing at launch.
    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    }
    #endif

    ScaleBunNativeHooks.didFinishLaunching(launchOptions)

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "ScaleBunSdkTestLab",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    ScaleBunNativeHooks.didRegister(deviceToken: deviceToken)
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    ScaleBunNativeHooks.didFailToRegister(error: error)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    // ScaleBun OTA slot first; fall back to the bundle baked into the IPA.
    ScaleBunNativeHooks.getBundleURL()
      ?? Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

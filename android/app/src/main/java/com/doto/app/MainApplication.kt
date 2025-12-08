package com.doto.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(new MyReactPackage());
            // Filter out Facebook SDK packages to prevent crashes
            val allPackages = PackageList(this).packages
            val filteredPackages = allPackages.filter { pkg ->
              val packageName = pkg.javaClass.name
              // Only exclude react-native-fbsdk-next packages, not core React Native packages
              val shouldExclude = packageName.contains("androidsdk", ignoreCase = true) && 
                                  (packageName.contains("fbsdk", ignoreCase = true) || 
                                   packageName.contains("FBAppEventsLogger", ignoreCase = true) ||
                                   packageName.contains("FBSDK", ignoreCase = true))
              if (shouldExclude) {
                android.util.Log.w("MainApplication", "Excluding Facebook SDK package: $packageName")
              }
              !shouldExclude
            }
            android.util.Log.d("MainApplication", "Loaded ${filteredPackages.size} packages (filtered from ${allPackages.size})")
            return filteredPackages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // Facebook SDK disabled to prevent crashes - packages filtered in getPackages()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

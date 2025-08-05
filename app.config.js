export default {
  expo: {
    name: "BetterU",
    slug: "betterutestflightv8",
    version: "1.0.5",
    orientation: "portrait",
    icon: "./assets/images/betterumobile.png",
    userInterfaceStyle: "light",
    scheme: "betteru",
    jsEngine: "hermes",
    newArchEnabled: false,
    splash: {
      image: "./assets/images/splash-icon.jpg",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.enriqueortiz.betteru",
      buildNumber: "38",
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to let you take profile pictures.",
        NSPhotoLibraryUsageDescription: "This app uses the photo library to let you select profile pictures.",
        NSPhotoLibraryAddUsageDescription: "This app uses the photo library to save workout progress images.",
        NSLocationWhenInUseUsageDescription: "This app uses your location to track your runs and show your position on the map.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location to track your runs in the background.",
        NSLocationAlwaysUsageDescription: "This app uses your location to track your runs in the background.",
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ["remote-notification", "location", "audio"],
        CFBundleAllowMixedLocalizations: true,
        SKAdNetworkItems: [
          {
            SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork"
          }
        ]
      },
      config: {
        googleMapsApiKey: "AIzaSyCqGOh4wjmj3CHim04fZbxAqM_Przqy024"
      }
    },
    android: {
      package: "com.enriqueortiz.betteru",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.jpg",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      "expo-router",
      "expo-image-picker",
      "expo-av",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.jpg",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
    experiments: {
      tsconfigPaths: true
    },
    extra: {
      eas: {
        projectId: "57d27416-420d-4d92-8d6d-d1365c22f311"
      },
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY
    },
    env: {
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY
    },
    owner: "easbetteru",
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/57d27416-420d-4d92-8d6d-d1365c22f311"
    }
  }
}; 
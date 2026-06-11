#!/bin/bash

# Build Next.js for static export (required for Capacitor)
echo "Building Next.js..."
npm run build

echo "Installing Capacitor..."
npm install

echo "Syncing to Android..."
npx cap sync android

echo "✅ APK generation setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Download Android Studio from https://developer.android.com/studio"
echo "2. Open the 'android' folder with Android Studio"
echo "3. Click Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "4. APK will be at: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📲 To install on phone:"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"

# FreeCell Solitaire - Open Source Learning Tool

An educational FreeCell solitaire game showcasing modern game development across multiple platforms. Perfect for developers learning web and mobile game development techniques.

## 🎯 What Makes This Special

- **Open Source & Educational**: Complete source code for both web and mobile implementations
- **Cross-Platform**: Same game logic in JavaScript (web) and Dart (Flutter mobile)
- **Production Ready**: Fully tested, Google Play Store ready mobile app
- **Modern Development**: Clean architecture, comprehensive testing, CI/CD ready

## 🎮 Play the Game

**Web Version**: https://gabiteodoru.github.io/freecell/
- Pure HTML5/JavaScript implementation
- Drag & drop or tap-to-move controls
- Smart auto-move features
- Undo/redo functionality

**Mobile Version**: Available on Google Play Store (coming soon)
- Native Flutter app
- Same game logic as web version
- Touch-optimized interface

## Mobile App Development Setup

### Prerequisites
- Flutter SDK
- Android SDK
- Java 17

### Android Signing Setup
Signing credentials are stored **outside** the repository for security:

1. **Keystore location**: `/home/gabi/keystores/freecell-mobile-release.keystore`
2. **Properties file**: `/home/gabi/keystores/freecell-mobile-key.properties`

For local development:
```bash
cp mobile/android/local.properties.template mobile/android/local.properties
# Edit local.properties with your SDK paths
```

**Security**: All signing credentials live in `/home/gabi/keystores/` and are never committed to git.

## 🎓 Learning Resources

This project demonstrates:

### Web Development
- **Game Logic**: Pure JavaScript implementation in `web/freecell-engine.js`
- **UI/UX**: Responsive CSS with drag & drop interactions
- **Testing**: Comprehensive test suite with `web/freecell-tests.js`
- **PWA**: Service worker and manifest for offline play

### Mobile Development
- **Flutter Framework**: Complete Dart implementation in `mobile/lib/`
- **Cross-Platform**: Single codebase for Android/iOS
- **State Management**: Clean separation of game logic and UI
- **Testing**: Unit tests for game engine in `mobile/test/`

### DevOps & Security
- **CI/CD Ready**: Proper project structure and build configuration
- **Security Best Practices**: Sensitive data management, proper .gitignore
- **Release Management**: Signed builds, store assets, privacy policy

## ⚠️ Important Gotchas (Save Yourself 6 Hours!)

### React Native Drag & Drop (2025)
**TL;DR: Don't use React Native for drag & drop games in 2025.**
- React Native's drag & drop support is fundamentally broken on mobile
- `PanGestureHandler` conflicts with `ScrollView` in unpredictable ways
- Touch events don't propagate correctly for complex card interactions
- **Solution**: Use Flutter for mobile, keep React Native for simple UIs only

### Java Version for Flutter Android Builds
**TL;DR: Downgrade to Java 17, not 21.**
- Java 21 causes cryptic Gradle build failures
- Flutter/Gradle toolchain not yet compatible with Java 21
- **Solution**: `sudo apt install openjdk-17-jdk && sudo update-alternatives --config java`
- Verify with `java --version` before building

These issues cost us 6+ hours of debugging - hopefully this saves you the pain!

## 🤝 Contributing

This is an educational project - contributions welcome! Great for:
- Learning game development patterns
- Practicing Flutter/JavaScript
- Understanding cross-platform development
- Exploring mobile app store deployment

## 📱 Try It Yourself

1. **Play the web version** to understand the game mechanics
2. **Explore the source code** to see implementation details  
3. **Set up the mobile development environment** following the setup guide above
4. **Build and customize** your own version

Perfect for computer science students, bootcamp graduates, or anyone interested in game development!
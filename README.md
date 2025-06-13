# FreeCell Solitaire

A complete FreeCell solitaire game available as both web and mobile apps.

## Web Version
Play online at: https://gabiteodoru.github.io/freecell/

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
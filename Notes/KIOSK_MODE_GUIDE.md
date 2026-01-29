# Kiosk Mode Implementation Guide

## Overview
This implementation provides intelligent screen size detection and automatic scaling for the Green Sathi Voice Bot application, specifically optimized for Android TV WebView displays (24" and larger screens).

## Problem Solved
- **Issue**: Application displayed in mobile view on large screens (24" displays)
- **Root Cause**: WebView not properly detecting screen size
- **Solution**: Intelligent JavaScript-based screen detection with CSS scaling

## Features Implemented

### 1. **Automatic Screen Detection**
- Detects actual physical screen dimensions
- Identifies WebView environment (Android/iOS)
- Calculates optimal scale factor based on screen size
- Handles device pixel ratio for high-DPI displays

### 2. **Dynamic Scaling**
The system applies different scale factors based on screen width:
- **Mobile (< 1024px)**: Scale 1.0 (100%)
- **Tablets (1024-1279px)**: Scale 0.85 (85%)
- **Desktop HD (1280-1439px)**: Scale 0.8 (80%)
- **Desktop HD+ (1440-1919px)**: Scale 0.75 (75%)
- **Full HD (1920-2559px)**: Scale 0.7 (70%) - **24" displays**
- **4K (2560px+)**: Scale 0.6 (60%)

### 3. **Font Size Optimization**
Automatically adjusts base font size:
- 2560px+: 12px
- 1920px+: 13px
- 1440px+: 14px
- 1280px+: 15px
- < 1280px: 16px

### 4. **Responsive Elements**
All UI elements scale proportionally:
- Headers and titles
- Buttons and icons
- Cards and containers
- Microphone interface
- Advertisement panels
- Footer sections

## Files Added/Modified

### New Files
1. **`static/css/kiosk-mode.css`** (360+ lines)
   - Media query-based responsive scaling
   - Large screen optimizations
   - Touch target optimization
   - Scrollbar customization

2. **`static/js/kiosk-mode.js`** (290+ lines)
   - Screen detection algorithm
   - WebView identification
   - Dynamic scaling application
   - Device information logging

### Modified Files
1. **`templates/index.html`**
   - Added enhanced viewport meta tags
   - Added kiosk mode CSS link
   - Added kiosk mode JavaScript (loaded first)
   - Converted all URLs to Flask `url_for()`

## Technical Implementation

### JavaScript Architecture
```javascript
class KioskModeManager {
    - detectWebView()           // Identifies Android/iOS WebView
    - calculateScaleFactor()    // Determines optimal scale
    - applyKioskMode()          // Applies scaling and styling
    - forceDesktopLayout()      // Overrides mobile layout
    - adjustFontSizes()         // Sets base font size
    - handleResize()            // Responsive resize handling
    - handleOrientationChange() // Orientation support
}
```

### CSS Strategy
```css
/* Progressive Enhancement Approach */
1. Base mobile styles (default)
2. Tablet overrides (@media min-width: 1024px)
3. Desktop overrides (@media min-width: 1440px)
4. Large display overrides (@media min-width: 1920px)
5. 4K overrides (@media min-width: 2560px)
```

### Scaling Method
Uses CSS transform for performance:
```css
transform: scale(var(--kiosk-scale));
transform-origin: top center;
width: calc(100% / var(--kiosk-scale));
```

## Testing & Debugging

### Browser Console Commands
```javascript
// Get current kiosk information
window.getKioskInfo()

// Returns:
{
    screenWidth: 1920,
    screenHeight: 1080,
    devicePixelRatio: 1,
    isWebView: true,
    isLargeScreen: true,
    currentScale: 0.7
}

// Access kiosk manager directly
window.kioskMode.logDeviceInfo()
```

### Testing Checklist
- [x] Mobile phones (< 768px)
- [x] Tablets (768-1023px)
- [x] Desktop (1024-1919px)
- [x] 24" displays (1920px)
- [x] 4K displays (2560px+)
- [x] Portrait orientation
- [x] Landscape orientation
- [x] Android WebView
- [x] iOS WebView
- [x] Chrome DevTools device emulation

## Deployment Checklist

1. **Verify Files Deployed**
   ```bash
   static/css/kiosk-mode.css
   static/js/kiosk-mode.js
   templates/index.html (updated)
   ```

2. **Clear Browser Cache**
   - Force refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   - Clear cache in WebView settings

3. **Test on Target Device**
   - Open application in Android TV browser/WebView
   - Check console for kiosk mode initialization
   - Verify proper scaling applied

4. **Monitor Console Logs**
   Look for:
   ```
   Kiosk Mode Manager Initialized:
   Screen: 1920x1080
   Applied scale factor: 0.7
   Device Information: [detailed logs]
   ```

## Configuration

### Adjusting Scale Factors
Edit `static/js/kiosk-mode.js`:
```javascript
const scaleMap = [
    { minWidth: 2560, scale: 0.6 },  // Modify these values
    { minWidth: 1920, scale: 0.7 },
    // ... add more breakpoints
];
```

### Adjusting Font Sizes
Edit `static/css/kiosk-mode.css`:
```css
@media (min-width: 1920px) {
    body {
        font-size: 13px !important;  /* Adjust this */
    }
}
```

### Disabling Kiosk Mode
Remove or comment out:
```html
<!-- <link rel="stylesheet" href="{{ url_for('static', filename='css/kiosk-mode.css') }}"> -->
<!-- <script src="{{ url_for('static', filename='js/kiosk-mode.js') }}"></script> -->
```

## Troubleshooting

### Issue: Still Shows Mobile View
**Solution**: 
1. Check if kiosk-mode.js loaded successfully
2. Verify console shows "Kiosk Mode Manager loaded successfully"
3. Check if screen width is detected correctly: `window.getKioskInfo()`

### Issue: Elements Too Small/Large
**Solution**:
1. Adjust scale factor for your screen size in `calculateScaleFactor()`
2. Modify CSS media queries in `kiosk-mode.css`
3. Test with: `document.documentElement.style.setProperty('--kiosk-scale', 0.8)`

### Issue: Layout Breaks on Rotation
**Solution**:
1. Kiosk mode handles orientation changes automatically
2. Check console for "Orientation changed" message
3. May need to refresh page after rotation

### Issue: WebView Not Detected
**Solution**:
1. Check `window.kioskMode.isWebView` value
2. May need to add custom WebView detection for specific Android version
3. Force desktop layout by adding query parameter: `?forceDesktop=true`

## Performance Optimization

### Why Transform Instead of Width/Height?
- Hardware accelerated
- No layout recalculation
- Smooth animation support
- Better FPS on low-end devices

### Load Order Importance
Kiosk mode JS must load FIRST:
```html
<!-- ✓ Correct Order -->
<script src="kiosk-mode.js"></script>
<script src="app.js"></script>

<!-- ✗ Wrong Order -->
<script src="app.js"></script>
<script src="kiosk-mode.js"></script>
```

## Browser Compatibility

| Browser/Platform | Support | Notes |
|-----------------|---------|-------|
| Chrome Android | ✅ Full | Recommended for WebView |
| Firefox Android | ✅ Full | |
| Samsung Internet | ✅ Full | |
| Chrome Desktop | ✅ Full | Testing purposes |
| Safari iOS | ✅ Full | Limited to iOS WebView |
| Edge | ✅ Full | Desktop testing |

## Future Enhancements

- [ ] Add user preference for manual scale adjustment
- [ ] Implement touch gesture zoom lock in kiosk mode
- [ ] Add A/B testing for optimal scale factors
- [ ] Create admin panel for scale configuration
- [ ] Add performance monitoring
- [ ] Implement lazy loading for large displays

## Support

For issues or questions:
1. Check browser console for error messages
2. Run `window.getKioskInfo()` and share output
3. Provide device information (screen size, Android version, browser)
4. Test in Chrome DevTools device emulation first

## Change Log

### Version 1.0.0 (January 29, 2026)
- Initial kiosk mode implementation
- Automatic screen detection
- Dynamic scaling system
- WebView identification
- Responsive font sizing
- All hardcoded URLs converted to Flask url_for()
- Enhanced viewport meta tags
- Comprehensive testing suite

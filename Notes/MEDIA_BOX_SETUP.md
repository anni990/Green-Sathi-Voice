# Media Box Setup Guide (1366x768 Kiosk Display)

## Display Specifications
- **Resolution**: 1366 x 768 pixels
- **Aspect Ratio**: 16:9 (landscape)
- **Device Type**: Kiosk/Media Box Android Display

## Optimizations Applied

### 1. Responsive Typography
All text sizes have been reduced by 30-50% for the kiosk display:
- Base font: 8-12px (was 12-18px)
- Logo: 1.5-2rem (was 2.5-3.5rem)
- Buttons: 0.6-0.75rem (was 0.75-0.875rem)

### 2. Component Sizing
- **Mic Button**: 3-4.5rem (50% reduction from 5-8rem)
- **Card Padding**: 0.5-1rem (33% reduction)
- **Spacing**: All margins reduced proportionally

### 3. Advertisement Panels
- **Left Panel**: 60px (was 100px)
- **Right Panel**: 120px (was 200px)
- **Body Margins**: Left 60px, Right 120px
- **Ad Content**: Text scaled down by 30-40%

## CSS Media Query
```css
@media (min-width: 1366px) and (max-height: 768px) {
    /* All kiosk-specific optimizations */
}
```

## Testing Instructions

### Browser Testing (Before Deployment)
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set custom dimensions: **1366 x 768**
4. Test URL: http://localhost:5000
5. Verify:
   - ✅ Logo not oversized
   - ✅ Text readable but not too large
   - ✅ No content overflow
   - ✅ Mic button centered and proportional
   - ✅ Advertisement panels don't overlap content

### On Actual Media Box
1. Deploy APK via median.co
2. Install on kiosk display
3. Launch in fullscreen/kiosk mode
4. Verify all elements render correctly
5. Test voice interaction flow

## Files Modified
- `static/css/responsive-dynamic.css` - Main responsive system
- `static/css/advertisment.css` - Ad panel sizing
- All 6 user-facing templates import responsive CSS

## Troubleshooting

### If elements still too large:
Adjust values in `responsive-dynamic.css` line 291:
```css
--base-font-size: clamp(8px, 0.7vw, 12px); /* Reduce 0.7vw to 0.6vw */
--logo-size: clamp(1.5rem, 2vw, 2rem);     /* Reduce 2vw to 1.5vw */
```

### If elements too small:
Increase the middle value (viewport calculation):
```css
--base-font-size: clamp(8px, 0.8vw, 12px); /* Increase 0.7vw to 0.8vw */
```

### If ad panels too wide/narrow:
Edit `static/css/advertisment.css` line 38:
```css
margin-left: 60px !important;  /* Adjust as needed */
margin-right: 120px !important; /* Adjust as needed */
```

## Deployment Checklist
- [ ] All CSS files updated with 1366x768 media query
- [ ] Test in browser at exact resolution (1366x768)
- [ ] Verify no CDN dependencies (all local assets)
- [ ] Build APK with median.co
- [ ] Install on media box
- [ ] Test in kiosk mode
- [ ] Verify touch/voice interactions
- [ ] Check all pages (login, register, settings)

## Support
If issues persist after deployment, take screenshots at actual device and share for further adjustments.

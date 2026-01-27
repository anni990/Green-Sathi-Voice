# Tailwind CSS Build Guide

## Overview
This project now uses **locally-built Tailwind CSS** instead of CDN for better Android WebView compatibility and faster loading.

## What Changed

### Files Added
- `tailwindcss.exe` - Standalone Tailwind v3.4.17 CLI (50MB executable)
- `tailwind.config.js` - Tailwind configuration pointing to templates
- `input.css` - Source CSS with Tailwind directives
- `static/css/tailwind.min.css` - **Generated CSS file** (~40KB optimized)

### Files Modified
- `templates/index.html` - Uses local CSS instead of CDN
- `templates/index_modular.html` - Uses local CSS instead of CDN
- `templates/device_login.html` - Uses local CSS instead of CDN
- `templates/device_register.html` - Uses local CSS instead of CDN
- `templates/device_settings.html` - Uses local CSS instead of CDN

### Admin Templates
**NOT modified** - Admin portal still uses CDN for easier development. Can be migrated later if needed.

## How to Rebuild CSS (After Editing HTML)

When you add new Tailwind classes to your HTML files, you need to regenerate the CSS:

### Windows PowerShell
```powershell
./tailwindcss.exe -i input.css -o static/css/tailwind.min.css --minify
```

### During Development (Auto-rebuild on changes)
```powershell
./tailwindcss.exe -i input.css -o static/css/tailwind.min.css --watch
```

This will monitor your HTML files and automatically rebuild CSS when you save changes.

## File Size Comparison

| Method | File Size | Load Time |
|--------|-----------|-----------|
| CDN (old) | ~3.5 MB | Slow + blocked in WebView |
| Local (new) | **~40 KB** | Fast + works in WebView ✅ |

## Deployment Checklist

1. ✅ Ensure `static/css/tailwind.min.css` exists
2. ✅ Commit the CSS file to git (it's generated but needed for deployment)
3. ✅ No Node.js required on production server - Flask just serves the CSS file
4. ✅ When building APK with median.co, the CSS file will be bundled automatically

## Adding New Templates

If you add new HTML files that use Tailwind:

1. Add the file path to `tailwind.config.js`:
   ```javascript
   content: [
     "./templates/index.html",
     "./templates/your_new_file.html",  // Add here
     // ...
   ]
   ```

2. Rebuild the CSS:
   ```powershell
   ./tailwindcss.exe -i input.css -o static/css/tailwind.min.css --minify
   ```

3. In your new HTML file, use:
   ```html
   <link rel="stylesheet" href="{{ url_for('static', filename='css/tailwind.min.css') }}">
   ```

## Troubleshooting

### CSS not loading in Flask
- Check that `static/css/tailwind.min.css` exists
- Verify Flask is serving static files correctly
- Clear browser cache (Ctrl + Shift + Delete)

### Missing styles after HTML changes
- Run the rebuild command above
- Make sure the HTML file is listed in `tailwind.config.js`

### WebView still not showing CSS
- Ensure median.co is bundling the `static/` folder
- Check WebView console for errors
- Verify the CSS file is included in the APK

## Custom Styles

Your existing custom CSS files still work:
- `static/css/style.css` - Custom animations and variables
- `static/css/landing.css` - Landing page specific styles
- `static/css/advertisment.css` - Ad layout styling

These load **after** Tailwind and can override/extend it.

## Benefits

✅ **Android WebView compatible** - No external CDN blocking  
✅ **Offline support** - CSS bundled in APK  
✅ **Faster loading** - ~40KB vs 3.5MB  
✅ **Production optimized** - Only includes classes you use  
✅ **No Node.js on server** - Pure Flask deployment  
✅ **Same visual appearance** - Zero UI changes  

## Notes

- The `tailwindcss.exe` file is ~50MB but only needed on development machine
- Admin templates still use CDN for now (can migrate if needed)
- Font Awesome and Animate.css still load from CDN (they work fine in WebView)
- Google Fonts in `landing.css` may need to be downloaded locally for full offline support

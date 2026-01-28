"""
WebView Compatibility Validation Script
Tests all Android WebView fixes are properly implemented
"""

import os
import re

def test_webview_fixes_css():
    """Test webview-fixes.css exists and has required rules"""
    file_path = "static/css/webview-fixes.css"
    
    if not os.path.exists(file_path):
        print(f"❌ {file_path} NOT FOUND")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'WebView class selector': 'body.webview' in content,
        'Android platform selector': 'body[data-platform="android"]' in content,
        'Mic button visibility fix': '#landing-mic-icon' in content and 'display: flex !important' in content,
        'Logo size fallback': '#landing-page header img' in content and 'width:' in content,
        'Padding fallbacks': '.glass-card' in content and 'padding:' in content,
        'Animation disable': 'animation: none !important' in content,
        'Backdrop-filter disable': 'backdrop-filter: none' in content,
        'Kiosk 1366x768 overrides': '@media (min-width: 1366px) and (max-height: 768px)' in content,
    }
    
    print("\n🧪 Testing webview-fixes.css:")
    all_passed = True
    for check, result in checks.items():
        status = "✅" if result else "❌"
        print(f"  {status} {check}")
        if not result:
            all_passed = False
    
    return all_passed

def test_advertisement_fixes():
    """Test advertisement.css has compatibility fixes"""
    file_path = "static/css/advertisment.css"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'Solid background on left-ad': 'linear-gradient' in content and '#left-ad' in content,
        'No backdrop-filter on left-ad': content.count('backdrop-filter') == 0 or 'backdrop-filter: none' in content,
        'Animations disabled': 'animation: none !important' in content,
        'No scrollVertical animation': '@keyframes scrollVertical' not in content,
        'Position fixed on left-ad': 'position: fixed' in content,
        'Kiosk text size (9px)': 'font-size: 9px' in content,
    }
    
    print("\n🧪 Testing advertisment.css:")
    all_passed = True
    for check, result in checks.items():
        status = "✅" if result else "❌"
        print(f"  {status} {check}")
        if not result:
            all_passed = False
    
    return all_passed

def test_template_detection():
    """Test templates have WebView detection script"""
    templates = [
        'templates/index.html',
        'templates/index_modular.html',
    ]
    
    print("\n🧪 Testing WebView detection in templates:")
    all_passed = True
    
    for template in templates:
        if not os.path.exists(template):
            print(f"  ⚠️  {template} not found")
            continue
        
        with open(template, 'r', encoding='utf-8') as f:
            content = f.read()
        
        has_script = 'navigator.userAgent' in content and 'webview' in content
        has_css = 'webview-fixes.css' in content
        has_viewport = 'maximum-scale=1.0' in content
        
        status = "✅" if (has_script and has_css and has_viewport) else "❌"
        print(f"  {status} {template}")
        
        if not has_script:
            print(f"      ❌ Missing WebView detection script")
            all_passed = False
        if not has_css:
            print(f"      ❌ Missing webview-fixes.css import")
            all_passed = False
        if not has_viewport:
            print(f"      ❌ Missing proper viewport meta tag")
            all_passed = False
    
    return all_passed

def test_file_structure():
    """Verify all required files exist"""
    required_files = [
        'static/css/webview-fixes.css',
        'static/css/responsive-dynamic.css',
        'static/css/advertisment.css',
        'templates/index.html',
        'WEBVIEW_FIXES_DOCUMENTATION.md',
    ]
    
    print("\n🧪 Testing file structure:")
    all_passed = True
    
    for file_path in required_files:
        exists = os.path.exists(file_path)
        status = "✅" if exists else "❌"
        print(f"  {status} {file_path}")
        if not exists:
            all_passed = False
    
    return all_passed

def main():
    print("=" * 70)
    print("🎯 ANDROID WEBVIEW COMPATIBILITY VALIDATION")
    print("=" * 70)
    
    result1 = test_file_structure()
    result2 = test_webview_fixes_css()
    result3 = test_advertisement_fixes()
    result4 = test_template_detection()
    
    print("\n" + "=" * 70)
    if result1 and result2 and result3 and result4:
        print("✅ ALL WEBVIEW COMPATIBILITY TESTS PASSED!")
        print("\n📱 Fixes Implemented:")
        print("  1. CSS variable fallbacks for older Android WebView")
        print("  2. Removed unsupported backdrop-filter (solid backgrounds)")
        print("  3. Disabled all animations for text visibility")
        print("  4. Fixed mic button visibility with explicit sizing")
        print("  5. Fixed padding with explicit values")
        print("  6. Fixed ad panel positioning and coloring")
        print("  7. WebView detection script in templates")
        print("  8. Proper viewport meta tag")
        print("\n🎨 Target: 1366x768 Kiosk Android Media Box")
        print("\n📋 Next Steps:")
        print("  1. Test in Chrome DevTools at 1366x768 with WebView simulation")
        print("  2. Build APK with median.co")
        print("  3. Deploy to actual media box")
        print("  4. Verify all elements render correctly")
    else:
        print("❌ SOME TESTS FAILED - Review issues above")
    print("=" * 70)

if __name__ == "__main__":
    main()

"""
Test script to validate media box optimizations for Galaxy M33 5G
Checks CSS files for proper responsive breakpoints
"""

import os
import re

def test_responsive_css():
    """Test responsive-dynamic.css for media box optimization"""
    css_file = "static/css/responsive-dynamic.css"
    
    if not os.path.exists(css_file):
        print(f"❌ {css_file} not found")
        return False
    
    with open(css_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'Media box query exists': '@media (min-width: 1366px) and (max-height: 768px)' in content,
        'Logo size reduced': '--logo-size: clamp(1.5rem, 2vw, 2rem)' in content,
        'Base font reduced': '--base-font-size: clamp(8px, 0.7vw, 12px)' in content,
        'Mic size reduced': '--mic-size: clamp(3rem, 5vw, 4.5rem)' in content,
        'Typography scales down': '--text-xs: clamp(0.5rem, 0.6vw, 0.625rem)' in content,
    }
    
    print("\n🧪 Testing responsive-dynamic.css:")
    all_passed = True
    for check, result in checks.items():
        status = "✅" if result else "❌"
        print(f"  {status} {check}")
        if not result:
            all_passed = False
    
    return all_passed

def test_advertisement_css():
    """Test advertisment.css for media box optimization"""
    css_file = "static/css/advertisment.css"
    
    if not os.path.exists(css_file):
        print(f"❌ {css_file} not found")
        return False
    
    with open(css_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'Media box query exists': '@media (min-width: 1366px) and (max-height: 768px)' in content,
        'Left margin reduced': 'margin-left: 60px !important' in content,
        'Right margin reduced': 'margin-right: 120px !important' in content,
        'Left ad width reduced': '#left-ad {\n        width: 60px !important;' in content or 'width: 60px' in content,
        'Right ad width reduced': '#right-ad {\n        width: 120px !important;' in content or 'width: 120px' in content,
    }
    
    print("\n🧪 Testing advertisment.css:")
    all_passed = True
    for check, result in checks.items():
        status = "✅" if result else "❌"
        print(f"  {status} {check}")
        if not result:
            all_passed = False
    
    return all_passed

def test_templates():
    """Test that all templates import responsive-dynamic.css"""
    templates = [
        'templates/index.html',
        'templates/index_modular.html',
        'templates/device_login.html',
        'templates/device_register.html',
        'templates/device_settings.html',
        'templates/modular_demo.html'
    ]
    
    print("\n🧪 Testing template imports:")
    all_passed = True
    for template in templates:
        if os.path.exists(template):
            with open(template, 'r', encoding='utf-8') as f:
                content = f.read()
            
            has_import = 'responsive-dynamic.css' in content
            status = "✅" if has_import else "❌"
            print(f"  {status} {template}")
            if not has_import:
                all_passed = False
        else:
            print(f"  ⚠️  {template} not found")
    
    return all_passed

def main():
    print("=" * 60)
    print("🎯 MEDIA BOX OPTIMIZATION VALIDATION")
    print("=" * 60)
    
    result1 = test_responsive_css()
    result2 = test_advertisement_css()
    result3 = test_templates()
    
    print("\n" + "=" * 60)
    if result1 and result2 and result3:
        print("✅ ALL TESTS PASSED - Media box optimization complete!")
        print("\n📱 Changes implemented:")
        print("  • Logo size: 2.5rem → 1.5-2rem (40% reduction)")
        print("  • Base font: 1.2vw → 0.7vw (42% reduction)")
        print("  • Mic button: 10vw → 5vw (50% reduction)")
        print("  • Left margin: 100px → 60px (40% reduction)")
        print("  • Right margin: 200px → 120px (40% reduction)")
        print("\n🎨 Target display: 1366x768 Kiosk Media Box")
    else:
        print("❌ SOME TESTS FAILED - Please review the issues above")
    print("=" * 60)

if __name__ == "__main__":
    main()

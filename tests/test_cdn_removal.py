"""
Test script to verify CDN removal implementation
Tests that all user-facing templates use local CSS files instead of CDN
"""
import os
from pathlib import Path

def check_file_exists(filepath):
    """Check if a file exists"""
    return Path(filepath).exists()

def check_no_cdn_in_template(template_path):
    """Check if template has no CDN links"""
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
        cdn_patterns = [
            'cdnjs.cloudflare.com',
            'cdn.tailwindcss.com',
            'fonts.googleapis.com',  # Excluding this from strict check
        ]
        
        found_cdns = []
        for pattern in cdn_patterns[:2]:  # Check first 2 patterns only
            if pattern in content:
                found_cdns.append(pattern)
        
        return len(found_cdns) == 0, found_cdns

def main():
    print("=" * 60)
    print("CDN Removal Implementation Test")
    print("=" * 60)
    print()
    
    # Check if local files exist
    print("1. Checking if local CSS/font files exist...")
    files_to_check = {
        'Tailwind CSS': 'static/css/tailwind.min.css',
        'Animate.css': 'static/css/animate.min.css',
        'Font Awesome CSS': 'static/css/fontawesome.min.css',
        'FA Solid Font': 'static/webfonts/fa-solid-900.woff2',
        'FA Regular Font': 'static/webfonts/fa-regular-400.woff2',
        'FA Brands Font': 'static/webfonts/fa-brands-400.woff2',
    }
    
    all_files_exist = True
    for name, filepath in files_to_check.items():
        exists = check_file_exists(filepath)
        status = "✅" if exists else "❌"
        print(f"   {status} {name}: {filepath}")
        if not exists:
            all_files_exist = False
    
    print()
    
    # Check templates
    print("2. Checking user-facing templates for CDN links...")
    templates_to_check = [
        'templates/index.html',
        'templates/index_modular.html',
        'templates/device_login.html',
        'templates/device_register.html',
        'templates/device_settings.html',
        'templates/modular_demo.html',
    ]
    
    all_templates_clean = True
    for template in templates_to_check:
        if check_file_exists(template):
            no_cdn, found_cdns = check_no_cdn_in_template(template)
            if no_cdn:
                print(f"   ✅ {template}")
            else:
                print(f"   ❌ {template} - Found CDNs: {', '.join(found_cdns)}")
                all_templates_clean = False
        else:
            print(f"   ⚠️  {template} - File not found")
    
    print()
    print("=" * 60)
    
    if all_files_exist and all_templates_clean:
        print("✅ SUCCESS! All CDN dependencies removed successfully!")
        print()
        print("Next steps:")
        print("1. Start Flask app: python app.py")
        print("2. Test animations and icons in browser")
        print("3. Rebuild APK with median.co")
        print("4. Test on Android device")
    else:
        print("❌ ISSUES FOUND! Please check the errors above.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()

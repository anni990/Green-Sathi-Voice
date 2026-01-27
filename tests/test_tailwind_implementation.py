"""
Quick Test Script - Verify Tailwind CSS Loading
This script starts the Flask app and checks if the CSS is being served correctly.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app

print("=" * 60)
print("TAILWIND CSS IMPLEMENTATION TEST")
print("=" * 60)

# Check if tailwind.min.css exists
css_path = os.path.join('static', 'css', 'tailwind.min.css')
if os.path.exists(css_path):
    size_kb = os.path.getsize(css_path) / 1024
    print(f"✅ Tailwind CSS file found: {css_path}")
    print(f"   File size: {size_kb:.2f} KB")
else:
    print(f"❌ Tailwind CSS file NOT found: {css_path}")
    sys.exit(1)

# Check if templates are updated
templates_to_check = [
    'templates/index.html',
    'templates/index_modular.html',
    'templates/device_login.html',
    'templates/device_register.html',
    'templates/device_settings.html'
]

print("\n" + "=" * 60)
print("CHECKING TEMPLATE FILES")
print("=" * 60)

for template in templates_to_check:
    if os.path.exists(template):
        with open(template, 'r', encoding='utf-8') as f:
            content = f.read()
            if "url_for('static', filename='css/tailwind.min.css')" in content:
                print(f"✅ {template} - Using local Tailwind CSS")
            elif "cdn.tailwindcss.com" in content:
                print(f"⚠️  {template} - Still using CDN")
            else:
                print(f"❓ {template} - No Tailwind CSS found")
    else:
        print(f"❌ {template} - File not found")

print("\n" + "=" * 60)
print("FLASK APP TEST")
print("=" * 60)
print("\nStarting Flask development server...")
print("Visit: http://127.0.0.1:5000")
print("\nPress Ctrl+C to stop the server\n")
print("=" * 60)

# Start Flask app
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

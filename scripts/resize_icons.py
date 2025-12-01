#!/usr/bin/env python3
"""
Generate all icon sizes from the source icon.png
"""

from PIL import Image
import os

def generate_all_icons():
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_path = os.path.join(base_path, 'assets', 'icon.png')
    
    print("🎨 DOTO Icon Generator")
    print("=" * 40)
    print(f"Source: {source_path}")
    
    # Load source icon
    source = Image.open(source_path)
    print(f"Source size: {source.size}")
    
    # Convert to RGBA if needed
    if source.mode != 'RGBA':
        source = source.convert('RGBA')
    
    # Mobile app icons
    assets_path = os.path.join(base_path, 'assets')
    
    print("\n📱 Generating Mobile App Icons...")
    
    # Adaptive icon (same as main)
    source.save(os.path.join(assets_path, 'adaptive-icon.png'), 'PNG')
    print("  ✅ assets/adaptive-icon.png")
    
    # Favicon (48x48)
    favicon = source.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save(os.path.join(assets_path, 'favicon.png'), 'PNG')
    print("  ✅ assets/favicon.png (48x48)")
    
    # Splash screen (centered icon on red background)
    splash_width, splash_height = 1284, 2778
    splash = Image.new('RGBA', (splash_width, splash_height), (220, 38, 38, 255))
    
    # Resize icon for splash (make it prominent)
    splash_icon_size = 800
    splash_icon = source.resize((splash_icon_size, splash_icon_size), Image.Resampling.LANCZOS)
    
    # Center the icon
    paste_x = (splash_width - splash_icon_size) // 2
    paste_y = (splash_height - splash_icon_size) // 2 - 200  # Slightly above center
    
    splash.paste(splash_icon, (paste_x, paste_y), splash_icon)
    splash.save(os.path.join(assets_path, 'splash.png'), 'PNG')
    print("  ✅ assets/splash.png (1284x2778)")
    
    # Web app icons
    web_icons_path = os.path.join(base_path, 'webapp', 'public', 'icons')
    os.makedirs(web_icons_path, exist_ok=True)
    
    print("\n🌐 Generating Web App Icons...")
    
    web_sizes = [
        ('favicon-16x16.png', 16),
        ('favicon-32x32.png', 32),
        ('icon-72.png', 72),
        ('icon-96.png', 96),
        ('icon-128.png', 128),
        ('icon-144.png', 144),
        ('icon-152.png', 152),
        ('apple-touch-icon.png', 180),
        ('icon-192.png', 192),
        ('icon-384.png', 384),
        ('icon-512.png', 512),
    ]
    
    for filename, size in web_sizes:
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(web_icons_path, filename), 'PNG')
        print(f"  ✅ webapp/public/icons/{filename} ({size}x{size})")
    
    print("\n" + "=" * 40)
    print("🎉 All icons generated successfully!")
    print(f"\nTotal: 14 icons generated from source")


if __name__ == '__main__':
    generate_all_icons()


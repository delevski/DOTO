#!/usr/bin/env python3
"""
DOTO App Icon Generator
Creates the official DOTO app icon with angel wing design elements
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import os

def create_doto_icon(size=1024):
    """Create the DOTO app icon"""
    
    # Colors
    red_primary = (220, 38, 38)      # #DC2626
    red_dark = (185, 28, 28)         # #B91C1C
    red_light = (239, 68, 68)        # #EF4444
    white = (255, 255, 255)
    gray_light = (243, 244, 246)
    blue_accent = (59, 130, 246)     # For shadow/base
    
    # Create image with red background
    img = Image.new('RGBA', (size, size), red_primary)
    draw = ImageDraw.Draw(img)
    
    # Calculate dimensions
    padding = size * 0.1
    icon_size = size - (padding * 2)
    center = size // 2
    
    # Draw blue shadow/base ellipse
    shadow_width = icon_size * 0.9
    shadow_height = icon_size * 0.25
    shadow_y = center + icon_size * 0.35
    shadow_box = [
        center - shadow_width/2,
        shadow_y - shadow_height/2,
        center + shadow_width/2,
        shadow_y + shadow_height/2
    ]
    draw.ellipse(shadow_box, fill=(37, 99, 235))  # Blue-600
    
    # Draw wing shapes (left)
    wing_color = (248, 250, 252)  # Slightly off-white
    wing_width = icon_size * 0.35
    wing_height = icon_size * 0.3
    
    # Left wing
    left_wing_center = center - icon_size * 0.35
    wing_y = center - icon_size * 0.05
    for i in range(8):
        feather_angle = math.pi + (i * 0.15) - 0.5
        feather_len = wing_width * (0.7 + (i * 0.04))
        feather_width = wing_height * 0.12
        
        x1 = left_wing_center
        y1 = wing_y
        x2 = x1 + math.cos(feather_angle) * feather_len
        y2 = y1 + math.sin(feather_angle) * feather_len * 0.6
        
        # Draw feather as ellipse
        feather_box = [
            min(x1, x2) - feather_width,
            min(y1, y2) - feather_width/2,
            max(x1, x2) + feather_width,
            max(y1, y2) + feather_width/2
        ]
        draw.ellipse(feather_box, fill=wing_color)
    
    # Right wing (mirrored)
    right_wing_center = center + icon_size * 0.35
    for i in range(8):
        feather_angle = -(i * 0.15) + 0.5
        feather_len = wing_width * (0.7 + (i * 0.04))
        feather_width = wing_height * 0.12
        
        x1 = right_wing_center
        y1 = wing_y
        x2 = x1 + math.cos(feather_angle) * feather_len
        y2 = y1 + math.sin(feather_angle) * feather_len * 0.6
        
        feather_box = [
            min(x1, x2) - feather_width,
            min(y1, y2) - feather_width/2,
            max(x1, x2) + feather_width,
            max(y1, y2) + feather_width/2
        ]
        draw.ellipse(feather_box, fill=wing_color)
    
    # Draw main white rounded square
    square_size = icon_size * 0.55
    corner_radius = square_size * 0.22
    square_box = [
        center - square_size/2,
        center - square_size/2 + icon_size * 0.02,
        center + square_size/2,
        center + square_size/2 + icon_size * 0.02
    ]
    draw.rounded_rectangle(square_box, radius=corner_radius, fill=white)
    
    # Draw inner circle (subtle)
    circle_radius = square_size * 0.35
    circle_y = center + icon_size * 0.02
    circle_box = [
        center - circle_radius,
        circle_y - circle_radius,
        center + circle_radius,
        circle_y + circle_radius
    ]
    draw.ellipse(circle_box, fill=None, outline=gray_light, width=int(size * 0.015))
    
    # Draw checkmark
    check_size = square_size * 0.35
    check_x = center
    check_y = circle_y
    check_width = int(size * 0.06)
    
    # Checkmark points
    p1 = (check_x - check_size * 0.35, check_y + check_size * 0.05)
    p2 = (check_x - check_size * 0.05, check_y + check_size * 0.35)
    p3 = (check_x + check_size * 0.45, check_y - check_size * 0.35)
    
    # Draw checkmark with rounded ends
    draw.line([p1, p2], fill=red_primary, width=check_width)
    draw.line([p2, p3], fill=red_primary, width=check_width)
    
    # Round the ends
    for point in [p1, p2, p3]:
        draw.ellipse([
            point[0] - check_width/2,
            point[1] - check_width/2,
            point[0] + check_width/2,
            point[1] + check_width/2
        ], fill=red_primary)
    
    # Draw halo
    halo_y = center - icon_size * 0.38
    halo_width = square_size * 0.5
    halo_height = square_size * 0.12
    halo_thickness = int(size * 0.02)
    
    # Halo glow effect (lighter ellipse behind)
    glow_box = [
        center - halo_width/2 - halo_thickness,
        halo_y - halo_height/2 - halo_thickness,
        center + halo_width/2 + halo_thickness,
        halo_y + halo_height/2 + halo_thickness
    ]
    draw.ellipse(glow_box, fill=(186, 230, 253, 100))  # Light blue glow
    
    # Main halo ring
    halo_outer = [
        center - halo_width/2,
        halo_y - halo_height/2,
        center + halo_width/2,
        halo_y + halo_height/2
    ]
    halo_inner = [
        center - halo_width/2 + halo_thickness,
        halo_y - halo_height/2 + halo_thickness/2,
        center + halo_width/2 - halo_thickness,
        halo_y + halo_height/2 - halo_thickness/2
    ]
    
    # Draw halo as ring
    draw.ellipse(halo_outer, fill=(186, 230, 253))  # Light blue
    draw.ellipse(halo_inner, fill=red_primary)  # Cut out center
    
    return img


def create_all_icons():
    """Generate all icon sizes for mobile and web"""
    
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    print("🎨 DOTO Icon Generator")
    print("=" * 40)
    
    # Create base icon
    print("\n📱 Creating base icon (1024x1024)...")
    icon = create_doto_icon(1024)
    
    # Mobile app icons
    assets_path = os.path.join(base_path, 'assets')
    os.makedirs(assets_path, exist_ok=True)
    
    print("\n📱 Generating Mobile App Icons...")
    
    # Main icon
    icon.save(os.path.join(assets_path, 'icon.png'), 'PNG')
    print("  ✅ assets/icon.png (1024x1024)")
    
    # Adaptive icon (same as main for foreground)
    icon.save(os.path.join(assets_path, 'adaptive-icon.png'), 'PNG')
    print("  ✅ assets/adaptive-icon.png (1024x1024)")
    
    # Favicon
    favicon = icon.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save(os.path.join(assets_path, 'favicon.png'), 'PNG')
    print("  ✅ assets/favicon.png (48x48)")
    
    # Splash screen (centered icon on red background)
    splash = Image.new('RGBA', (1284, 2778), (220, 38, 38))
    splash_icon = icon.resize((600, 600), Image.Resampling.LANCZOS)
    paste_x = (1284 - 600) // 2
    paste_y = (2778 - 600) // 2 - 200
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
        resized = icon.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(web_icons_path, filename), 'PNG')
        print(f"  ✅ webapp/public/icons/{filename} ({size}x{size})")
    
    print("\n" + "=" * 40)
    print("🎉 All icons generated successfully!")
    print("\nIcon Summary:")
    print("  📱 Mobile: 4 icons in assets/")
    print("  🌐 Web: 11 icons in webapp/public/icons/")


if __name__ == '__main__':
    create_all_icons()


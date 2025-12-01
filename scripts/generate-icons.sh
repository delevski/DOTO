#!/bin/bash
# DOTO Icon Generator Script
# Generates all required icon sizes from the source icon

# Check if source icon exists
SOURCE_ICON="$1"
if [ -z "$SOURCE_ICON" ]; then
    SOURCE_ICON="./doto-icon-source.png"
fi

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    echo "Usage: ./generate-icons.sh <path-to-source-icon.png>"
    echo "The source icon should be at least 1024x1024 pixels"
    exit 1
fi

echo "🎨 DOTO Icon Generator"
echo "======================"
echo "Source: $SOURCE_ICON"

# Check if ImageMagick or sips is available
if command -v convert &> /dev/null; then
    RESIZE_CMD="magick"
elif command -v sips &> /dev/null; then
    RESIZE_CMD="sips"
else
    echo "❌ Neither ImageMagick nor sips found. Please install ImageMagick:"
    echo "   brew install imagemagick"
    exit 1
fi

# Create directories
mkdir -p assets
mkdir -p webapp/public/icons

echo ""
echo "📱 Generating Mobile App Icons..."

if [ "$RESIZE_CMD" = "sips" ]; then
    # Using macOS sips
    sips -z 1024 1024 "$SOURCE_ICON" --out assets/icon.png
    sips -z 1024 1024 "$SOURCE_ICON" --out assets/adaptive-icon.png
    sips -z 48 48 "$SOURCE_ICON" --out assets/favicon.png
    sips -z 1284 2778 "$SOURCE_ICON" --out assets/splash.png 2>/dev/null || cp "$SOURCE_ICON" assets/splash.png
else
    # Using ImageMagick
    convert "$SOURCE_ICON" -resize 1024x1024 assets/icon.png
    convert "$SOURCE_ICON" -resize 1024x1024 assets/adaptive-icon.png
    convert "$SOURCE_ICON" -resize 48x48 assets/favicon.png
fi

echo "✅ Mobile icons generated in assets/"

echo ""
echo "🌐 Generating Web App Icons..."

if [ "$RESIZE_CMD" = "sips" ]; then
    sips -z 16 16 "$SOURCE_ICON" --out webapp/public/icons/favicon-16x16.png
    sips -z 32 32 "$SOURCE_ICON" --out webapp/public/icons/favicon-32x32.png
    sips -z 72 72 "$SOURCE_ICON" --out webapp/public/icons/icon-72.png
    sips -z 96 96 "$SOURCE_ICON" --out webapp/public/icons/icon-96.png
    sips -z 128 128 "$SOURCE_ICON" --out webapp/public/icons/icon-128.png
    sips -z 144 144 "$SOURCE_ICON" --out webapp/public/icons/icon-144.png
    sips -z 152 152 "$SOURCE_ICON" --out webapp/public/icons/icon-152.png
    sips -z 180 180 "$SOURCE_ICON" --out webapp/public/icons/apple-touch-icon.png
    sips -z 192 192 "$SOURCE_ICON" --out webapp/public/icons/icon-192.png
    sips -z 384 384 "$SOURCE_ICON" --out webapp/public/icons/icon-384.png
    sips -z 512 512 "$SOURCE_ICON" --out webapp/public/icons/icon-512.png
else
    convert "$SOURCE_ICON" -resize 16x16 webapp/public/icons/favicon-16x16.png
    convert "$SOURCE_ICON" -resize 32x32 webapp/public/icons/favicon-32x32.png
    convert "$SOURCE_ICON" -resize 72x72 webapp/public/icons/icon-72.png
    convert "$SOURCE_ICON" -resize 96x96 webapp/public/icons/icon-96.png
    convert "$SOURCE_ICON" -resize 128x128 webapp/public/icons/icon-128.png
    convert "$SOURCE_ICON" -resize 144x144 webapp/public/icons/icon-144.png
    convert "$SOURCE_ICON" -resize 152x152 webapp/public/icons/icon-152.png
    convert "$SOURCE_ICON" -resize 180x180 webapp/public/icons/apple-touch-icon.png
    convert "$SOURCE_ICON" -resize 192x192 webapp/public/icons/icon-192.png
    convert "$SOURCE_ICON" -resize 384x384 webapp/public/icons/icon-384.png
    convert "$SOURCE_ICON" -resize 512x512 webapp/public/icons/icon-512.png
fi

echo "✅ Web icons generated in webapp/public/icons/"

echo ""
echo "🎉 All icons generated successfully!"
echo ""
echo "Icon locations:"
echo "  Mobile App:"
echo "    - assets/icon.png (1024x1024)"
echo "    - assets/adaptive-icon.png (1024x1024)"  
echo "    - assets/favicon.png (48x48)"
echo "  Web App:"
echo "    - webapp/public/icons/ (various sizes)"
echo ""


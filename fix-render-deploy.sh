#!/bin/bash
# Script to verify Render deployment configuration

echo "Checking build output..."
if [ -d "webapp/dist" ]; then
    echo "✓ webapp/dist exists"
    ls -la webapp/dist/ | head -5
else
    echo "✗ webapp/dist does not exist"
    echo "Building..."
    cd webapp && npm install && npm run build
fi

echo ""
echo "Render Configuration:"
echo "- Build Command should be: cd webapp && npm install && npm run build"
echo "- Publish Path should be: webapp/dist"
echo ""
echo "Current render.yaml configuration:"
grep -A 2 "buildCommand\|staticPublishPath" render.yaml

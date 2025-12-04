#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Starting DOTO Mobile App on Pixel 9 Emulator"
echo "=========================================="
echo ""

ADB="${HOME}/Library/Android/sdk/platform-tools/adb"
EMULATOR="${HOME}/Library/Android/sdk/emulator/emulator"

# Check if emulator is already running
echo -e "${BLUE}Checking emulator status...${NC}"
if $ADB devices | grep -q "emulator.*device"; then
    DEVICE=$($ADB devices | grep "emulator.*device" | head -1 | awk '{print $1}')
    echo -e "${GREEN}✅ Emulator already running: $DEVICE${NC}"
else
    echo -e "${YELLOW}Starting Pixel 9 emulator...${NC}"
    $EMULATOR -avd Pixel_9 -netdelay none -netspeed full > /tmp/emulator.log 2>&1 &
    EMULATOR_PID=$!
    
    echo "Waiting for emulator to boot..."
    for i in {1..60}; do
        if $ADB devices | grep -q "emulator.*device"; then
            DEVICE=$($ADB devices | grep "emulator.*device" | head -1 | awk '{print $1}')
            echo -e "${GREEN}✅ Emulator ready: $DEVICE${NC}"
            break
        fi
        sleep 2
        echo -n "."
    done
    echo ""
    
    if [ $i -eq 60 ]; then
        echo -e "${YELLOW}⚠️  Emulator is taking longer than expected. It may still be booting.${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Starting Expo with Android...${NC}"
cd "$(dirname "$0")"

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null
sleep 2

# Start Expo with Android (Expo automatically reads .env.local)
expo start --android


#!/bin/bash

# Pair Physical Galaxy S24 Device
# Supports both USB and Wireless ADB pairing

echo "=========================================="
echo "  Pair Galaxy S24 Device"
echo "=========================================="
echo ""

# Check if ADB is installed
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found!"
    echo "Please install Android SDK Platform Tools:"
    echo "  brew install android-platform-tools"
    exit 1
fi

echo "✅ ADB found: $(which adb)"
echo ""

# Function to check for connected devices
check_devices() {
    echo "🔍 Checking for connected devices..."
    DEVICES=$(adb devices | grep -v "List" | grep -E "(device|unauthorized|offline)" | wc -l | tr -d ' ')
    UNAUTHORIZED=$(adb devices | grep "unauthorized" | wc -l | tr -d ' ')
    
    if [ "$UNAUTHORIZED" -gt 0 ]; then
        echo "⚠️  Device detected but not authorized!"
        echo ""
        echo "Please check your Galaxy S24 screen and:"
        echo "  1. Tap 'Allow USB debugging'"
        echo "  2. Check 'Always allow from this computer' (optional)"
        echo "  3. Tap 'OK'"
        echo ""
        return 1
    fi
    
    if [ "$DEVICES" -eq 0 ]; then
        return 1
    fi
    
    return 0
}

# Function for USB pairing
usb_pairing() {
    echo "📱 USB Pairing Mode"
    echo "==================="
    echo ""
    echo "On your Galaxy S24:"
    echo "  1. Connect phone to computer via USB cable"
    echo "  2. Enable Developer Options:"
    echo "     Settings → About Phone → Tap 'Build Number' 7 times"
    echo "  3. Enable USB Debugging:"
    echo "     Settings → Developer Options → USB Debugging (ON)"
    echo "  4. When prompted, allow USB debugging on your phone"
    echo ""
    read -p "Press Enter when ready..."
    
    echo ""
    echo "Checking connection..."
    sleep 2
    
    if check_devices; then
        echo "✅ Device connected via USB!"
        adb devices
        return 0
    else
        echo "❌ Device not detected"
        echo ""
        echo "Troubleshooting:"
        echo "  - Try a different USB cable"
        echo "  - Try a different USB port"
        echo "  - Make sure USB debugging is enabled"
        echo "  - Check phone screen for authorization prompt"
        return 1
    fi
}

# Function for wireless pairing
wireless_pairing() {
    echo "📡 Wireless Pairing Mode"
    echo "========================"
    echo ""
    echo "On your Galaxy S24:"
    echo "  1. Enable Developer Options (if not already):"
    echo "     Settings → About Phone → Tap 'Build Number' 7 times"
    echo "  2. Enable Wireless Debugging:"
    echo "     Settings → Developer Options → Wireless Debugging (ON)"
    echo "  3. Tap 'Wireless Debugging' to open settings"
    echo "  4. Note the 'Pair device with pairing code' section"
    echo ""
    
    read -p "Enter the IP address shown (e.g., 192.168.1.100): " IP
    read -p "Enter the Pairing Port (e.g., 35044): " PAIRING_PORT
    
    if [ -z "$IP" ] || [ -z "$PAIRING_PORT" ]; then
        echo "❌ IP address and port are required!"
        return 1
    fi
    
    echo ""
    echo "📱 Pairing to $IP:$PAIRING_PORT..."
    echo ""
    echo "You'll need to enter a pairing code from your phone."
    echo "On your Galaxy S24, tap 'Pair device with pairing code'"
    echo "and enter the 6-digit code when prompted."
    echo ""
    
    read -p "Enter the 6-digit pairing code from your phone: " PAIRING_CODE
    
    if [ -z "$PAIRING_CODE" ] || [ ${#PAIRING_CODE} -ne 6 ]; then
        echo "❌ Invalid pairing code! Must be 6 digits."
        return 1
    fi
    
    # Pair using adb pair command
    echo ""
    echo "Pairing device..."
    adb pair $IP:$PAIRING_PORT $PAIRING_CODE
    
    if [ $? -ne 0 ]; then
        echo "❌ Pairing failed!"
        echo "Make sure:"
        echo "  - Phone and computer are on the same WiFi network"
        echo "  - Pairing code is correct"
        echo "  - Wireless debugging is enabled"
        return 1
    fi
    
    echo ""
    echo "✅ Pairing successful!"
    echo ""
    echo "Now connecting..."
    
    # Get connection port (different from pairing port)
    echo ""
    echo "On your Galaxy S24, check 'Wireless Debugging' again."
    echo "Look for 'IP address & port' (NOT the pairing port)."
    echo ""
    read -p "Enter the Connection Port (e.g., 35045): " CONNECTION_PORT
    
    if [ -z "$CONNECTION_PORT" ]; then
        echo "❌ Connection port is required!"
        return 1
    fi
    
    adb connect $IP:$CONNECTION_PORT
    
    sleep 2
    
    if check_devices; then
        echo "✅ Device connected wirelessly!"
        adb devices
        return 0
    else
        echo "❌ Connection failed!"
        return 1
    fi
}

# Main menu
echo "Select pairing method:"
echo "  1) USB (Recommended for first-time setup)"
echo "  2) Wireless (Requires initial USB pairing or WiFi ADB)"
echo ""
read -p "Enter choice (1 or 2): " CHOICE

case $CHOICE in
    1)
        usb_pairing
        ;;
    2)
        wireless_pairing
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ Device Successfully Paired!"
    echo "=========================================="
    echo ""
    echo "Device info:"
    adb devices -l
    echo ""
    echo "You can now:"
    echo "  - Run: npm run android"
    echo "  - Install APK: ./install-apk.sh"
    echo "  - View logs: adb logcat"
else
    echo ""
    echo "❌ Pairing failed. Please try again."
    exit 1
fi




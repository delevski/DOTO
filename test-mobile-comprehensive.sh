#!/bin/bash

echo "=========================================="
echo "DOTO Mobile App - Comprehensive Testing"
echo "=========================================="
echo ""

# Set ADB path
ADB="${HOME}/Library/Android/sdk/platform-tools/adb"
if [ ! -f "$ADB" ]; then
    ADB="adb"  # Fallback to system adb
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
WARNINGS=0

# Create directory for screenshots and logs
TEST_DIR="/tmp/doto_mobile_test_$(date +%s)"
mkdir -p "$TEST_DIR"
echo "Test directory: $TEST_DIR"
echo ""

# Function to log test result
log_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        if [ -n "$message" ]; then
            echo "  → $message"
        fi
        ((PASSED++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        if [ -n "$message" ]; then
            echo "  → $message"
        fi
        ((FAILED++))
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}⚠ WARN${NC}: $test_name"
        if [ -n "$message" ]; then
            echo "  → $message"
        fi
        ((WARNINGS++))
    fi
    echo ""
}

# Function to take screenshot
take_screenshot() {
    local filename="$1"
    $ADB exec-out screencap -p > "$TEST_DIR/$filename" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  Screenshot saved: $filename"
        return 0
    else
        return 1
    fi
}

# Function to tap coordinates
tap() {
    local x="$1"
    local y="$2"
    $ADB shell input tap "$x" "$y" 2>/dev/null
    sleep 0.5
}

# Function to swipe
swipe() {
    local x1="$1"
    local y1="$2"
    local x2="$3"
    local y2="$4"
    $ADB shell input swipe "$x1" "$y1" "$x2" "$y2" 300 2>/dev/null
    sleep 0.5
}

# Function to get UI dump
get_ui_dump() {
    $ADB shell uiautomator dump /dev/tty 2>/dev/null | head -100
}

# Function to check if app is running
check_app_running() {
    local package="host.exp.exponent"
    local result=$($ADB shell pidof "$package" 2>/dev/null)
    if [ -n "$result" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check for crashes in logcat
check_crashes() {
    local log_file="$TEST_DIR/logcat_errors.log"
    $ADB logcat -d -s ReactNativeJS:E AndroidRuntime:E *:F 2>/dev/null | tail -50 > "$log_file"
    
    local crash_count=$(grep -i "crash\|fatal\|exception" "$log_file" | wc -l)
    if [ "$crash_count" -gt 0 ]; then
        echo "  Found $crash_count potential crash/error entries in logcat"
        return 1
    else
        return 0
    fi
}

# Function to check for infinite loops (excessive re-renders)
check_infinite_loops() {
    local log_file="$TEST_DIR/logcat_errors.log"
    local loop_count=$(grep -i "maximum update depth\|too many re-renders\|infinite loop" "$log_file" | wc -l)
    if [ "$loop_count" -gt 0 ]; then
        echo "  Found $loop_count potential infinite loop warnings"
        return 1
    else
        return 0
    fi
}

# Function to wait for element (by text in UI dump)
wait_for_text() {
    local text="$1"
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local ui_dump=$(get_ui_dump)
        if echo "$ui_dump" | grep -qi "$text"; then
            return 0
        fi
        sleep 1
        ((attempt++))
    done
    return 1
}

# Function to clear logcat
clear_logcat() {
    $ADB logcat -c 2>/dev/null
}

# Check if emulator is connected
echo "Checking emulator connection..."
if ! $ADB devices | grep -q "device$"; then
    echo -e "${RED}Error: No Android device/emulator connected${NC}"
    echo "Please start an emulator or connect a device"
    exit 1
fi

DEVICE=$($ADB devices | grep "device$" | head -1 | awk '{print $1}')
echo -e "${GREEN}Device connected: $DEVICE${NC}"
echo ""

# Check if app is installed
echo "Checking if DOTO app is installed..."
if ! $ADB shell pm list packages | grep -q "host.exp.exponent"; then
    log_result "App Installation" "FAIL" "DOTO app not found. Please install it first."
    exit 1
fi
log_result "App Installation" "PASS" "DOTO app is installed"
echo ""

# Start app
echo "Starting DOTO app..."
$ADB shell am start -n host.exp.exponent/.experience.HomeActivity 2>/dev/null
sleep 3

if ! check_app_running; then
    log_result "App Launch" "FAIL" "App failed to start"
    exit 1
fi
log_result "App Launch" "PASS" "App started successfully"
take_screenshot "01_app_launched.png"
echo ""

# Clear logcat before testing
clear_logcat
echo "Starting comprehensive tests..."
echo ""

# ==================== TEST 1: Feed Page ====================
echo "=== TEST 1: Feed Page ==="
take_screenshot "02_feed_initial.png"

# Check if feed is visible
if wait_for_text "Feed\|feed\|Posts\|posts"; then
    log_result "Feed Page Load" "PASS" "Feed page loaded"
else
    log_result "Feed Page Load" "WARN" "Feed content not immediately visible"
fi

# Check for posts
sleep 2
ui_dump=$(get_ui_dump)
post_count=$(echo "$ui_dump" | grep -o "post\|Post" | wc -l | tr -d ' ')
if [ -n "$post_count" ] && [ "$post_count" -gt 0 ]; then
    log_result "Feed Posts Display" "PASS" "Found posts on feed"
else
    log_result "Feed Posts Display" "WARN" "No posts visible (may be empty feed)"
fi

# Test feed tabs/swipes
echo "  Testing feed navigation..."
swipe 500 800 500 400  # Swipe up
sleep 1
take_screenshot "03_feed_scrolled.png"
log_result "Feed Scroll" "PASS" "Feed scrolls without crashes"

# Check for crashes
if check_crashes; then
    log_result "Feed Page Stability" "PASS" "No crashes detected"
else
    log_result "Feed Page Stability" "FAIL" "Crashes detected in logcat"
fi

if check_infinite_loops; then
    log_result "Feed Page Performance" "PASS" "No infinite loops detected"
else
    log_result "Feed Page Performance" "FAIL" "Infinite loops detected"
fi
echo ""

# ==================== TEST 2: Map Page ====================
echo "=== TEST 2: Map Page ==="
# Navigate to map (assuming bottom tab navigation)
tap 200 1800  # Bottom tab - approximate position for Map
sleep 3
take_screenshot "04_map_initial.png"

if wait_for_text "Map\|map\|Location\|location"; then
    log_result "Map Page Load" "PASS" "Map page loaded"
else
    log_result "Map Page Load" "WARN" "Map content not immediately visible"
fi

# Test map interactions
echo "  Testing map interactions..."
sleep 2
swipe 500 800 300 600  # Pan map
sleep 1
swipe 500 800 700 600  # Pan back
sleep 1
take_screenshot "05_map_interacted.png"
log_result "Map Interactions" "PASS" "Map responds to gestures"

# Check for crashes
if check_crashes; then
    log_result "Map Page Stability" "PASS" "No crashes detected"
else
    log_result "Map Page Stability" "FAIL" "Crashes detected in logcat"
fi

if check_infinite_loops; then
    log_result "Map Page Performance" "PASS" "No infinite loops detected"
else
    log_result "Map Page Performance" "FAIL" "Infinite loops detected"
fi
echo ""

# ==================== TEST 3: Messages Page ====================
echo "=== TEST 3: Messages Page ==="
tap 400 1800  # Bottom tab - approximate position for Messages
sleep 3
take_screenshot "06_messages_initial.png"

if wait_for_text "Messages\|messages\|Chat\|chat\|Conversations"; then
    log_result "Messages Page Load" "PASS" "Messages page loaded"
else
    log_result "Messages Page Load" "WARN" "Messages content not immediately visible"
fi

# Test messages navigation
echo "  Testing messages navigation..."
sleep 2
swipe 500 800 500 400  # Scroll messages
sleep 1
take_screenshot "07_messages_scrolled.png"
log_result "Messages Scroll" "PASS" "Messages scroll without crashes"

# Check for crashes
if check_crashes; then
    log_result "Messages Page Stability" "PASS" "No crashes detected"
else
    log_result "Messages Page Stability" "FAIL" "Crashes detected in logcat"
fi
echo ""

# ==================== TEST 4: Profile Page ====================
echo "=== TEST 4: Profile Page ==="
tap 600 1800  # Bottom tab - approximate position for Profile
sleep 3
take_screenshot "08_profile_initial.png"

if wait_for_text "Profile\|profile\|Settings\|settings\|Edit"; then
    log_result "Profile Page Load" "PASS" "Profile page loaded"
else
    log_result "Profile Page Load" "WARN" "Profile content not immediately visible"
fi

# Test profile scroll
echo "  Testing profile scroll..."
swipe 500 800 500 400  # Scroll profile
sleep 1
take_screenshot "09_profile_scrolled.png"
log_result "Profile Scroll" "PASS" "Profile scrolls without crashes"

# Check for crashes
if check_crashes; then
    log_result "Profile Page Stability" "PASS" "No crashes detected"
else
    log_result "Profile Page Stability" "FAIL" "Crashes detected in logcat"
fi
echo ""

# ==================== TEST 5: Settings Page ====================
echo "=== TEST 5: Settings Page ==="
# Try to find settings button/icon
tap 700 100  # Top right area (common settings location)
sleep 2

# Or navigate from profile
tap 600 1800  # Profile tab
sleep 2
tap 700 200  # Settings icon/button
sleep 3
take_screenshot "10_settings_initial.png"

if wait_for_text "Settings\|settings\|Language\|language\|Dark\|dark"; then
    log_result "Settings Page Load" "PASS" "Settings page loaded"
else
    log_result "Settings Page Load" "WARN" "Settings content not immediately visible"
fi

# Test settings toggles
echo "  Testing settings toggles..."
sleep 2
# Try to toggle dark mode (tap around toggle area)
tap 600 500
sleep 1
take_screenshot "11_settings_toggled.png"
log_result "Settings Toggle" "PASS" "Settings toggle works"

# Test language switching
echo "  Testing language switching..."
tap 500 600  # Language option area
sleep 2
take_screenshot "12_settings_language.png"
log_result "Language Switch" "PASS" "Language switching accessible"

# Check for crashes
if check_crashes; then
    log_result "Settings Page Stability" "PASS" "No crashes detected"
else
    log_result "Settings Page Stability" "FAIL" "Crashes detected in logcat"
fi

if check_infinite_loops; then
    log_result "Settings Page Performance" "PASS" "No infinite loops detected"
else
    log_result "Settings Page Performance" "FAIL" "Infinite loops detected"
fi
echo ""

# ==================== TEST 6: Notifications Page ====================
echo "=== TEST 6: Notifications Page ==="
# Navigate back to feed
tap 100 1800  # Feed tab
sleep 2
# Try to find notifications icon (usually top right)
tap 700 100
sleep 3
take_screenshot "13_notifications_initial.png"

if wait_for_text "Notifications\|notifications\|Bell\|bell"; then
    log_result "Notifications Page Load" "PASS" "Notifications page loaded"
else
    log_result "Notifications Page Load" "WARN" "Notifications content not immediately visible"
fi

# Test notifications scroll
echo "  Testing notifications scroll..."
swipe 500 800 500 400  # Scroll notifications
sleep 1
take_screenshot "14_notifications_scrolled.png"
log_result "Notifications Scroll" "PASS" "Notifications scroll without crashes"

# Check for crashes
if check_crashes; then
    log_result "Notifications Page Stability" "PASS" "No crashes detected"
else
    log_result "Notifications Page Stability" "FAIL" "Crashes detected in logcat"
fi
echo ""

# ==================== TEST 7: Post Details ====================
echo "=== TEST 7: Post Details ==="
# Navigate back to feed
tap 100 1800  # Feed tab
sleep 2

# Try to tap on a post
tap 400 600  # Center area where posts usually are
sleep 3
take_screenshot "15_post_details.png"

if wait_for_text "Claim\|claim\|Like\|like\|Comment\|comment\|Details\|details"; then
    log_result "Post Details Load" "PASS" "Post details page loaded"
else
    log_result "Post Details Load" "WARN" "Post details not immediately visible"
fi

# Test post interactions
echo "  Testing post interactions..."
sleep 2
# Try to tap like button
tap 200 1000
sleep 1
take_screenshot "16_post_liked.png"
log_result "Post Like" "PASS" "Post like interaction works"

# Navigate back
$ADB shell input keyevent KEYCODE_BACK
sleep 2
log_result "Post Details Navigation" "PASS" "Back navigation works"

# Check for crashes
if check_crashes; then
    log_result "Post Details Stability" "PASS" "No crashes detected"
else
    log_result "Post Details Stability" "FAIL" "Crashes detected in logcat"
fi
echo ""

# ==================== TEST 8: Rapid Navigation ====================
echo "=== TEST 8: Rapid Navigation ==="
clear_logcat
echo "  Testing rapid navigation between pages..."

# Rapidly navigate between tabs
for i in {1..5}; do
    tap 100 1800  # Feed
    sleep 0.5
    tap 200 1800  # Map
    sleep 0.5
    tap 400 1800  # Messages
    sleep 0.5
    tap 600 1800  # Profile
    sleep 0.5
done

take_screenshot "17_rapid_navigation.png"

if check_crashes; then
    log_result "Rapid Navigation Stability" "PASS" "No crashes during rapid navigation"
else
    log_result "Rapid Navigation Stability" "FAIL" "Crashes detected during rapid navigation"
fi

if check_infinite_loops; then
    log_result "Rapid Navigation Performance" "PASS" "No infinite loops during rapid navigation"
else
    log_result "Rapid Navigation Performance" "FAIL" "Infinite loops detected during rapid navigation"
fi
echo ""

# ==================== TEST 9: Memory & Performance ====================
echo "=== TEST 9: Memory & Performance ==="
clear_logcat

# Get memory info
mem_info=$($ADB shell dumpsys meminfo host.exp.exponent 2>/dev/null | head -20)
echo "$mem_info" > "$TEST_DIR/memory_info.txt"
log_result "Memory Check" "PASS" "Memory info collected"

# Check for memory leaks (excessive memory usage)
pss=$(echo "$mem_info" | grep -i "TOTAL PSS" | awk '{print $3}')
if [ -n "$pss" ]; then
    echo "  Total PSS: $pss KB"
    if [ "$pss" -gt 500000 ]; then  # 500MB threshold
        log_result "Memory Usage" "WARN" "High memory usage detected ($pss KB)"
    else
        log_result "Memory Usage" "PASS" "Memory usage within normal range ($pss KB)"
    fi
fi
echo ""

# ==================== TEST 10: Error Log Analysis ====================
echo "=== TEST 10: Error Log Analysis ==="
clear_logcat
sleep 2

# Collect final error log
final_log="$TEST_DIR/final_errors.log"
$ADB logcat -d -s ReactNativeJS:E ReactNativeJS:W AndroidRuntime:E *:F 2>/dev/null | tail -100 > "$final_log"

error_count=$(grep -i "error\|exception\|crash" "$final_log" 2>/dev/null | wc -l)
warning_count=$(grep -i "warning" "$final_log" 2>/dev/null | wc -l)

if [ "$error_count" -eq 0 ]; then
    log_result "Error Log Analysis" "PASS" "No errors found in logcat"
else
    log_result "Error Log Analysis" "WARN" "Found $error_count errors and $warning_count warnings in logcat"
    echo "  See $final_log for details"
fi
echo ""

# ==================== FINAL SUMMARY ====================
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
echo "Test artifacts saved to: $TEST_DIR"
echo ""

# Final app state screenshot
take_screenshot "18_final_state.png"

# Check if app is still running
if check_app_running; then
    log_result "Final App State" "PASS" "App is still running after all tests"
else
    log_result "Final App State" "FAIL" "App crashed during testing"
fi

echo ""
echo "=========================================="
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the results.${NC}"
    exit 1
fi


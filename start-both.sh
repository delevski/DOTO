#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Starting DOTO Web & Mobile Apps"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEBAPP_DIR="$SCRIPT_DIR/webapp"
MOBILE_DIR="$SCRIPT_DIR"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $WEBAPP_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if ports are already in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Start Web App
echo -e "${YELLOW}Starting Web App...${NC}"
cd "$WEBAPP_DIR"

if check_port 5173; then
    echo "⚠️  Port 5173 is already in use. Web app may already be running."
else
    npm run dev > /tmp/doto-webapp.log 2>&1 &
    WEBAPP_PID=$!
    echo "Web app PID: $WEBAPP_PID"
fi

# Wait for web app to start
echo "Waiting for web app to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Web app is running on http://localhost:5173${NC}"
        break
    fi
    sleep 1
done

if [ $i -eq 30 ]; then
    echo "⚠️  Web app may still be starting. Check logs: tail -f /tmp/doto-webapp.log"
fi

echo ""

# Start Mobile App (Expo)
echo -e "${YELLOW}Starting Mobile App (Expo)...${NC}"
cd "$MOBILE_DIR"

# Check if Expo is already running
if check_port 8081 || check_port 19000 || check_port 19001; then
    echo "⚠️  Expo ports are already in use. Mobile app may already be running."
else
    npm start > /tmp/doto-mobile.log 2>&1 &
    MOBILE_PID=$!
    echo "Mobile app PID: $MOBILE_PID"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Both apps are starting!${NC}"
echo "=========================================="
echo ""
echo "📱 Web App:"
echo "   → http://localhost:5173"
echo "   → Logs: tail -f /tmp/doto-webapp.log"
echo ""
echo "📱 Mobile App (Expo):"
echo "   → Metro bundler: http://localhost:8081"
echo "   → Expo DevTools: http://localhost:19002"
echo "   → Logs: tail -f /tmp/doto-mobile.log"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait


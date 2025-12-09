# Push Notification Proxy Server

This proxy server solves CORS issues when sending push notifications from the web app to Expo's Push API.

## Quick Start

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the proxy server** (in a separate terminal):
   ```bash
   npm run proxy
   ```
   
   Or manually:
   ```bash
   node push-proxy-server.js
   ```

3. **Start the web app** (in another terminal):
   ```bash
   npm run dev
   ```

The proxy server runs on `http://localhost:3002` by default.

## Configuration

You can configure the proxy URL via environment variable:

```bash
# Set custom port
PORT=3002 node push-proxy-server.js

# Or disable proxy in web app (use direct API - will fail due to CORS)
VITE_USE_PUSH_PROXY=false npm run dev
```

## How It Works

1. Web app sends push notification request to proxy server (`http://localhost:3001/api/push/send`)
2. Proxy server forwards the request to Expo Push API (`https://exp.host/--/api/v2/push/send`)
3. Proxy server returns the response to the web app
4. No CORS issues because proxy server runs on the same origin or allows CORS

## Endpoints

- `GET /health` - Health check endpoint
- `POST /api/push/send` - Proxy endpoint for Expo Push API

## Production Deployment

For production, you'll need to:

1. Deploy the proxy server (e.g., to Heroku, Railway, or Vercel)
2. Set `VITE_PUSH_PROXY_URL` environment variable to your deployed proxy URL
3. Update the web app's environment configuration

Example for Vercel:
```javascript
// vercel.json or serverless function
{
  "functions": {
    "api/push/send.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

## Troubleshooting

- **Proxy server not starting**: Check if port 3002 is already in use
- **CORS errors persist**: Make sure proxy server is running and accessible
- **Push notifications not received**: Check browser console for detailed error logs


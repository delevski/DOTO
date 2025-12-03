# Render Deployment Fix Instructions

## Problem
The "DOTO" service has incorrect configuration:
- Build Command: `npm install` (missing build step)
- Publish Path: `DOTO/dist` (wrong directory)

## Solution

### Option 1: Fix the "DOTO" Service (Recommended)
1. Go to: https://dashboard.render.com/static/srv-d4ncepuuk2gs739o57jg/settings
2. Update these settings:
   - **Build Command**: `cd webapp && npm install && npm run build`
   - **Publish Directory**: `webapp/dist`
3. Click "Save Changes"
4. Trigger a manual deploy

### Option 2: Disable/Delete the "DOTO" Service
Since "doto-webapp" is already working correctly, you can:
1. Go to: https://dashboard.render.com/static/srv-d4ncepuuk2gs739o57jg/settings
2. Scroll to "Danger Zone"
3. Click "Delete Service" (if not needed)
   OR
4. Disable "Auto-Deploy" to prevent it from deploying

## Current Status
- ✅ **doto-webapp** (srv-d4nckuemcj7s73eseccg) - Working correctly
- ❌ **DOTO** (srv-d4ncepuuk2gs739o57jg) - Needs fix or deletion

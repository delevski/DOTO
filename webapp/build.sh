#!/bin/bash
set -e

# Ensure we're in the webapp directory
cd "$(dirname "$0")"

# Prevent npm from checking parent directories for workspaces
export NPM_CONFIG_WORKSPACES=false
export NPM_CONFIG_LEGACY_PEER_DEPS=true

# Install dependencies with legacy peer deps (ignores parent package.json conflicts)
npm install --legacy-peer-deps --no-workspaces

# Build the application
npm run build


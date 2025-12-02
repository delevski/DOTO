#!/bin/bash
# Fix macOS file limit issue
ulimit -n 10240
cd "$(dirname "$0")"
npx expo start --android


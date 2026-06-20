#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   TaskFlow Setup Script                  ║"
echo "║   This will install and start your app   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Step 1 - Install server dependencies
echo "📦 Step 1/4 - Installing server packages..."
npm install
echo "✅ Server packages installed."
echo ""

# Step 2 - Install client dependencies
echo "📦 Step 2/4 - Installing frontend packages..."
cd client && npm install
echo "✅ Frontend packages installed."
echo ""

# Step 3 - Build React app
echo "🔨 Step 3/4 - Building React frontend..."
npm run build
cd ..
echo "✅ Frontend built successfully."
echo ""

# Step 4 - Start the server
echo "🚀 Step 4/4 - Starting TaskFlow server..."
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   TaskFlow is LIVE!                      ║"
echo "║                                          ║"
echo "║   Open in browser:                       ║"
echo "║   http://localhost:3000                  ║"
echo "║                                          ║"
echo "║   Share with your team:                  ║"
echo "║   http://YOUR-SERVER-IP:3000             ║"
echo "║                                          ║"
echo "║   Press Ctrl+C to stop                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

node server.js

#!/bin/bash
# Simple shell script to test import using curl
cd /Users/macbook/projects/website_aksesoris

# First, start the backend in background temporarily
cd backend
npm start > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Go back to root
cd ..

# Test the direct extraction (already know it works)
echo "=== DIRECT EXTRACTION TEST ==="
node test-direct.js

echo ""
echo "=== DATABASE CHECK ==="
node simple-check-db.js

# Cleanup
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null

echo ""
echo "✅ All tests completed"

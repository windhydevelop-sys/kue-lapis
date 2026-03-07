#!/bin/bash
cd /Users/macbook/projects/website_aksesoris
node check-db.js &
PROC_ID=$!
sleep 6
kill $PROC_ID 2>/dev/null
wait $PROC_ID 2>/dev/null

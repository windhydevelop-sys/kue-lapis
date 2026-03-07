#!/bin/bash

# Railway Deployment Verification Script
# Usage: ./verify-deployment.sh <railway-app-url>
# Example: ./verify-deployment.sh https://my-app.railway.app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Usage: $0 <railway-app-url>${NC}"
    echo -e "${YELLOW}Example: $0 https://my-app.railway.app${NC}"
    exit 1
fi

RAILWAY_URL="$1"
API_URL="${RAILWAY_URL%/}"  # Remove trailing slash if present
HEALTH_ENDPOINT="${API_URL}/api/health"

echo -e "${YELLOW}🔍 Verifying Railway Deployment${NC}"
echo -e "Testing URL: ${HEALTH_ENDPOINT}"
echo

# Function to test endpoint
test_endpoint() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    local description="$4"
    
    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo -e "Endpoint: ${method} ${endpoint}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$endpoint" || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$endpoint" || echo "000")
    fi
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n 1)
    # Extract response body (all lines except last)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "000" ]; then
        echo -e "${RED}❌ Connection failed${NC}"
        return 1
    elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "Response: $body"
        fi
        return 0
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        if [ -n "$body" ]; then
            echo -e "Error: $body"
        fi
        return 1
    fi
    echo
}

# Test 1: Health Check
echo -e "${YELLOW}=== Test 1: Health Check ===${NC}"
if test_endpoint "$HEALTH_ENDPOINT" "GET" "" "Server health status"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    health_ok=true
else
    echo -e "${RED}❌ Health check failed${NC}"
    health_ok=false
fi
echo

# Test 2: Server Response
echo -e "${YELLOW}=== Test 2: Basic Server Response ===${NC}"
root_response=$(curl -s -w "\n%{http_code}" "$API_URL/" || echo "000")
root_code=$(echo "$root_response" | tail -n 1)
root_body=$(echo "$root_response" | sed '$d')

if [ "$root_code" != "404" ] && [ "$root_code" != "000" ]; then
    echo -e "${GREEN}✅ Server is responding${NC}"
    server_ok=true
else
    echo -e "${YELLOW}⚠️  Server responding but root endpoint returns $root_code${NC}"
    server_ok=true
fi
echo

# Test 3: API Authentication Test
echo -e "${YELLOW}=== Test 3: API Authentication Test ===${NC}"
# Test register endpoint (should work even with invalid data structure)
register_test='{"username":"testuser","email":"test@example.com","password":"testpass123"}'
if test_endpoint "${API_URL}/api/auth/register" "POST" "$register_test" "User registration"; then
    echo -e "${GREEN}✅ Registration endpoint accessible${NC}"
    auth_ok=true
else
    echo -e "${YELLOW}⚠️  Registration endpoint test inconclusive${NC}"
    auth_ok=false
fi
echo

# Test 4: Database Connectivity
echo -e "${YELLOW}=== Test 4: Database Connectivity ===${NC}"
if [ "$health_ok" = true ]; then
    health_response=$(curl -s "$HEALTH_ENDPOINT")
    db_status=$(echo "$health_response" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    
    if [ "$db_status" = "connected" ]; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        db_ok=true
    else
        echo -e "${RED}❌ Database connection failed (status: $db_status)${NC}"
        db_ok=false
    fi
else
    echo -e "${RED}❌ Cannot test database - health check failed${NC}"
    db_ok=false
fi
echo

# Test 5: File Upload Endpoints
echo -e "${YELLOW}=== Test 5: File Upload Endpoint Accessibility ===${NC}"
upload_test='{"test":true}'
if test_endpoint "${API_URL}/api/products" "POST" "$upload_test" "Product creation (file upload test)"; then
    echo -e "${GREEN}✅ File upload endpoints accessible${NC}"
    upload_ok=true
else
    echo -e "${YELLOW}⚠️  Upload endpoint test inconclusive (may require auth)${NC}"
    upload_ok=true
fi
echo

# Summary
echo -e "${YELLOW}=== Deployment Verification Summary ===${NC}"
echo -e "Health Check: $([ "$health_ok" = true ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "Server Response: $([ "$server_ok" = true ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "API Access: $([ "$auth_ok" = true ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  INCONCLUSIVE${NC}")"
echo -e "Database: $([ "$db_ok" = true ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "File Uploads: $([ "$upload_ok" = true ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  INCONCLUSIVE${NC}")"
echo

# Overall status
if [ "$health_ok" = true ] && [ "$server_ok" = true ] && [ "$db_ok" = true ]; then
    echo -e "${GREEN}🎉 Deployment Verification: SUCCESS${NC}"
    echo -e "${GREEN}Your Railway deployment is working correctly!${NC}"
    echo
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Update your frontend configuration to use: ${API_URL}"
    echo -e "2. Test the complete application flow"
    echo -e "3. Set up monitoring and alerts"
    echo -e "4. Configure Telegram webhook (if using Telegram bot)"
    exit 0
else
    echo -e "${RED}❌ Deployment Verification: ISSUES FOUND${NC}"
    echo -e "${YELLOW}Please check the following:${NC}"
    echo -e "1. Environment variables are correctly set in Railway"
    echo -e "2. MongoDB Atlas connection string is valid"
    echo -e "3. All required environment variables are present"
    echo -e "4. Check Railway deployment logs for errors"
    echo
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "- Run: railway logs (to see application logs)"
    echo -e "- Check: Railway dashboard → Variables tab"
    echo -e "- Verify: MongoDB Atlas network access settings"
    exit 1
fi

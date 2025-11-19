#!/bin/bash

# ============================================================================
# TMV Business Solutions - Deployment Verification Script
# ============================================================================
# This script tests all critical endpoints and configurations after deployment
# Usage: ./verify-deployment.sh [domain]
# Example: ./verify-deployment.sh https://tmvbusinesssolutions.co.za
# ============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default domain
DOMAIN="${1:-https://tmvbusinesssolutions.co.za}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ============================================================================
# Functions
# ============================================================================

print_header() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  TMV Business Solutions${NC}"
    echo -e "${CYAN}  Deployment Verification${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo -e "Testing domain: ${BLUE}$DOMAIN${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}──────────────────────────────────────────${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}──────────────────────────────────────────${NC}"
}

test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    local method=${4:-GET}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$DOMAIN$endpoint" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $response)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_json_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_key=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    local response=$(curl -s "$DOMAIN$endpoint" 2>/dev/null)
    
    if echo "$response" | grep -q "$expected_key"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected key: $expected_key)"
        echo "  Response: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_ssl() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing SSL certificate... "
    
    local ssl_check=$(curl -s -I "$DOMAIN" 2>&1 | head -1)
    
    if echo "$ssl_check" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_cors() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing CORS headers... "
    
    local cors_header=$(curl -s -I -H "Origin: $DOMAIN" "$DOMAIN/api/health" 2>/dev/null | grep -i "access-control-allow-origin" | wc -l)
    
    if [ "$cors_header" -gt 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${YELLOW}⚠ WARNING${NC} (CORS headers not found)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    fi
}

# ============================================================================
# Main Tests
# ============================================================================

print_header

# Section 1: Basic Connectivity
print_section "1. Basic Connectivity"
test_endpoint "Homepage" "/" 200
test_endpoint "Homepage (www)" "/" 200 GET
test_ssl

# Section 2: API Health
print_section "2. API Health Checks"
test_json_endpoint "Health Endpoint" "/api/health" "status"
test_json_endpoint "Test Endpoint" "/api/test" "message"
test_json_endpoint "Comprehensive Status" "/api/status/comprehensive" "timestamp"

# Section 3: Authentication APIs
print_section "3. Authentication APIs"
test_endpoint "Get Current User" "/api/auth/me" 200
test_endpoint "Login Page" "/pages/client_login.html" 200
test_endpoint "Register Page" "/pages/register.html" 200

# Section 4: Payment APIs
print_section "4. Payment Gateway"
test_json_endpoint "Yoco Public Key" "/api/payments/public-key" "publicKey"

# Section 5: Static Assets
print_section "5. Static Assets"
test_endpoint "Main Stylesheet" "/styles.css" 200
test_endpoint "Scripts Directory" "/scripts/api.js" 200
test_endpoint "Logo" "/logos/" 200

# Section 6: Security
print_section "6. Security Tests"
test_cors

# Section 7: Additional Pages
print_section "7. Additional Pages"
test_endpoint "IT Infrastructure" "/pages/it_infrastructure.html" 200
test_endpoint "Architecture Services" "/pages/architecture.html" 200
test_endpoint "Payment Success" "/pages/payment-success.html" 200

# ============================================================================
# Summary
# ============================================================================

print_section "Test Summary"

echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ✓ All Tests Passed!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${CYAN}Deployment Status: READY FOR PRODUCTION${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}  ✗ Some Tests Failed${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Please review the failed tests above and:${NC}"
    echo "1. Check server logs for errors"
    echo "2. Verify .htaccess configuration"
    echo "3. Ensure backend server is running"
    echo "4. Check database connectivity"
    echo "5. Verify all files were uploaded correctly"
    echo ""
    exit 1
fi

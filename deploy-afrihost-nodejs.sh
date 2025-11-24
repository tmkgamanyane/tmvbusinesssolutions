#!/bin/bash

# ============================================================================
# TMV Business Solutions - Full-Stack Afrihost Deployment with Node.js
# ============================================================================
# This script prepares and uploads both frontend and backend to Afrihost
# where Node.js is configured and running locally
# Usage: ./deploy-afrihost-nodejs.sh
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/tmp/tmv-afrihost-deploy"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# FTP Configuration (can be overridden with environment variables)
FTP_HOST="${FTP_HOST:-tmvbusinesssolutions.co.za}"
FTP_PORT="${FTP_PORT:-21}"
FTP_USER="${FTP_USER:-your_ftp_username}"
FTP_PASS="${FTP_PASS:-your_ftp_password}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/public_html}"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  TMV Business Solutions - Afrihost Node.js Deployment         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pre-deployment Checks
echo -e "${BLUE}[1/7] Running pre-deployment checks...${NC}"

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ] && [ ! -f "$PROJECT_DIR/.env.afrihost" ]; then
    echo -e "${RED}✗ Error: Neither .env nor .env.afrihost found!${NC}"
    echo -e "${YELLOW}Please create .env from .env.afrihost template:${NC}"
    echo "  cp .env.afrihost .env"
    echo "  nano .env  # Edit with your credentials"
    exit 1
fi

# Check if package.json exists
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}✗ Error: package.json not found!${NC}"
    exit 1
fi

# Check if server.js exists
if [ ! -f "$PROJECT_DIR/server.js" ]; then
    echo -e "${RED}✗ Error: server.js not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"
echo ""

# Step 2: Prepare Deployment Directory
echo -e "${BLUE}[2/7] Preparing deployment directory...${NC}"

# Clean and create deployment directory
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${GREEN}✓ Deployment directory created: $DEPLOY_DIR${NC}"
echo ""

# Step 3: Copy Files
echo -e "${BLUE}[3/7] Copying files to deployment directory...${NC}"

# Copy essential files
echo "  → Copying configuration files..."
cp "$PROJECT_DIR/.htaccess" "$DEPLOY_DIR/" 2>/dev/null || echo -e "${YELLOW}  ⚠ .htaccess not found${NC}"
cp "$PROJECT_DIR/package.json" "$DEPLOY_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$DEPLOY_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/ecosystem.config.json" "$DEPLOY_DIR/" 2>/dev/null || true

# Copy environment file
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$DEPLOY_DIR/"
    echo "  → Copied .env file"
elif [ -f "$PROJECT_DIR/.env.afrihost" ]; then
    cp "$PROJECT_DIR/.env.afrihost" "$DEPLOY_DIR/.env"
    echo -e "${YELLOW}  ⚠ Copied .env.afrihost as .env - Please configure with your credentials!${NC}"
fi

# Copy server files
echo "  → Copying server files..."
cp "$PROJECT_DIR/server.js" "$DEPLOY_DIR/"
cp "$PROJECT_DIR/start.js" "$DEPLOY_DIR/" 2>/dev/null || true

# Copy frontend files
echo "  → Copying frontend files..."
cp "$PROJECT_DIR/index.html" "$DEPLOY_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/styles.css" "$DEPLOY_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/scripts.js" "$DEPLOY_DIR/" 2>/dev/null || true

# Copy directories
echo "  → Copying backend directory..."
if [ -d "$PROJECT_DIR/backend" ]; then
    cp -r "$PROJECT_DIR/backend" "$DEPLOY_DIR/"
else
    echo -e "${YELLOW}  ⚠ backend directory not found${NC}"
fi

# Copy frontend directories
for dir in pages scripts styles assets images logos cart; do
    if [ -d "$PROJECT_DIR/$dir" ]; then
        echo "  → Copying $dir directory..."
        cp -r "$PROJECT_DIR/$dir" "$DEPLOY_DIR/"
    fi
done

echo -e "${GREEN}✓ Files copied successfully${NC}"
echo ""

# Step 4: Display Deployment Summary
echo -e "${BLUE}[4/7] Deployment Summary${NC}"
echo -e "${CYAN}──────────────────────────────────────────────────────────${NC}"

# Count files
FILE_COUNT=$(find "$DEPLOY_DIR" -type f | wc -l)
DIR_COUNT=$(find "$DEPLOY_DIR" -type d | wc -l)
TOTAL_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)

echo "  Files prepared: $FILE_COUNT files in $DIR_COUNT directories"
echo "  Total size: $TOTAL_SIZE"
echo ""

echo "  Directories included:"
for dir in "$DEPLOY_DIR"/*; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        dirsize=$(du -sh "$dir" | cut -f1)
        echo "    • $dirname/ ($dirsize)"
    fi
done
echo ""

echo "  Critical files:"
[ -f "$DEPLOY_DIR/.htaccess" ] && echo "    ✓ .htaccess" || echo "    ✗ .htaccess (MISSING!)"
[ -f "$DEPLOY_DIR/.env" ] && echo "    ✓ .env" || echo "    ✗ .env (MISSING!)"
[ -f "$DEPLOY_DIR/server.js" ] && echo "    ✓ server.js" || echo "    ✗ server.js (MISSING!)"
[ -f "$DEPLOY_DIR/package.json" ] && echo "    ✓ package.json" || echo "    ✗ package.json (MISSING!)"
[ -f "$DEPLOY_DIR/index.html" ] && echo "    ✓ index.html" || echo "    ✗ index.html (MISSING!)"
echo ""

echo -e "${CYAN}──────────────────────────────────────────────────────────${NC}"
echo ""

# Step 5: Upload Instructions
echo -e "${BLUE}[5/7] Deployment Method Selection${NC}"
echo ""
echo "Choose your preferred deployment method:"
echo ""
echo "  ${GREEN}Option 1: Manual FTP Upload (Recommended)${NC}"
echo "    → Use FileZilla, WinSCP, or your preferred FTP client"
echo "    → Upload contents of: $DEPLOY_DIR"
echo "    → Target directory: public_html on your Afrihost server"
echo ""
echo "  ${GREEN}Option 2: cPanel File Manager${NC}"
echo "    → Login to: https://cpanel.tmvbusinesssolutions.co.za"
echo "    → Go to File Manager → public_html"
echo "    → Upload files from: $DEPLOY_DIR"
echo ""
echo "  ${GREEN}Option 3: SCP (Linux/Mac)${NC}"
echo "    → Run: scp -r $DEPLOY_DIR/* user@$FTP_HOST:~/public_html/"
echo ""
echo "  ${GREEN}Option 4: rsync (Linux/Mac)${NC}"
echo "    → Run: rsync -avz $DEPLOY_DIR/* user@$FTP_HOST:~/public_html/"
echo ""

read -p "Would you like to see FTP connection details? (y/n): " show_ftp
if [[ $show_ftp == "y" || $show_ftp == "Y" ]]; then
    echo ""
    echo -e "${CYAN}FTP Connection Details:${NC}"
    echo "  Host: $FTP_HOST"
    echo "  Port: $FTP_PORT"
    echo "  Username: $FTP_USER"
    echo "  Remote Directory: $FTP_REMOTE_DIR"
    echo ""
fi

# Step 6: Post-Upload Instructions
echo -e "${BLUE}[6/7] Post-Upload Instructions${NC}"
echo ""
echo -e "${YELLOW}After uploading files, SSH into your server and run:${NC}"
echo ""
echo "  # Navigate to project directory"
echo "  cd ~/public_html"
echo ""
echo "  # Install Node.js dependencies"
echo "  npm install --production"
echo ""
echo "  # Start the application with PM2"
echo "  pm2 start ecosystem.config.json --env production"
echo "  pm2 save"
echo "  pm2 startup  # Follow the command it outputs"
echo ""
echo "  # Or start with nohup (simpler)"
echo "  nohup npm start > server.log 2>&1 &"
echo ""
echo -e "${YELLOW}For detailed instructions, see: AFRIHOST_NODEJS_DEPLOYMENT.md${NC}"
echo ""

# Step 7: Verification Steps
echo -e "${BLUE}[7/7] Verification Checklist${NC}"
echo ""
echo "After deployment, verify these items:"
echo ""
echo "  [ ] Files uploaded to public_html"
echo "  [ ] npm install completed on server"
echo "  [ ] Node.js server started (pm2 status shows 'online')"
echo "  [ ] https://tmvbusinesssolutions.co.za loads"
echo "  [ ] API health check: curl https://tmvbusinesssolutions.co.za/api/health"
echo "  [ ] Login/Registration works"
echo "  [ ] Database connection works"
echo "  [ ] Email notifications send"
echo "  [ ] Payment gateway initializes"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment preparation complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Files ready in: ${CYAN}$DEPLOY_DIR${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Upload files from $DEPLOY_DIR to your Afrihost server"
echo "  2. SSH into server and run 'npm install --production'"
echo "  3. Start Node.js with PM2 or your preferred method"
echo "  4. Test deployment: https://tmvbusinesssolutions.co.za"
echo ""
echo -e "${CYAN}For detailed guidance, see: AFRIHOST_NODEJS_DEPLOYMENT.md${NC}"
echo ""

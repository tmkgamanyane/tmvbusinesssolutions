#!/bin/bash

# ============================================================================
# TMV Business Solutions - FTP Deployment Script (Linux/Mac/Git Bash)
# ============================================================================
# This script uploads the frontend files to Afrihost via FTP
# Usage: ./deploy-ftp.sh
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# FTP Configuration
FTP_HOST="${FTP_HOST:-tmvbusinesssolutions.co.za}"
FTP_PORT="${FTP_PORT:-21}"
FTP_USER="${FTP_USER:-tshepisokgamanyane@tmvbusinesssolutions.co.za}"
FTP_PASS="${FTP_PASS:-Moses@1985}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/}"

# Files and directories to upload
UPLOAD_FILES=(
    ".htaccess"
    "index.html"
    "styles.css"
    "scripts.js"
)

UPLOAD_DIRS=(
    "pages"
    "scripts"
    "styles"
    "assets"
    "images"
    "logos"
    "cart"
)

# Files and directories to exclude
EXCLUDE_PATTERNS=(
    "node_modules"
    "backend"
    ".git"
    ".github"
    "*.md"
    "*.json"
    "server.js"
    "start.js"
    "ecosystem.config.json"
    ".env"
    ".env.example"
    "deploy*.sh"
    "deploy*.ps1"
    "deploy*.bat"
    "*.log"
    "fix_*.js"
    "migrate_*.js"
    "run_migration.js"
    "test-*.html"
    "render.yaml"
)

# ============================================================================
# Functions
# ============================================================================

print_header() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}   TMV Business Solutions - FTP Deploy${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if required commands are available
check_requirements() {
    print_info "Checking requirements..."
    
    local missing_requirements=()
    
    if ! command -v ftp &> /dev/null && ! command -v lftp &> /dev/null; then
        missing_requirements+=("ftp or lftp")
    fi
    
    if [ ${#missing_requirements[@]} -gt 0 ]; then
        print_error "Missing required commands:"
        for req in "${missing_requirements[@]}"; do
            echo "  - $req"
        done
        echo ""
        echo "Install instructions:"
        echo "  Ubuntu/Debian: sudo apt-get install ftp lftp"
        echo "  macOS: brew install lftp"
        echo "  CentOS/RHEL: sudo yum install ftp lftp"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Create FTP script file
create_ftp_script() {
    local script_file=$1
    
    print_info "Creating FTP command script..."
    
    # Create temporary FTP script
    cat > "$script_file" << EOF
open $FTP_HOST $FTP_PORT
user $FTP_USER $FTP_PASS
binary
prompt off
cd $FTP_REMOTE_DIR
EOF

    # Add file uploads
    for file in "${UPLOAD_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo "put \"$file\"" >> "$script_file"
            print_info "Added file: $file"
        else
            print_warning "File not found: $file"
        fi
    done
    
    # Add directory uploads
    for dir in "${UPLOAD_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            echo "mkdir $dir" >> "$script_file"
            echo "cd $dir" >> "$script_file"
            
            # Find all files in directory (excluding patterns)
            local exclude_find_args=""
            for pattern in "${EXCLUDE_PATTERNS[@]}"; do
                exclude_find_args="$exclude_find_args -not -path '*/$pattern/*'"
            done
            
            # Upload files recursively
            find "$dir" -type f | while read -r file; do
                local relative_path="${file#$dir/}"
                local file_dir=$(dirname "$relative_path")
                
                if [ "$file_dir" != "." ]; then
                    echo "mkdir \"$file_dir\"" >> "$script_file"
                    echo "cd \"$file_dir\"" >> "$script_file"
                    echo "put \"$file\" \"$(basename "$file")\"" >> "$script_file"
                    echo "cd .." >> "$script_file"
                else
                    echo "put \"$file\" \"$(basename "$file")\"" >> "$script_file"
                fi
            done
            
            echo "cd .." >> "$script_file"
            print_info "Added directory: $dir"
        else
            print_warning "Directory not found: $dir"
        fi
    done
    
    echo "bye" >> "$script_file"
    
    print_success "FTP script created"
}

# Upload files using lftp (preferred)
upload_with_lftp() {
    print_info "Uploading files using lftp..."
    
    lftp -c "
        set ftp:ssl-allow no
        set ftp:passive-mode on
        open -u $FTP_USER,$FTP_PASS $FTP_HOST:$FTP_PORT
        cd $FTP_REMOTE_DIR
        
        # Upload individual files
        $(for file in "${UPLOAD_FILES[@]}"; do
            if [ -f "$file" ]; then
                echo "put \"$file\""
            fi
        done)
        
        # Upload directories
        $(for dir in "${UPLOAD_DIRS[@]}"; do
            if [ -d "$dir" ]; then
                echo "mirror -R --verbose \"$dir\" \"$dir\""
            fi
        done)
        
        bye
    "
    
    if [ $? -eq 0 ]; then
        print_success "Upload completed successfully using lftp"
        return 0
    else
        print_error "Upload failed with lftp"
        return 1
    fi
}

# Upload files using ftp (fallback)
upload_with_ftp() {
    local script_file=$1
    
    print_info "Uploading files using ftp..."
    
    ftp -n < "$script_file"
    
    if [ $? -eq 0 ]; then
        print_success "Upload completed successfully using ftp"
        return 0
    else
        print_error "Upload failed with ftp"
        return 1
    fi
}

# Main deployment function
deploy() {
    print_header
    
    # Check requirements
    check_requirements
    
    # Show configuration
    echo -e "${CYAN}Configuration:${NC}"
    echo "  Host: $FTP_HOST:$FTP_PORT"
    echo "  User: $FTP_USER"
    echo "  Remote Directory: $FTP_REMOTE_DIR"
    echo ""
    
    # Confirm deployment
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    # Try lftp first (better for directories), fallback to ftp
    if command -v lftp &> /dev/null; then
        if upload_with_lftp; then
            deployment_success
            return
        fi
    fi
    
    # Fallback to standard ftp
    if command -v ftp &> /dev/null; then
        local temp_script=$(mktemp)
        create_ftp_script "$temp_script"
        
        if upload_with_ftp "$temp_script"; then
            rm -f "$temp_script"
            deployment_success
            return
        fi
        
        rm -f "$temp_script"
    fi
    
    deployment_failed
}

# Success message
deployment_success() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   ✓ Deployment Successful!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. Clear browser cache (Ctrl+Shift+R)"
    echo "  2. Visit: https://tmvbusinesssolutions.co.za"
    echo "  3. Test API endpoints"
    echo "  4. Verify login/registration"
    echo "  5. Check payment gateway"
    echo ""
    echo -e "${CYAN}Troubleshooting:${NC}"
    echo "  - Check Apache error logs if issues persist"
    echo "  - Verify .htaccess file is uploaded"
    echo "  - Ensure Node.js backend is running"
    echo ""
}

# Failure message
deployment_failed() {
    echo ""
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}   ✗ Deployment Failed!${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Verify FTP credentials are correct"
    echo "  2. Check if FTP is enabled on Afrihost account"
    echo "  3. Ensure firewall is not blocking port 21"
    echo "  4. Try manual upload using FileZilla"
    echo "  5. Contact Afrihost support if issue persists"
    echo ""
    exit 1
}

# ============================================================================
# Main Execution
# ============================================================================

deploy

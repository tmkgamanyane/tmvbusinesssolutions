#!/bin/bash
# TMV Business Solutions - Production Deployment Script
# Run this script on your Afrihost server to deploy the application

echo "🚀 TMV Business Solutions - Production Deployment"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MySQL is running
if ! systemctl is-active --quiet mysql; then
    echo "⚠️  MySQL is not running. Attempting to start..."
    sudo systemctl start mysql
    if ! systemctl is-active --quiet mysql; then
        echo "❌ Error: Could not start MySQL. Please start MySQL manually."
        exit 1
    fi
fi

echo "✅ Environment checks passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists and has correct database name
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create the .env file first."
    exit 1
fi

# Verify database name in .env
if ! grep -q "DB_NAME=tmvbusinesssolutions" .env; then
    echo "⚠️  Warning: Database name might be incorrect in .env file"
    echo "   Expected: DB_NAME=tmvbusinesssolutions"
    echo "   Please verify your .env configuration"
fi

# Check database connection
echo "🗄️  Testing database connection..."
mysql -u root -p${DB_PASSWORD:-Moses@1985} -e "SELECT 1;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Error: Cannot connect to MySQL. Please check your database credentials."
    echo "   Try running: mysql -u root -p"
    exit 1
fi

# Create database if it doesn't exist
echo "🏗️  Setting up database..."
mysql -u root -p${DB_PASSWORD:-Moses@1985} < database-setup.sql

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop any existing server
echo "🛑 Stopping existing server..."
pm2 stop tmvbusinesssolutions 2>/dev/null || true
pm2 delete tmvbusinesssolutions 2>/dev/null || true

# Start the server
echo "🚀 Starting TMV Business Solutions server..."
pm2 start ecosystem.config.json --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Server Status:"
pm2 status

echo ""
echo "📝 Useful Commands:"
echo "   View logs:     pm2 logs tmvbusinesssolutions"
echo "   Restart:       pm2 restart tmvbusinesssolutions"
echo "   Stop:          pm2 stop tmvbusinesssolutions"
echo "   Status:        pm2 status"
echo ""
echo "🌐 Your application should be running at:"
echo "   https://tmvbusinesssolutions.co.za"
echo ""
echo "🔍 If you encounter issues, check the logs:"
echo "   pm2 logs tmvbusinesssolutions --lines 100"
# TMV Business Solutions - Afrihost Node.js Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the complete TMV Business Solutions application (frontend + backend) to Afrihost with Node.js support enabled.

## Prerequisites

Before starting, ensure you have:
- ✅ Afrihost hosting account with **Node.js enabled**
- ✅ cPanel access credentials
- ✅ Domain: tmvbusinesssolutions.co.za (pointing to your Afrihost server)
- ✅ MySQL database created on Afrihost
- ✅ Email account configured on Afrihost
- ✅ FTP/SSH access to your hosting account

## Architecture

This deployment uses a **unified hosting model** where both frontend and backend run on Afrihost:

```
┌─────────────────────────────────────────────┐
│         User Browser                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Afrihost: tmvbusinesssolutions.co.za       │
│  ┌───────────────────────────────────────┐  │
│  │  Apache + .htaccess                   │  │
│  │  - Serves static files                │  │
│  │  - Proxies /api/* to localhost:3000   │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  Node.js Server (port 3000)           │  │
│  │  - Express API endpoints              │  │
│  │  - Authentication                     │  │
│  │  - Payment processing (Yoco)          │  │
│  │  - Email notifications                │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  MySQL Database                       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Step 1: Prepare Your Local Files

### 1.1 Clone or Download the Repository
```bash
# If using Git
git clone <repository-url>
cd tmvbusinesssolutions

# Or download and extract ZIP
```

### 1.2 Configure Environment Variables
Copy the Afrihost environment template and fill in your credentials:

```bash
cp .env.afrihost .env
```

Edit `.env` with your actual credentials:
```env
# Server Configuration
NODE_ENV=production
PORT=3000
SERVER_URL=https://tmvbusinesssolutions.co.za

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_DIALECT=mysql

# Client Configuration
CLIENT_URL=https://tmvbusinesssolutions.co.za

# Email Configuration
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@tmvbusinesssolutions.co.za

# Payment Gateway - Yoco
YOCO_PUBLIC_KEY=pk_live_your_public_key
YOCO_SECRET_KEY=sk_live_your_secret_key

# JWT Secret (generate a strong random string)
JWT_SECRET=your_long_random_jwt_secret_here

# Security
CORS_ORIGINS=https://tmvbusinesssolutions.co.za
```

## Step 2: Upload Files to Afrihost

### Method A: Using FTP Client (FileZilla, WinSCP, etc.)

1. **Connect to FTP**:
   - Host: `ftp.tmvbusinesssolutions.co.za` (or your Afrihost FTP address)
   - Port: `21`
   - Username: Your cPanel username
   - Password: Your cPanel password

2. **Navigate to public_html**:
   - Most Afrihost accounts use `public_html` as the web root

3. **Upload ALL files and folders**:
   ```
   ✓ .htaccess (CRITICAL - enables routing)
   ✓ .env (your configured environment file)
   ✓ server.js
   ✓ start.js
   ✓ package.json
   ✓ package-lock.json (if exists)
   ✓ ecosystem.config.json
   ✓ index.html
   ✓ styles.css
   ✓ scripts.js
   ✓ /backend/ (entire folder)
   ✓ /pages/ (entire folder)
   ✓ /scripts/ (entire folder)
   ✓ /styles/ (entire folder)
   ✓ /assets/ (entire folder)
   ✓ /images/ (entire folder)
   ✓ /logos/ (entire folder)
   ✓ /cart/ (entire folder)
   ```

4. **DO NOT upload**:
   ```
   ✗ node_modules/ (too large, will install on server)
   ✗ .git/ (version control, not needed)
   ✗ .github/ (GitHub Actions, not needed)
   ✗ *.md files (documentation, optional)
   ```

### Method B: Using cPanel File Manager

1. Login to cPanel: `https://cpanel.tmvbusinesssolutions.co.za`
2. Open **File Manager**
3. Click **Settings** (top right) → Enable **Show Hidden Files**
4. Navigate to `public_html`
5. Click **Upload** and select all files/folders listed above
6. Wait for upload to complete

### Method C: Using SSH/Command Line

```bash
# From your local machine
scp -r * username@tmvbusinesssolutions.co.za:~/public_html/

# Or using rsync (faster, skips existing files)
rsync -avz --exclude='node_modules' --exclude='.git' \
  ./* username@tmvbusinesssolutions.co.za:~/public_html/
```

## Step 3: Install Node.js Dependencies on Server

### 3.1 Access Server Terminal

**Option A: cPanel Terminal**
1. Login to cPanel
2. Find **Terminal** in the Advanced section
3. Click to open web-based terminal

**Option B: SSH**
```bash
ssh username@tmvbusinesssolutions.co.za
```

### 3.2 Navigate to Project Directory
```bash
cd ~/public_html
pwd  # Verify you're in the right location
ls -la  # Should see your uploaded files
```

### 3.3 Install Dependencies
```bash
npm install --production
```

This will take 2-5 minutes. You should see:
```
added XXX packages in XXs
```

### 3.4 Verify Installation
```bash
# Check if dependencies installed
ls -la node_modules | head -10

# Check if key packages exist
ls node_modules | grep -E "express|mysql2|sequelize|dotenv"
```

## Step 4: Start the Node.js Server

### Option A: Using PM2 (Recommended for Production)

PM2 keeps your application running even after you close the terminal.

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application
cd ~/public_html
pm2 start ecosystem.config.json --env production

# Save PM2 configuration
pm2 save

# Set PM2 to start on server reboot
pm2 startup
# Run the command that PM2 outputs (it will give you a specific command)

# Check status
pm2 status

# View logs
pm2 logs tmvbusinesssolutions --lines 50
```

### Option B: Using Node.js Application in cPanel

If your Afrihost cPanel has a Node.js Application Manager:

1. Go to cPanel → **Node.js Selector** or **Setup Node.js App**
2. Click **Create Application**
3. Fill in the form:
   - **Node.js Version**: 14.x or higher (choose the latest available)
   - **Application Mode**: Production
   - **Application Root**: `public_html`
   - **Application URL**: Leave as domain root
   - **Application Startup File**: `start.js`
   - **Environment Variables**: Add from .env if needed
4. Click **Create**
5. Click **Run NPM Install** (if shown)
6. Click **Start/Restart** to run the application

### Option C: Using nohup (Simple Background Process)

```bash
cd ~/public_html
nohup npm start > server.log 2>&1 &

# Check if running
ps aux | grep node

# View logs
tail -f server.log
```

## Step 5: Verify Deployment

### 5.1 Check Server Status
```bash
# Check if Node.js is listening on port 3000
netstat -an | grep 3000
# Should show: LISTEN 0.0.0.0:3000 or similar

# Check if process is running
ps aux | grep node
```

### 5.2 Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test from public domain
curl https://tmvbusinesssolutions.co.za/api/health
```

### 5.3 Test in Browser

1. Open browser: `https://tmvbusinesssolutions.co.za`
2. Homepage should load without errors
3. Open browser console (F12) → Check for errors
4. Try to login/register to test API connectivity

### 5.4 Check Logs

```bash
# If using PM2
pm2 logs tmvbusinesssolutions --lines 100

# If using nohup
tail -f ~/public_html/server.log

# If using cPanel Node.js app
# Check logs in cPanel → Node.js App → Logs
```

## Step 6: Database Setup

### 6.1 Create Database in cPanel

1. Login to cPanel
2. Go to **MySQL Databases**
3. Create a new database:
   - Database Name: `tmvbusinesssolutions` (or your preferred name)
   - Click **Create Database**
4. Create a database user:
   - Username: Choose a username
   - Password: Generate a strong password
   - Click **Create User**
5. Add user to database:
   - Select the user and database
   - Grant **ALL PRIVILEGES**
   - Click **Add**

### 6.2 Update .env with Database Credentials

```bash
cd ~/public_html
nano .env  # or use cPanel File Manager editor
```

Update these lines:
```env
DB_HOST=localhost
DB_USER=your_cpanel_username_dbuser
DB_NAME=your_cpanel_username_dbname
DB_PASSWORD=your_strong_database_password
```

### 6.3 Import Database Schema (if you have a SQL file)

**Option A: Using phpMyAdmin**
1. cPanel → phpMyAdmin
2. Select your database
3. Click **Import**
4. Choose your SQL file
5. Click **Go**

**Option B: Using Command Line**
```bash
mysql -u your_db_user -p your_db_name < database-setup.sql
```

### 6.4 Restart Server to Apply Changes

```bash
pm2 restart tmvbusinesssolutions
# or restart via cPanel Node.js App interface
```

## Step 7: Configure Email

### 7.1 Create Email Account in cPanel

1. cPanel → **Email Accounts**
2. Click **Create**
3. Email: `noreply@tmvbusinesssolutions.co.za`
4. Password: Generate strong password
5. Click **Create**

### 7.2 Test Email Configuration

```bash
# Test SMTP connection
telnet mail.afrihost.com 587

# Test via API endpoint (after server is running)
curl -X POST https://tmvbusinesssolutions.co.za/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your_email@example.com"}'
```

## Step 8: SSL Certificate (HTTPS)

### Enable Let's Encrypt SSL

1. cPanel → **SSL/TLS Status**
2. Find your domain: `tmvbusinesssolutions.co.za`
3. Click **Run AutoSSL**
4. Wait for certificate to be installed (usually 1-2 minutes)
5. Verify: Your site should now load with `https://`

The `.htaccess` file already includes rules to force HTTPS.

## Troubleshooting

### Problem: Server won't start

**Symptoms**: PM2 shows "errored" or process crashes immediately

**Solutions**:
```bash
# Check syntax errors
node -c server.js

# Check .env file exists
ls -la .env

# Check required environment variables
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"

# Check for missing dependencies
npm install

# Check logs for specific error
pm2 logs tmvbusinesssolutions --err
```

### Problem: Database connection fails

**Symptoms**: "Connection refused" or "Access denied" errors

**Solutions**:
```bash
# Test database connection manually
mysql -u your_db_user -p -h localhost your_db_name

# Check .env has correct credentials
cat .env | grep DB_

# Ensure database user has privileges
# In MySQL: GRANT ALL PRIVILEGES ON dbname.* TO 'user'@'localhost';

# Restart server after fixing
pm2 restart tmvbusinesssolutions
```

### Problem: API requests return 502 Bad Gateway

**Symptoms**: Frontend loads but API calls fail

**Solutions**:
```bash
# Check if Node.js server is running
ps aux | grep node
netstat -an | grep 3000

# Check if .htaccess is configured correctly
cat .htaccess | grep localhost:3000

# Check Apache has mod_proxy enabled
# Contact Afrihost support to enable mod_proxy and mod_proxy_http

# Check for firewall blocking localhost connections
# Contact Afrihost support if needed

# Test direct connection to Node.js
curl http://localhost:3000/api/health
```

### Problem: "Cannot find module" errors

**Symptoms**: Server crashes with module not found

**Solution**:
```bash
cd ~/public_html
rm -rf node_modules
npm install --production
pm2 restart tmvbusinesssolutions
```

### Problem: Port 3000 already in use

**Symptoms**: "EADDRINUSE: address already in use :::3000"

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000
# or
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>

# Or change PORT in .env to 3001
echo "PORT=3001" >> .env
# Update .htaccess to proxy to localhost:3001
pm2 restart tmvbusinesssolutions
```

### Problem: Payment/Yoco not working

**Symptoms**: Payment modal doesn't appear or API calls fail

**Solutions**:
```bash
# Verify Yoco keys in .env
cat .env | grep YOCO

# Ensure using LIVE keys (pk_live_... and sk_live_...)
# Not test keys (pk_test_... and sk_test_...)

# Test Yoco endpoint
curl https://tmvbusinesssolutions.co.za/api/payments/public-key

# Check browser console for Yoco script loading errors
# Verify domain is allowed in Yoco dashboard
```

## Monitoring and Maintenance

### Regular Health Checks

```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs tmvbusinesssolutions --lines 50

# Monitor CPU/Memory usage
pm2 monit

# Check disk space
df -h

# Check database size
mysql -u user -p -e "SELECT table_schema AS 'Database', \
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' \
  FROM information_schema.TABLES GROUP BY table_schema;"
```

### Restart Application

```bash
# Restart with PM2
pm2 restart tmvbusinesssolutions

# Or via cPanel Node.js App
# Click "Restart" button in the interface

# Or if using nohup
pkill -f "node.*server.js"
cd ~/public_html
nohup npm start > server.log 2>&1 &
```

### Update Application

```bash
# Pull latest code (if using git)
cd ~/public_html
git pull origin main

# Install new dependencies
npm install --production

# Restart application
pm2 restart tmvbusinesssolutions

# Check logs for errors
pm2 logs tmvbusinesssolutions
```

### Backup Database

```bash
# Create backup
mysqldump -u your_db_user -p your_db_name > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u your_db_user -p your_db_name < backup_20241124.sql
```

## Performance Optimization

### Enable Compression

Already configured in `.htaccess`, but verify:
```bash
cat .htaccess | grep -i gzip
```

### Monitor Performance

```bash
# Check response times
time curl https://tmvbusinesssolutions.co.za/api/health

# Monitor active connections
netstat -an | grep :3000 | wc -l

# Check memory usage
free -h
pm2 show tmvbusinesssolutions
```

### Optimize Node.js

Edit `ecosystem.config.json`:
```json
{
  "node_args": "--max-old-space-size=1024",
  "max_memory_restart": "1G"
}
```

Then restart:
```bash
pm2 reload ecosystem.config.json
```

## Success Checklist

After deployment, verify all these items:

- [ ] ✅ Files uploaded to public_html
- [ ] ✅ npm install completed successfully
- [ ] ✅ .env file configured with correct credentials
- [ ] ✅ Database created and user has privileges
- [ ] ✅ Node.js server running (pm2 status shows "online")
- [ ] ✅ Port 3000 is listening (netstat shows LISTEN)
- [ ] ✅ https://tmvbusinesssolutions.co.za loads without errors
- [ ] ✅ API health check returns 200 OK
- [ ] ✅ Login/Registration works
- [ ] ✅ Database queries execute successfully
- [ ] ✅ Email notifications send
- [ ] ✅ Payment gateway initializes (Yoco modal)
- [ ] ✅ SSL certificate active (HTTPS working)
- [ ] ✅ No CORS errors in browser console
- [ ] ✅ PM2 set to restart on server reboot

## Support

### Afrihost Support
- Website: https://www.afrihost.com/support
- Email: support@afrihost.com
- Phone: 087 944 0000

### Application Support
- Email: architecture@tmvbusinesssolutions.co.za

## Additional Resources

- `.env.afrihost` - Environment template
- `AFRIHOST_CHECKLIST.md` - Detailed deployment checklist
- `ecosystem.config.json` - PM2 configuration
- `package.json` - Dependencies list

---

**Deployment Date**: 2024
**Version**: 1.0
**Status**: Production Ready ✅

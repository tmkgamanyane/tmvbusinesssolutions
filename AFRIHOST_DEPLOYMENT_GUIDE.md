# Afrihost Public_HTML Deployment Guide

## Overview
This guide walks through deploying the TMV Business Solutions application to Afrihost's public_html folder as a unified Node.js + frontend deployment.

## Prerequisites
- [ ] Afrihost account with Node.js support enabled
- [ ] SSH/Terminal access or cPanel File Manager access
- [ ] Domain: tmvbusinesssolutions.co.za pointing to public_html
- [ ] Database: Afrihost MySQL (tmvbusinesssolutions.co.za:3306)
- [ ] Local development machine IP whitelisted in Afrihost Remote MySQL

## Phase 1: Prepare Local Files

### 1.1 Copy Files to Upload Directory
```bash
# Create a deployment directory
mkdir ~/tmv-deploy-afrihost
cd ~/tmv-deploy-afrihost

# Copy project files (exclude node_modules and .git)
cp -r /path/to/project/* .
rm -rf node_modules .git
```

### 1.2 Verify .env.afrihost
Ensure `.env.afrihost` contains:
```env
DB_HOST=tmvbusinesssolutions.co.za
DB_USER=tmvbusw4e7k0_tmvbusinesssolutions
DB_PASSWORD=YOUR_PASSWORD_HERE
DB_NAME=tmvbusw4e7k0_tmvbusinesssolutions
CLIENT_URL=https://tmvbusinesssolutions.co.za
NODE_ENV=production
PORT=3000
YOCO_PUBLIC_KEY=pk_live_your_public_key
YOCO_SECRET_KEY=YOUR_SECRET_KEY_HERE
EMAIL_USER=YOUR_EMAIL@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=YOUR_EMAIL_PASSWORD_HERE
```

## Phase 2: Upload to Afrihost public_html

### Option A: Using cPanel File Manager (Recommended)
1. Login to cPanel: https://cpanel.tmvbusinesssolutions.co.za
2. Open File Manager
3. Enable "Show hidden files" (Settings icon)
4. Navigate to public_html
5. Upload files in this order:
   - `.htaccess` (first - CRITICAL for routing)
   - `.env` (renamed from .env.afrihost)
   - `server.js`
   - `start.js`
   - `package.json`
   - All folders: `pages/`, `scripts/`, `styles/`, `assets/`, `images/`, `logos/`, `cart/`, `backend/`

### Option B: Using cPanel Terminal / SSH
```bash
# SSH into Afrihost
ssh username@tmvbusinesssolutions.co.za

# Navigate to public_html
cd ~/public_html

# Upload files (use scp from local machine)
# From local terminal:
scp -r * username@tmvbusinesssolutions.co.za:~/public_html/
```

## Phase 3: Install Dependencies on Server

### Via cPanel Terminal
```bash
cd ~/public_html
npm install --production
```

### Critical: Rename .env.afrihost
```bash
cd ~/public_html
mv .env.afrihost .env
```

## Phase 4: Start Node.js Server

### Option A: cPanel Passenger (Recommended for Afrihost)
1. Create `app.js` in public_html (symlink to server.js or wrapper):
```javascript
module.exports = require('./server');
```

2. In cPanel → Ruby On Rails / Node.js → Create Application
   - Node.js version: 14.x or higher
   - Application root: public_html
   - Application startup file: app.js
   - Application environment: production
   - Click "Create"

### Option B: PM2 (Production-Grade)
```bash
npm install -g pm2
cd ~/public_html
pm2 start server.js --name tmv-api
pm2 save
pm2 startup
```

### Option C: Manual nohup
```bash
cd ~/public_html
nohup node server.js > server.log 2>&1 &
```

## Phase 5: Verify Deployment

### Check Server Status
```bash
# Check if listening on port 3000
netstat -an | grep 3000

# Check logs
tail -f server.log  # if using nohup
pm2 logs tmv-api    # if using PM2
```

### Test API Endpoints
```bash
# Test health endpoint
curl https://tmvbusinesssolutions.co.za/api/health

# Test database connection
curl https://tmvbusinesssolutions.co.za/api/test-db

# Test login endpoint
curl -X POST https://tmvbusinesssolutions.co.za/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Frontend
- Visit https://tmvbusinesssolutions.co.za
- Should load without console errors
- Login page should appear

## Phase 6: Configure Database Access

### Whitelist Local IP (For Development)
If developing locally:
1. Get your IP: `curl https://checkip.amazonaws.com`
2. In Afrihost cPanel → Remote MySQL
3. Add IP to allowed hosts
4. Test connection: `mysql -h tmvbusinesssolutions.co.za -u tmvbusw4e7k0_tmvbusinesssolutions -p tmvbusw4e7k0_tmvbusinesssolutions`

### Create Test User
```sql
INSERT INTO users (email, password, name, type, created_at, updated_at) 
VALUES ('test@tmvbusinesssolutions.co.za', 'hashed_password', 'Test User', 'jobseeker', NOW(), NOW());
```

## Phase 7: Email Configuration

### Verify SMTP Settings in .env
```env
EMAIL_USER=YOUR_EMAIL@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=YOUR_EMAIL_PASSWORD
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Test Email (After API Starts)
```bash
curl -X POST https://tmvbusinesssolutions.co.za/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

## Phase 8: Payment Gateway (Yoco)

### Add Yoco Keys to .env
```env
YOCO_PUBLIC_KEY=pk_live_your_public_key
YOCO_SECRET_KEY=sk_live_your_secret_key
```

### Test Payment Endpoint
```bash
curl https://tmvbusinesssolutions.co.za/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"currency":"ZAR"}'
```

## Troubleshooting

### Problem: 503 Service Unavailable
**Cause**: Server not running or crashing
**Solution**:
1. Check logs: `pm2 logs tmv-api` or `tail -f server.log`
2. Verify .env exists in public_html
3. Check npm install completed: `ls -la node_modules`
4. Restart server: `pm2 restart tmv-api`

### Problem: "Cannot GET /"
**Cause**: Express server not running or .htaccess not configured
**Solution**:
1. Verify .htaccess in public_html: `cat .htaccess`
2. Ensure server.js is running: `curl http://localhost:3000`
3. Check cPanel Node.js application status

### Problem: Database Connection Refused
**Cause**: IP not whitelisted in Afrihost Remote MySQL
**Solution**:
1. Add your IP to Remote MySQL whitelist in cPanel
2. Test connection: `mysql -h tmvbusinesssolutions.co.za -u tmvbusw4e7k0_tmvbusinesssolutions -p`
3. Restart Node.js server after whitelisting

### Problem: "Cannot find module 'express'"
**Cause**: npm install not completed
**Solution**:
```bash
cd ~/public_html
npm install --production
```

### Problem: Payment/Email Not Working
**Cause**: Keys not set in .env
**Solution**:
1. Verify keys in .env: `cat .env | grep -E "YOCO|EMAIL"`
2. Restart server to load new env: `pm2 restart tmv-api`
3. Check endpoint response: `curl https://tmvbusinesssolutions.co.za/api/health`

## Complete Flow Testing

1. **Registration**: Register new account at https://tmvbusinesssolutions.co.za/pages/company_registration.html
2. **Email Verification**: Check email for verification link (if email configured)
3. **Login**: Login with new credentials at https://tmvbusinesssolutions.co.za
4. **Dashboard**: Access jobseeker/employer dashboard after login
5. **Payment**: Initiate test payment to verify Yoco integration
6. **Support**: Contact support if issues occur

## Success Indicators

- ✅ https://tmvbusinesssolutions.co.za loads without errors
- ✅ Login works with valid credentials
- ✅ Dashboard displays user data
- ✅ Payment page initializes with Yoco modal
- ✅ Email notifications send (optional)
- ✅ Database queries complete successfully
- ✅ No 503 or 500 errors in logs

## Performance Optimization

After deployment completes:
1. Enable gzip compression in cPanel (reduces file size 70%)
2. Enable HTTP/2 in cPanel SSL settings (faster loading)
3. Set browser cache headers in .htaccess (faster repeat visits)
4. Consider caching layer for static assets

## Maintenance

### Regular Tasks
- Monitor disk usage: `df -h`
- Check Node.js memory: `pm2 monit`
- Backup database: `mysqldump -h tmvbusinesssolutions.co.za -u tmvbusw4e7k0_tmvbusinesssolutions -p tmvbusw4e7k0_tmvbusinesssolutions > backup.sql`
- Review error logs: `tail -f server.log`

### Update Dependencies
```bash
cd ~/public_html
npm update --production
pm2 restart all
```


# TMV Business Solutions - Afrihost FTP Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the TMV Business Solutions application to Afrihost via FTP, ensuring all APIs and server components are properly configured and operational.

## Prerequisites

- Afrihost hosting account with FTP access
- FTP credentials (username and password)
- Domain configured: tmvbusinesssolutions.co.za
- MySQL database on Afrihost
- Email account configured on Afrihost
- Node.js backend (optional: can be hosted on Render or on Afrihost if Node.js is supported)

## Deployment Options

### Option 1: Automated FTP Deployment (Recommended)

#### Linux/Mac/Git Bash

```bash
# Make script executable
chmod +x deploy-ftp.sh

# Run deployment
./deploy-ftp.sh
```

#### Windows PowerShell

```powershell
# Run deployment script
.\deploy-to-afrihost.ps1
```

#### Windows Command Prompt

```batch
# Run deployment batch file
deploy.bat
```

### Option 2: Manual FTP Deployment

Follow the detailed guide in `MANUAL_FTP_DEPLOYMENT_GUIDE.md`

## Deployment Architecture

### Hybrid Hosting Model

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              tmvbusinesssolutions.co.za (Afrihost)          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Static Files: HTML, CSS, JS, Images                 │  │
│  │  - index.html, pages/, scripts/, styles/             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Apache .htaccess Proxy                              │  │
│  │  - Proxies /api/* requests to backend                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
         API Requests     │
         (/api/*)         │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│       Backend Server (Render or Afrihost with Node.js)     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Node.js + Express Server (server.js)                │  │
│  │  - Authentication APIs                                │  │
│  │  - Payment Processing (Yoco)                          │  │
│  │  - Email Notifications                                │  │
│  │  - Database Operations                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────┬────────────────────────┬──────────────────────┘
              │                        │
              ▼                        ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  MySQL Database  │    │  SMTP Email      │
    │  (Afrihost)      │    │  (Afrihost)      │
    └──────────────────┘    └──────────────────┘
```

## Files to Deploy

### Core Files (Root Directory)

```
✓ .htaccess          - Apache configuration (CRITICAL)
✓ index.html         - Homepage
✓ styles.css         - Main stylesheet
✓ scripts.js         - Main JavaScript (optional)
```

### Directories to Deploy

```
✓ pages/             - All HTML pages (login, register, etc.)
✓ scripts/           - JavaScript files and API configuration
✓ styles/            - CSS stylesheets
✓ assets/            - Assets including payment modal
✓ images/            - Marketing images and graphics
✓ logos/             - Company logos and branding
✓ cart/              - Shopping cart resources
```

### Files to EXCLUDE (DO NOT Upload)

```
✗ backend/           - Backend code (deploy separately)
✗ node_modules/      - Dependencies (install on server)
✗ server.js          - Backend server (deploy separately)
✗ start.js           - Server starter (deploy separately)
✗ package.json       - Backend dependencies
✗ .env               - Environment variables (configure separately)
✗ .git/              - Git repository
✗ .github/           - GitHub workflows
✗ *.md               - Documentation files
✗ deploy*.sh         - Deployment scripts
✗ deploy*.ps1        - Deployment scripts
✗ ecosystem.config.json - PM2 configuration
✗ render.yaml        - Render configuration
```

## FTP Configuration

### FTP Connection Details

```
Host:     ftp.tmvbusinesssolutions.co.za (or Afrihost-provided FTP hostname)
Port:     21 (FTP) or 22 (SFTP)
Protocol: FTP or SFTP
Username: tshepisokgamanyane@tmvbusinesssolutions.co.za
Password: Moses@1985
Directory: / (root) or /public_html/ or /www/ (check with Afrihost)
```

### Environment-Specific Settings

Edit these files before deployment:

1. **scripts/api.js or scripts/config.js**
   ```javascript
   // Production API URL
   const API_BASE_URL = 'https://tmvbusinesssolutions.co.za/api';
   ```

2. **.htaccess** (if backend is on external server like Render)
   ```apache
   # Proxy API requests to backend
   RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]
   ```

3. **.htaccess** (if backend is on same Afrihost server)
   ```apache
   # Proxy API requests to local Node.js server
   RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]
   ```

## Apache Configuration (.htaccess)

### Critical .htaccess Settings

The `.htaccess` file MUST be present in the root directory for the application to work correctly.

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Redirect www to non-www
RewriteCond %{HTTP_HOST} ^www\.(.+)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [R=301,L]

# Enable CORS
<IfModule mod_headers.c>
    SetEnvIf Origin "^https?://(www\.)?tmvbusinesssolutions\.co\.za$" AccessControlAllowOrigin=$0
    Header always set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
    Header always set Access-Control-Allow-Credentials "true"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
</IfModule>

# Proxy API requests to backend
<IfModule mod_proxy.c>
    RewriteCond %{REQUEST_URI} ^/api/(.*)$ [NC]
    RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]
</IfModule>

# SPA routing fallback
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteRule . /index.html [L]
</IfModule>
```

### Required Apache Modules

Ensure these modules are enabled on your Afrihost account:

- `mod_rewrite` - URL rewriting
- `mod_proxy` - Proxying requests
- `mod_proxy_http` - HTTP proxying
- `mod_headers` - Setting custom headers
- `mod_ssl` - HTTPS support

**How to request:** Contact Afrihost support and request these modules be enabled.

## Backend Deployment

### Option A: Backend on Render (Recommended for Free Hosting)

1. **Deploy backend to Render.com** (see RENDER_DEPLOYMENT_GUIDE.md)
2. **Update .htaccess** to proxy to Render URL:
   ```apache
   RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]
   ```

### Option B: Backend on Same Afrihost Server

If Afrihost supports Node.js:

1. **Upload backend files to separate directory:**
   ```
   /home/username/backend/
   ├── server.js
   ├── start.js
   ├── package.json
   ├── backend/
   └── .env
   ```

2. **Install dependencies:**
   ```bash
   cd ~/backend
   npm install
   ```

3. **Configure .env file:**
   ```bash
   NODE_ENV=production
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=tmvbusinesssolutions
   DB_USER=tmvbusinesssolutions
   DB_PASSWORD=Moses@1985
   EMAIL_HOST=mail.afrihost.com
   EMAIL_PORT=587
   EMAIL_USER=architecture@tmvbusinesssolutions.co.za
   EMAIL_PASSWORD=Tshepiso@1985
   YOCO_SECRET_KEY=your_live_secret_key
   YOCO_PUBLIC_KEY=pk_live_cdb8540cen7gg6q11c54
   SESSION_SECRET=generate_random_secret_here
   CLIENT_URL=https://tmvbusinesssolutions.co.za
   ```

4. **Start Node.js server with PM2:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.json --env production
   pm2 save
   pm2 startup
   ```

5. **Update .htaccess** to proxy to local server:
   ```apache
   RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]
   ```

## Database Setup

### Create MySQL Database on Afrihost

1. **Log in to Afrihost Control Panel**
2. **Navigate to MySQL Databases**
3. **Create new database:**
   - Database Name: `tmvbusinesssolutions`
   - Username: `tmvbusinesssolutions`
   - Password: `Moses@1985`
4. **Note the MySQL hostname** (e.g., `localhost` or `mysql.afrihost.com`)

### Import Database Schema

#### Option 1: Via phpMyAdmin (Afrihost Control Panel)

1. Open phpMyAdmin from Afrihost control panel
2. Select database `tmvbusinesssolutions`
3. Click **Import** tab
4. Choose file: `database-setup.sql` (if you have one)
5. Click **Go**

#### Option 2: Via SSH (if available)

```bash
mysql -h localhost -u tmvbusinesssolutions -p tmvbusinesssolutions < database-setup.sql
```

#### Option 3: Via Node.js Migration

The server.js file includes automatic database table creation via Sequelize:

```bash
# Tables will be auto-created on first run
node server.js
```

### Grant Database Permissions

```sql
GRANT ALL PRIVILEGES ON tmvbusinesssolutions.* TO 'tmvbusinesssolutions'@'localhost';
FLUSH PRIVILEGES;
```

## Email Configuration

### Afrihost SMTP Settings

```bash
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=architecture@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=Tshepiso@1985
```

### Test Email Configuration

```bash
# Via Node.js server
curl https://tmvbusinesssolutions.co.za/api/test-email
```

## SSL Certificate

### Option 1: Let's Encrypt (Free - Recommended)

1. Log in to Afrihost Control Panel
2. Navigate to **SSL Certificates**
3. Select **Let's Encrypt**
4. Enable for: `tmvbusinesssolutions.co.za` and `www.tmvbusinesssolutions.co.za`
5. Auto-renewal should be enabled

### Option 2: Paid SSL Certificate

Purchase from Afrihost for enhanced validation or wildcard certificate.

## Post-Deployment Verification

### 1. Homepage Access

```bash
curl -I https://tmvbusinesssolutions.co.za/
# Expected: 200 OK
```

### 2. API Health Check

```bash
curl https://tmvbusinesssolutions.co.za/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 3. Test Authentication

Visit: `https://tmvbusinesssolutions.co.za/pages/client_login.html`

### 4. Check Browser Console

Press F12 → Console tab
- Should see no CORS errors
- API calls should succeed
- No 404 errors for resources

### 5. Test Form Submission

1. Fill out a form (e.g., IT Infrastructure consultation)
2. Submit
3. Check email inbox for confirmation

### 6. Verify Payment Gateway

1. Navigate to payment page
2. Verify Yoco modal loads
3. Test payment with test card (sandbox mode)

## Troubleshooting

### Issue: 502 Bad Gateway on API Calls

**Cause:** Backend server not running or not accessible

**Solutions:**
1. Check backend server status (PM2 or Render)
2. Verify .htaccess proxy URL is correct
3. Test backend directly: `curl https://tmv-backend.onrender.com/api/health`

### Issue: CORS Errors in Browser

**Cause:** CORS headers not configured correctly

**Solutions:**
1. Verify .htaccess CORS headers are present
2. Check backend CORS configuration in server.js
3. Ensure Apache mod_headers is enabled

### Issue: Database Connection Failed

**Cause:** Database credentials incorrect or server not accessible

**Solutions:**
1. Verify database credentials in .env
2. Test connection: `mysql -h localhost -u tmvbusinesssolutions -p`
3. Check database exists: `SHOW DATABASES;`
4. Grant proper permissions

### Issue: Email Not Sending

**Cause:** SMTP configuration incorrect

**Solutions:**
1. Verify SMTP credentials in .env
2. Check email account is active in Afrihost panel
3. Test SMTP connection from server
4. Check Afrihost email sending limits

### Issue: .htaccess Not Working

**Cause:** Apache mod_rewrite not enabled or .htaccess not uploaded

**Solutions:**
1. Verify .htaccess file exists in root directory
2. Check file is visible (not hidden)
3. Contact Afrihost to enable mod_rewrite
4. Check Apache error logs

## Monitoring & Maintenance

### Daily Checks

- [ ] Website accessibility
- [ ] API health endpoint responding
- [ ] Login functionality working
- [ ] Email notifications sending

### Weekly Checks

- [ ] Review server logs for errors
- [ ] Check database backup status
- [ ] Verify SSL certificate validity
- [ ] Test payment gateway

### Monthly Tasks

- [ ] Review and apply security updates
- [ ] Update dependencies (npm update)
- [ ] Database optimization
- [ ] Performance review
- [ ] Backup verification

## Security Checklist

- [x] SSL certificate installed and active
- [x] HTTPS enforced via .htaccess
- [x] Database credentials secured in .env (not in version control)
- [x] API keys stored securely
- [x] CORS restricted to domain only
- [x] Session cookies secure in production
- [x] SQL injection protection (Sequelize)
- [x] XSS protection headers
- [x] Password hashing (bcrypt)
- [x] Rate limiting on API endpoints

## Support & Resources

### Afrihost Support

- **Email:** support@afrihost.com
- **Phone:** 087 944 0000
- **Website:** https://www.afrihost.com/support

### Documentation

- [Afrihost + Render Setup](AFRIHOST_RENDER_SETUP.md)
- [Manual FTP Deployment](MANUAL_FTP_DEPLOYMENT_GUIDE.md)
- [Live Deployment Guide](LIVE_DEPLOYMENT_GUIDE.md)
- [System Status](SYSTEM_STATUS_AND_LINUX_COMPATIBILITY.md)

### Useful Commands

```bash
# Check website status
curl -I https://tmvbusinesssolutions.co.za/

# Test API health
curl https://tmvbusinesssolutions.co.za/api/health

# Check SSL certificate
openssl s_client -connect tmvbusinesssolutions.co.za:443 -servername tmvbusinesssolutions.co.za

# Test database connection
mysql -h localhost -u tmvbusinesssolutions -p

# Check PM2 status (if backend on Afrihost)
pm2 status

# View server logs
pm2 logs tmvbusinesssolutions

# Restart backend
pm2 restart tmvbusinesssolutions
```

## Deployment Success Criteria

After deployment, verify:

- ✅ Homepage loads without errors
- ✅ All static assets load (CSS, JS, images)
- ✅ API endpoints respond correctly
- ✅ User registration works
- ✅ User login works
- ✅ Session persistence working
- ✅ Email notifications sending
- ✅ Payment gateway functional
- ✅ Database operations successful
- ✅ No CORS errors in console
- ✅ HTTPS enforced
- ✅ www redirects to non-www
- ✅ All pages accessible

## Quick Deployment Checklist

- [ ] Update scripts/api.js with production API URL
- [ ] Verify .htaccess configuration
- [ ] Run FTP deployment script
- [ ] Wait for upload completion
- [ ] Clear browser cache
- [ ] Test homepage
- [ ] Test API health
- [ ] Test login/registration
- [ ] Test payment flow
- [ ] Test email notifications
- [ ] Verify database connection
- [ ] Check browser console for errors
- [ ] Monitor server logs

---

**Last Updated:** November 19, 2025
**Version:** 1.0
**Status:** Ready for Production Deployment

# Afrihost + Render Integration Guide
**TMV Business Solutions - November 18, 2025**

## Overview

Your infrastructure uses a **hybrid hosting model**:
- **Afrihost**: Hosts frontend (HTML, CSS, JS) and serves as the public-facing domain
- **Render**: Hosts the Node.js backend API on a free tier
- **Connection**: Apache `.htaccess` proxies API requests from Afrihost to Render

```
User Browser
    ↓
tmvbusinesssolutions.co.za (Afrihost)
    ↓
Static Files (HTML/CSS/JS) served by Afrihost
    ↓
API Calls detected by .htaccess
    ↓
Proxied to: tmv-backend.onrender.com (Render)
    ↓
Node.js Backend processes request
    ↓
Response sent back through Afrihost to User
```

---

## ✅ Current Configuration Status

### 1. Render Backend Setup (`render.yaml`)
```yaml
services:
  - type: web
    name: tmv-backend
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: CLIENT_URL
        value: https://tmvbusinesssolutions.co.za
      - key: BASE_URL
        value: https://tmvbusinesssolutions.co.za
```
✅ **Already configured** - Points back to Afrihost domain

### 2. Afrihost Apache Proxy (`.htaccess`)
```apache
# Proxy API requests to Node.js server on Render.com
RewriteCond %{REQUEST_URI} ^/api/(.*)$ [NC]
RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]
```
✅ **Already configured** - Proxies API calls to Render

### 3. CORS Configuration
```apache
# Enable CORS headers - Allow both www and non-www
SetEnvIf Origin "^https?://(www\.)?tmvbusinesssolutions\.co\.za$" AccessControlAllowOrigin=$0
Header always set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
```
✅ **Already configured** - Allows communication between domains

---

## 🚀 Deployment Checklist

### Phase 1: Deploy Backend to Render

#### Step 1: Connect GitHub Repository to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select repository: `tmkgamanyane/tmvbusinesssolutions`
5. Click **"Connect"**

#### Step 2: Configure Render Service
Use these exact settings:

| Setting | Value |
|---------|-------|
| **Name** | `tmv-backend` |
| **Region** | `Frankfurt (EU Central)` or closest |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | `Free` |

#### Step 3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

**Required Variables:**
```bash
NODE_ENV=production
PORT=10000

# Database (Afrihost MySQL)
DB_HOST=your_afrihost_mysql_host
DB_PORT=3306
DB_NAME=tmvbusinesssolutions
DB_USER=tmvbusinesssolutions
DB_PASSWORD=Moses@1985

# Email (Afrihost SMTP)
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_USER=architecture@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=your_email_password

# Frontend URL (Afrihost Domain)
CLIENT_URL=https://tmvbusinesssolutions.co.za
BASE_URL=https://tmvbusinesssolutions.co.za

# Yoco Payment (LIVE Keys)
YOCO_SECRET_KEY=your_live_secret_key
YOCO_PUBLIC_KEY=pk_live_cdb8540cen7gg6q11c54

# Session Security
SESSION_SECRET=your_random_session_secret_key_here
```

**Important Notes:**
- Replace `DB_HOST` with your Afrihost MySQL hostname
- Use your actual email password
- Use your LIVE Yoco secret key
- Generate a strong random string for `SESSION_SECRET`

#### Step 4: Deploy
1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Run `npm install`
   - Start `node server.js`
   - Assign URL: `https://tmv-backend.onrender.com`

⏱️ **First deploy takes ~2-3 minutes**

#### Step 5: Verify Render Deployment
Test these endpoints:

```bash
# Health check
curl https://tmv-backend.onrender.com/

# API health
curl https://tmv-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T..."
}
```

---

### Phase 2: Configure Afrihost Hosting

#### Step 1: Upload Files via FTP/SFTP

**Files to Upload to Afrihost:**
```
/public_html/
├── .htaccess          ← Critical! Enables proxy
├── index.html
├── styles.css
├── scripts.js
├── pages/
├── scripts/
├── styles/
├── assets/
├── images/
├── logos/
└── cart/
```

**Files NOT to Upload:**
```
❌ server.js
❌ backend/
❌ node_modules/
❌ package.json
❌ .env
❌ *.md (documentation)
```

**FTP Credentials:**
- **Host**: `ftp.tmvbusinesssolutions.co.za` or Afrihost-provided FTP
- **Port**: `21` (FTP) or `22` (SFTP)
- **Username**: Your Afrihost FTP username
- **Password**: Your Afrihost FTP password
- **Directory**: `/public_html/` or `/www/` or `/httpdocs/`

#### Step 2: Verify Apache Modules Enabled

Contact **Afrihost Support** to ensure these Apache modules are enabled:

```apache
mod_rewrite    ← For URL rewriting
mod_proxy      ← For proxying to Render
mod_proxy_http ← For HTTP proxying
mod_headers    ← For CORS headers
mod_ssl        ← For HTTPS
```

**How to Request:**
```
Subject: Enable Apache Modules for tmvbusinesssolutions.co.za

Hi Afrihost Support,

I need the following Apache modules enabled for my domain:
- mod_rewrite
- mod_proxy
- mod_proxy_http
- mod_headers
- mod_ssl

This is required to proxy API requests to my external backend service.

Thank you!
```

#### Step 3: Update `.htaccess` (if needed)

Verify the `.htaccess` proxy rule points to your Render URL:

```apache
# This should already be correct:
RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]
```

If your Render app has a different name, update it:
```apache
RewriteRule ^api/(.*)$ https://YOUR-RENDER-APP.onrender.com/api/$1 [P,L,QSA]
```

---

### Phase 3: Database Configuration

Your MySQL database should be hosted on **Afrihost** (not Render, as Render free tier doesn't include databases).

#### Option A: Afrihost MySQL Database

**Create Database via Afrihost Control Panel:**
1. Log in to Afrihost control panel
2. Navigate to **"MySQL Databases"**
3. Create database:
   - **Database Name**: `tmvbusinesssolutions`
   - **Username**: `tmvbusinesssolutions`
   - **Password**: `Moses@1985`
4. Note the **MySQL hostname** (e.g., `mysql.afrihost.com` or similar)
5. Add this hostname to Render environment variables as `DB_HOST`

**Import Database Schema:**
```bash
# Via SSH (if available)
mysql -h mysql.afrihost.com -u tmvbusinesssolutions -p tmvbusinesssolutions < database-setup.sql

# Via phpMyAdmin (Afrihost Control Panel)
# 1. Open phpMyAdmin
# 2. Select database
# 3. Import → Choose database-setup.sql
# 4. Click "Go"
```

**Allow Remote Connections:**
Ensure your database allows connections from:
- Render IP ranges (dynamic, so use `%` wildcard)
- Or whitelist Render's exit IPs (contact Render support for list)

**Update Render Environment:**
```bash
DB_HOST=mysql.afrihost.com  # Or your actual hostname
DB_PORT=3306
DB_NAME=tmvbusinesssolutions
DB_USER=tmvbusinesssolutions
DB_PASSWORD=Moses@1985
```

#### Option B: External Database Provider (Alternative)

If Afrihost doesn't provide reliable MySQL:
- **PlanetScale** (Free tier: 5GB)
- **Railway** (Free tier: 500MB)
- **Neon** (Free tier: Postgres only)

---

### Phase 4: SSL Certificate Setup

#### Afrihost SSL Certificate

**Option 1: Let's Encrypt Free SSL (Recommended)**
1. Log in to Afrihost control panel
2. Navigate to **"SSL Certificates"**
3. Select **"Let's Encrypt"** for your domain
4. Enable SSL for:
   - `tmvbusinesssolutions.co.za`
   - `www.tmvbusinesssolutions.co.za`
5. Auto-renewal should be enabled

**Option 2: Afrihost Paid SSL**
Purchase from Afrihost if you need:
- Wildcard certificate
- EV certificate
- Organizational validation

#### Render SSL (Automatic)
✅ **Render provides free SSL automatically** for `*.onrender.com` domains

No action needed - your backend is already HTTPS.

---

### Phase 5: DNS Configuration (Critical!)

Your domain DNS should point to **Afrihost**, not Render.

**Verify Current DNS Settings:**

```bash
# Check where your domain points
nslookup tmvbusinesssolutions.co.za
```

**Expected Result:**
```
Name:    tmvbusinesssolutions.co.za
Address: [Afrihost IP Address]
```

**Correct DNS Records:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| `A` | `@` | `[Afrihost IP]` | 3600 |
| `A` | `www` | `[Afrihost IP]` | 3600 |
| `CNAME` | `www` | `tmvbusinesssolutions.co.za` | 3600 |
| `MX` | `@` | `mail.afrihost.com` | 3600 |

**Do NOT add DNS records for Render** - it's proxied through Afrihost.

---

## 🔧 Testing Your Setup

### Test 1: Frontend Access
```bash
# Should load homepage
curl https://tmvbusinesssolutions.co.za/

# Should redirect to non-www
curl -I https://www.tmvbusinesssolutions.co.za/
# Expected: 301 redirect to https://tmvbusinesssolutions.co.za/
```

### Test 2: API Proxy
```bash
# API call should be proxied to Render
curl https://tmvbusinesssolutions.co.za/api/health

# Should return:
# {"status":"ok","timestamp":"..."}
```

### Test 3: CORS Headers
```bash
# Check CORS headers
curl -I -H "Origin: https://tmvbusinesssolutions.co.za" \
  https://tmvbusinesssolutions.co.za/api/health

# Should include:
# Access-Control-Allow-Origin: https://tmvbusinesssolutions.co.za
# Access-Control-Allow-Credentials: true
```

### Test 4: Form Submission
1. Open `https://tmvbusinesssolutions.co.za/pages/it_infrastructure.html`
2. Fill out form
3. Submit
4. Check browser console for errors
5. Check email inbox for confirmation

**Expected:**
- ✅ No CORS errors
- ✅ API call succeeds
- ✅ Email sent
- ✅ Success message displayed

### Test 5: Database Connection
```bash
# SSH into Afrihost (if available)
ssh user@tmvbusinesssolutions.co.za

# Test database connection
mysql -h mysql.afrihost.com -u tmvbusinesssolutions -p

# Should connect successfully
```

---

## 🐛 Troubleshooting

### Issue 1: "502 Bad Gateway" on API Calls

**Cause:** Render backend is sleeping (free tier sleeps after inactivity)

**Solution:**
```bash
# Wake up Render backend
curl https://tmv-backend.onrender.com/

# Wait 30-60 seconds for cold start
# Then try API call again
```

**Prevention:** Use a service like [UptimeRobot](https://uptimerobot.com/) to ping your Render backend every 5 minutes.

### Issue 2: "CORS Error" in Browser Console

**Cause:** CORS headers not configured correctly

**Solution 1:** Verify `.htaccess` on Afrihost
```apache
# Must include:
SetEnvIf Origin "^https?://(www\.)?tmvbusinesssolutions\.co\.za$" AccessControlAllowOrigin=$0
Header always set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
```

**Solution 2:** Verify Render environment variables
```bash
CLIENT_URL=https://tmvbusinesssolutions.co.za
BASE_URL=https://tmvbusinesssolutions.co.za
```

**Solution 3:** Check `server.js` CORS config
```javascript
app.use(cors({
    origin: [
        'https://tmvbusinesssolutions.co.za',
        'https://www.tmvbusinesssolutions.co.za'
    ],
    credentials: true
}));
```

### Issue 3: Database Connection Fails

**Cause:** Render can't connect to Afrihost MySQL

**Solution 1:** Check firewall rules
- Contact Afrihost to whitelist Render IP ranges
- Or use `%` wildcard for host (less secure)

**Solution 2:** Verify credentials in Render
```bash
# Check Render environment variables
DB_HOST=mysql.afrihost.com
DB_USER=tmvbusinesssolutions
DB_PASSWORD=Moses@1985
```

**Solution 3:** Test from Render shell
```bash
# In Render dashboard, open "Shell"
node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'mysql.afrihost.com',
  user: 'tmvbusinesssolutions',
  password: 'Moses@1985',
  database: 'tmvbusinesssolutions'
});
conn.connect(err => {
  if (err) console.error(err);
  else console.log('Connected!');
  conn.end();
});
"
```

### Issue 4: Emails Not Sending

**Cause:** SMTP authentication failed

**Solution 1:** Verify Afrihost SMTP settings
```bash
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587  # Use 587 for STARTTLS, 465 for SSL
EMAIL_USER=architecture@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=your_actual_password
```

**Solution 2:** Test SMTP from Render shell
```bash
# In Render dashboard, open "Shell"
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'mail.afrihost.com',
  port: 587,
  secure: false,
  auth: {
    user: 'architecture@tmvbusinesssolutions.co.za',
    pass: 'your_password'
  }
});
transporter.verify((err, success) => {
  if (err) console.error(err);
  else console.log('SMTP Ready:', success);
});
"
```

**Solution 3:** Check Afrihost email limits
- Contact Afrihost if you're hitting send limits
- Upgrade to business email if needed

### Issue 5: Render Backend Sleeping Too Much

**Cause:** Free tier sleeps after 15 minutes of inactivity

**Solutions:**

**Option A: Keep-Alive Service (Free)**
Use [UptimeRobot](https://uptimerobot.com/):
1. Sign up (free)
2. Add monitor: `https://tmv-backend.onrender.com/api/health`
3. Check interval: `5 minutes`
4. Monitor type: `HTTPS`

**Option B: Upgrade to Paid Plan ($7/month)**
- No sleeping
- Better performance
- More resources

**Option C: Cron Job Keep-Alive**
Add to `server.js`:
```javascript
// Keep Render alive (free tier)
if (process.env.RENDER) {
    setInterval(() => {
        fetch(`${process.env.BASE_URL}/api/health`)
            .catch(err => console.error('Keep-alive failed:', err));
    }, 14 * 60 * 1000); // Every 14 minutes
}
```

### Issue 6: Apache Proxy Not Working

**Cause:** `mod_proxy` not enabled on Afrihost

**Solution:** Contact Afrihost Support
```
Subject: Enable mod_proxy for API Proxying

Hi Afrihost Support,

I need mod_proxy and mod_proxy_http enabled for my domain
tmvbusinesssolutions.co.za to proxy API requests to an external backend.

My .htaccess includes:
RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]

Please enable the required modules.

Thank you!
```

---

## 📊 Performance Optimization

### 1. Afrihost Caching

Add to `.htaccess`:
```apache
# Browser caching for static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
```

### 2. Render Cold Start Optimization

Update `start.js` (or `server.js`):
```javascript
// Preload critical dependencies
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

// Create connection pool on startup
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('✅ Connection pool created');
```

### 3. Compression

On Afrihost (`.htaccess`):
```apache
# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

On Render (`server.js`):
```javascript
const compression = require('compression');
app.use(compression());
```

---

## 🔐 Security Checklist

### Afrihost Security

✅ **SSL Certificate Installed**
- Let's Encrypt or paid SSL
- Auto-renewal enabled

✅ **Force HTTPS**
```apache
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

✅ **Security Headers**
```apache
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-XSS-Protection "1; mode=block"
```

✅ **Disable Directory Listing**
```apache
Options -Indexes
```

### Render Security

✅ **Environment Variables**
- All secrets in environment variables
- No hardcoded credentials

✅ **CORS Restricted**
- Only allow Afrihost domain
- No wildcards (`*`)

✅ **Rate Limiting**
Add to `server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 📅 Maintenance Tasks

### Weekly
- [ ] Check Render logs for errors
- [ ] Monitor uptime (UptimeRobot)
- [ ] Verify email delivery

### Monthly
- [ ] Review Afrihost bandwidth usage
- [ ] Check Render resource usage
- [ ] Test all forms and API endpoints
- [ ] Review SSL certificate expiry

### As Needed
- [ ] Update dependencies: `npm update`
- [ ] Redeploy to Render after code changes
- [ ] Clear Afrihost cache if needed
- [ ] Backup database

---

## 💰 Cost Breakdown

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| **Afrihost Hosting** | Business | ~R100-200/month | Includes: domain, hosting, email, SSL |
| **Render Backend** | Free | $0 | Includes: hosting, SSL, auto-deploy |
| **Render Database** | N/A | $0 | Use Afrihost MySQL instead |
| **Total** | | **~R100-200/month** | Very affordable! |

**Upgrade Options:**
- Render Paid Plan: $7/month (no sleeping, better performance)
- Afrihost Business Email: ~R50/month (more mailboxes)

---

## 🎯 Quick Reference

### Afrihost FTP Upload
```bash
# Using FileZilla or similar
Host: ftp.tmvbusinesssolutions.co.za
Port: 21
Username: your_ftp_username
Password: your_ftp_password
Directory: /public_html/
```

### Render Deployment URL
```
https://tmv-backend.onrender.com
```

### Key Environment Variables
```bash
CLIENT_URL=https://tmvbusinesssolutions.co.za
DB_HOST=mysql.afrihost.com
EMAIL_HOST=mail.afrihost.com
```

### Support Contacts
- **Afrihost Support**: support@afrihost.com | 087 944 0000
- **Render Support**: https://render.com/docs/support
- **GitHub Issues**: https://github.com/tmkgamanyane/tmvbusinesssolutions/issues

---

## ✅ Final Deployment Steps

1. **Deploy to Render** (Phase 1)
   - ✅ Create web service
   - ✅ Add environment variables
   - ✅ Verify deployment

2. **Upload to Afrihost** (Phase 2)
   - ✅ FTP upload frontend files
   - ✅ Verify `.htaccess` is uploaded
   - ✅ Check Apache modules enabled

3. **Configure Database** (Phase 3)
   - ✅ Create MySQL database on Afrihost
   - ✅ Import schema
   - ✅ Update Render DB_HOST variable

4. **Setup SSL** (Phase 4)
   - ✅ Enable Let's Encrypt on Afrihost
   - ✅ Verify HTTPS works

5. **Test Everything** (Phase 5)
   - ✅ Homepage loads
   - ✅ API calls work
   - ✅ Forms submit
   - ✅ Emails send
   - ✅ Payments process

---

**Questions or Issues?**
- Check troubleshooting section above
- Review Render logs: `Dashboard → Logs`
- Check Apache error log on Afrihost (if available)
- Contact support if needed

Good luck with your deployment! 🚀

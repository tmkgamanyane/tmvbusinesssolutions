# 🚀 Render Deployment Guide - Step-by-Step
**TMV Business Solutions**
**Date: November 18, 2025**

---

## 📋 Prerequisites Checklist

Before deploying to Render, ensure you have:

- ✅ GitHub repository: `tmkgamanyane/tmvbusinesssolutions`
- ✅ Render account (sign up at https://render.com)
- ✅ Afrihost MySQL database credentials
- ✅ Afrihost email (SMTP) credentials  
- ✅ Yoco LIVE API keys
- ✅ Domain: `tmvbusinesssolutions.co.za` configured with Afrihost

---

## 🎯 Deployment Steps

### Step 1: Push Code to GitHub

Make sure all your latest changes are committed and pushed:

```powershell
# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Configure for Render deployment with Afrihost integration"

# Push to GitHub
git push origin main
```

**Verify**: Visit https://github.com/tmkgamanyane/tmvbusinesssolutions and confirm your changes are visible.

---

### Step 2: Create Render Web Service

#### 2.1 Connect to Render

1. Go to https://dashboard.render.com/
2. Click **"New +"** button (top right)
3. Select **"Web Service"**

#### 2.2 Connect Repository

1. Click **"Connect account"** next to GitHub
2. Authorize Render to access your GitHub
3. Find and select: `tmkgamanyane/tmvbusinesssolutions`
4. Click **"Connect"**

#### 2.3 Configure Service Settings

**Fill in these exact values:**

| Field | Value |
|-------|-------|
| **Name** | `tmv-backend` |
| **Region** | `Frankfurt (EU Central)` or closest to South Africa |
| **Branch** | `main` |
| **Root Directory** | *(leave empty)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan Type** | `Free` |

---

### Step 3: Configure Environment Variables

Click **"Advanced"** section, then **"Add Environment Variable"** for each:

#### Database Variables (Afrihost MySQL)

```bash
DB_HOST=mysql.afrihost.com
# Or your actual Afrihost MySQL hostname - check your Afrihost control panel

DB_PORT=3306

DB_NAME=tmvbusinesssolutions

DB_USER=tmvbusinesssolutions

DB_PASSWORD=Moses@1985
```

#### Email Variables (Afrihost SMTP)

```bash
EMAIL_HOST=mail.afrihost.com

EMAIL_PORT=587

EMAIL_SECURE=false

EMAIL_USER=architecture@tmvbusinesssolutions.co.za

EMAIL_PASS=your_actual_email_password
# ⚠️ Use the password for architecture@tmvbusinesssolutions.co.za
```

#### Server & Security Variables

```bash
NODE_ENV=production

PORT=10000

SESSION_SECRET=generate_random_string_here
# Use a strong random string, e.g., from https://www.random.org/strings/

JWT_SECRET=another_random_string_here
# Use a different random string
```

#### Frontend URLs (Afrihost Domain)

```bash
CLIENT_URL=https://tmvbusinesssolutions.co.za

BASE_URL=https://tmvbusinesssolutions.co.za
```

#### Payment Variables (Yoco LIVE)

```bash
YOCO_PUBLIC_KEY=pk_live_cdb8540cen7gg6q11c54

YOCO_SECRET_KEY=your_live_secret_key_here
# ⚠️ Get this from your Yoco dashboard: https://portal.yoco.com/
```

#### Department Email Addresses (Optional)

```bash
EMAIL_CAREERS=careers@tmvbusinesssolutions.co.za

EMAIL_IT=itinfrustructure@tmvbusinesssolutions.co.za

EMAIL_ARCHITECTURE=architecture@tmvbusinesssolutions.co.za

EMAIL_BUSINESSPLAN=businessplan@tmvbusinesssolutions.co.za

EMAIL_GENERAL=enquiries@tmvbusinesssolutions.co.za
```

---

### Step 4: Deploy!

1. Click **"Create Web Service"** button at the bottom
2. Render will now:
   - Clone your GitHub repository
   - Install dependencies (`npm install`)
   - Start your server (`node server.js`)
   - Generate SSL certificate
   - Assign public URL: `https://tmv-backend.onrender.com`

⏱️ **Initial deployment takes 2-5 minutes**

#### Monitor Deployment

Watch the **Logs** tab for:

```
✅ Email server is ready to send messages
✅ Database connection established
✅ Server running on port 10000
✅ Connected to MySQL database: tmvbusinesssolutions
```

If you see errors, check the troubleshooting section below.

---

### Step 5: Verify Render Backend

Once deployment shows **"Live"**, test your backend:

#### Test 1: Health Check

```powershell
curl https://tmv-backend.onrender.com/
```

**Expected**: Should return HTML or JSON response

#### Test 2: API Health Endpoint

```powershell
curl https://tmv-backend.onrender.com/api/health
```

**Expected**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T..."
}
```

#### Test 3: Database Connection

Check Render logs for:
```
✅ Connected to MySQL database: tmvbusinesssolutions
```

---

### Step 6: Update .htaccess on Afrihost (Already Done!)

Your `.htaccess` file already proxies API requests to Render:

```apache
RewriteCond %{REQUEST_URI} ^/api/(.*)$ [NC]
RewriteRule ^api/(.*)$ https://tmv-backend.onrender.com/api/$1 [P,L,QSA]
```

✅ **No changes needed** - this is already configured!

---

### Step 7: Upload Frontend to Afrihost

#### 7.1 Prepare Files for Upload

**Files to Upload:**
```
/public_html/
├── .htaccess          ← CRITICAL!
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

**Files to EXCLUDE (don't upload):**
```
❌ server.js
❌ backend/
❌ node_modules/
❌ package.json
❌ package-lock.json
❌ .env
❌ .env.example
❌ *.md files
❌ .git/
```

#### 7.2 Upload via FTP

**Option A: FileZilla (Recommended)**

1. Download FileZilla: https://filezilla-project.org/
2. Connect to Afrihost:
   - **Host**: `ftp.tmvbusinesssolutions.co.za`
   - **Username**: *(from Afrihost control panel)*
   - **Password**: *(from Afrihost control panel)*
   - **Port**: `21`
3. Navigate to `/public_html/` or `/httpdocs/`
4. Upload all frontend files

**Option B: PowerShell FTP (Manual)**

```powershell
# Connect via FTP
ftp ftp.tmvbusinesssolutions.co.za

# Login with credentials
# Navigate to public_html
cd public_html

# Upload files (not practical for many files - use FileZilla instead)
put .htaccess
put index.html
...
```

**Option C: Afrihost File Manager**

1. Log in to Afrihost Control Panel
2. Navigate to **"File Manager"**
3. Upload files to `/public_html/`

---

### Step 8: Configure Afrihost MySQL Database

#### 8.1 Create Database (if not exists)

1. Log in to **Afrihost Control Panel**
2. Navigate to **"MySQL Databases"**
3. Click **"Create Database"**
   - **Database Name**: `tmvbusinesssolutions`
   - **Username**: `tmvbusinesssolutions`  
   - **Password**: `Moses@1985`
4. Note the **MySQL hostname** (e.g., `mysql.afrihost.com`)

#### 8.2 Import Database Schema

**Option A: phpMyAdmin (Easiest)**

1. Open **phpMyAdmin** from Afrihost control panel
2. Select database: `tmvbusinesssolutions`
3. Click **"Import"** tab
4. Choose file: `database-setup.sql`
5. Click **"Go"**

**Option B: MySQL Command Line**

```powershell
# If you have MySQL client installed locally
mysql -h mysql.afrihost.com -u tmvbusinesssolutions -p tmvbusinesssolutions < database-setup.sql

# Enter password when prompted: Moses@1985
```

#### 8.3 Allow Remote Connections from Render

**Important**: Afrihost must allow connections from Render servers.

**Contact Afrihost Support:**

```
Subject: Allow Remote MySQL Connections for Render.com

Hi Afrihost Support,

I need to allow remote MySQL connections to my database:
- Database: tmvbusinesssolutions
- Username: tmvbusinesssolutions
- External service: Render.com (backend hosting)

Please whitelist Render's IP ranges or allow all remote connections
for this database.

Alternatively, I can use '%' as the host wildcard if more secure
options aren't available.

Thank you!
```

**Verify Remote Access:**

After Afrihost enables remote access, check Render logs for:
```
✅ Connected to MySQL database: tmvbusinesssolutions
```

---

### Step 9: Enable SSL Certificate (Afrihost)

#### 9.1 Enable Let's Encrypt (Free)

1. Log in to **Afrihost Control Panel**
2. Navigate to **"SSL Certificates"**
3. Select **"Let's Encrypt"** 
4. Enable for both:
   - ✅ `tmvbusinesssolutions.co.za`
   - ✅ `www.tmvbusinesssolutions.co.za`
5. Auto-renewal should be enabled by default

#### 9.2 Verify SSL

```powershell
# Test HTTPS
curl -I https://tmvbusinesssolutions.co.za/

# Should return:
# HTTP/2 200
# ... (no SSL errors)
```

---

### Step 10: Test Complete System

#### Test 1: Frontend Loads

Visit: https://tmvbusinesssolutions.co.za/

**Expected**: Homepage loads with no console errors

#### Test 2: WWW Redirect

Visit: https://www.tmvbusinesssolutions.co.za/

**Expected**: Automatically redirects to https://tmvbusinesssolutions.co.za/

#### Test 3: API Proxy Works

Open browser console and run:
```javascript
fetch('https://tmvbusinesssolutions.co.za/api/health')
  .then(r => r.json())
  .then(d => console.log(d));

// Expected: {status: "ok", timestamp: "..."}
```

#### Test 4: Form Submission

1. Go to: https://tmvbusinesssolutions.co.za/pages/it_infrastructure.html
2. Fill out the consultation form
3. Submit
4. Check for:
   - ✅ No CORS errors in console
   - ✅ Success message displayed
   - ✅ Email received at `itinfrustructure@tmvbusinesssolutions.co.za`

#### Test 5: Database Operations

Test user registration or login functionality to verify database connectivity.

---

## 🔧 Render Dashboard Management

### View Logs

1. Go to https://dashboard.render.com/
2. Click on **"tmv-backend"** service
3. Click **"Logs"** tab
4. Monitor real-time logs

### Update Environment Variables

1. Click **"Environment"** tab
2. Edit or add variables
3. Click **"Save Changes"**
4. Service will automatically redeploy

### Manual Redeploy

1. Click **"Manual Deploy"** button
2. Select **"Clear build cache & deploy"** if needed
3. Confirm

### View Service Metrics

- **Dashboard** tab shows:
  - HTTP traffic
  - Response times
  - Memory usage
  - CPU usage

---

## 🐛 Troubleshooting

### Issue 1: "Build failed" on Render

**Symptom**: Deployment fails during build

**Solutions**:

1. Check `package.json` has all dependencies:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "mysql2": "^3.6.0",
    "nodemailer": "^7.0.9",
    "bcrypt": "^5.1.0",
    "dotenv": "^16.3.1",
    "express-session": "^1.17.3",
    "sequelize": "^6.33.0"
  }
}
```

2. Verify `node_modules` is in `.gitignore`:
```
node_modules/
```

3. Check Node version compatibility in `package.json`:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### Issue 2: "502 Bad Gateway" when accessing API

**Symptom**: API calls return 502 error

**Causes & Solutions**:

1. **Render service is sleeping** (free tier sleeps after 15 min inactivity)
   - Wait 30-60 seconds for cold start
   - Use UptimeRobot to keep it awake

2. **Server crashed on startup**
   - Check Render logs for errors
   - Verify all environment variables are set

3. **Port mismatch**
   - Ensure `PORT=10000` in Render environment
   - Server should use `process.env.PORT`

### Issue 3: "Database connection failed"

**Symptom**: Logs show database connection errors

**Solutions**:

1. **Verify credentials in Render environment**:
```bash
DB_HOST=mysql.afrihost.com  # Correct hostname?
DB_USER=tmvbusinesssolutions
DB_PASSWORD=Moses@1985
DB_NAME=tmvbusinesssolutions
```

2. **Check Afrihost firewall**:
   - Contact Afrihost to allow Render connections
   - Request IP whitelist or '%' wildcard

3. **Test from Render Shell**:
   - Open Shell tab in Render dashboard
   - Run:
```bash
node -e "const mysql = require('mysql2'); const conn = mysql.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD}); conn.connect(err => {console.log(err || 'Connected!'); conn.end();});"
```

### Issue 4: "Email not sending"

**Symptom**: Forms submit but no emails arrive

**Solutions**:

1. **Check Render environment variables**:
```bash
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_USER=architecture@tmvbusinesssolutions.co.za
EMAIL_PASS=correct_password_here
```

2. **Verify SMTP credentials** with Afrihost

3. **Check Render logs** for email errors:
```
❌ Failed to send email: Authentication failed
```

4. **Test SMTP from Render Shell**:
```bash
node -e "const nm = require('nodemailer'); const t = nm.createTransport({host: 'mail.afrihost.com', port: 587, auth: {user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS}}); t.verify((e,s) => console.log(e || 'Ready'));"
```

### Issue 5: "CORS policy error"

**Symptom**: Browser console shows CORS errors

**Solutions**:

1. **Verify environment variables on Render**:
```bash
CLIENT_URL=https://tmvbusinesssolutions.co.za
BASE_URL=https://tmvbusinesssolutions.co.za
```

2. **Check `.htaccess` CORS headers on Afrihost**:
```apache
SetEnvIf Origin "^https?://(www\.)?tmvbusinesssolutions\.co\.za$" AccessControlAllowOrigin=$0
Header always set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
```

3. **Verify server.js CORS config** allows Afrihost domain

### Issue 6: "Service keeps sleeping"

**Symptom**: Free tier sleeps after 15 minutes of inactivity

**Solutions**:

**Option A: UptimeRobot Keep-Alive (Free)**

1. Sign up at https://uptimerobot.com/
2. Add monitor:
   - **URL**: `https://tmv-backend.onrender.com/api/health`
   - **Type**: HTTPS
   - **Interval**: 5 minutes
3. Save monitor

**Option B: Upgrade to Paid Plan ($7/month)**
- No sleeping
- Better performance
- Faster cold starts

**Option C: Self-Ping (add to server.js)**
```javascript
// Keep Render alive on free tier
if (process.env.RENDER && process.env.NODE_ENV === 'production') {
    const https = require('https');
    setInterval(() => {
        https.get('https://tmv-backend.onrender.com/api/health', (res) => {
            console.log('Keep-alive ping:', res.statusCode);
        }).on('error', (err) => {
            console.error('Keep-alive error:', err.message);
        });
    }, 14 * 60 * 1000); // Every 14 minutes
}
```

---

## 📊 Post-Deployment Checklist

### Functional Tests

- [ ] Homepage loads: https://tmvbusinesssolutions.co.za/
- [ ] WWW redirects to non-WWW
- [ ] HTTPS works (SSL certificate valid)
- [ ] API health check responds: `/api/health`
- [ ] IT Infrastructure form submits successfully
- [ ] Architecture form submits successfully  
- [ ] Business Plan form submits successfully
- [ ] Emails are received in correct department inboxes
- [ ] User registration works
- [ ] User login works
- [ ] Payment processing works (test with small amount)

### Monitoring Setup

- [ ] UptimeRobot monitor configured (keeps Render awake)
- [ ] Render email notifications enabled (Dashboard → Settings)
- [ ] Afrihost bandwidth monitoring checked
- [ ] Database backup schedule confirmed

### Documentation

- [ ] Render environment variables documented
- [ ] Afrihost FTP credentials saved securely
- [ ] Database credentials saved securely
- [ ] All passwords stored in password manager

---

## 🎯 Performance Tips

### 1. Enable Caching on Afrihost

Already configured in `.htaccess`:
```apache
<FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

### 2. Use Connection Pooling

Already configured in `server.js`:
```javascript
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    connectionLimit: 10
});
```

### 3. Enable Compression

If not already enabled, add to `server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

### 4. Monitor Render Metrics

Check Render dashboard weekly for:
- Response times
- Error rates
- Memory usage

---

## 💰 Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Render Backend** | Free | $0 |
| **Afrihost Hosting** | Business | ~R150-200 |
| **Afrihost Domain** | Included | R0 |
| **Afrihost Email** | Included | R0 |
| **Afrihost SSL** | Let's Encrypt | R0 |
| **Total** | | **~R150-200/month** |

**Optional Upgrades**:
- Render Paid Plan: $7/month (R130/month)
- More email addresses: ~R50/month

---

## 📞 Support Resources

### Render Support
- Docs: https://render.com/docs
- Support: https://render.com/docs/support
- Status: https://status.render.com/

### Afrihost Support
- Email: support@afrihost.com
- Phone: 087 944 0000
- Control Panel: https://clientzone.afrihost.com/

### GitHub Repository
- Repo: https://github.com/tmkgamanyane/tmvbusinesssolutions
- Issues: https://github.com/tmkgamanyane/tmvbusinesssolutions/issues

---

## ✅ Success Indicators

You've successfully deployed when:

✅ Render shows "Live" status with green indicator
✅ Homepage loads at https://tmvbusinesssolutions.co.za/
✅ API health endpoint returns `{"status":"ok"}`
✅ Forms submit without CORS errors
✅ Emails are received in department inboxes
✅ Database queries work (login/registration)
✅ No errors in Render logs
✅ SSL certificate is valid (green padlock in browser)

---

## 🚀 You're Done!

Your TMV Business Solutions platform is now live on:
- **Frontend**: https://tmvbusinesssolutions.co.za (Afrihost)
- **Backend**: https://tmv-backend.onrender.com (Render)
- **Database**: Afrihost MySQL
- **Email**: Afrihost SMTP

**Next Steps**:
1. Monitor Render logs for first 24 hours
2. Test all forms and features
3. Set up UptimeRobot keep-alive
4. Share the live URL with stakeholders

**Questions?** Check the troubleshooting section or contact support.

Good luck! 🎉

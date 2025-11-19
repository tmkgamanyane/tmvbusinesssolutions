# Afrihost Deployment Checklist

## Phase 1: Preparation ✓

- [ ] **1. Prerequisites verified:**
  - [ ] Afrihost account with Node.js enabled
  - [ ] SSH/cPanel access confirmed
  - [ ] Domain DNS pointing to public_html
  - [ ] Yoco keys obtained (public and secret)

- [ ] **2. Environment file ready:**
  - DB_HOST=tmvbusinesssolutions.co.za
  - DB_USER=tmvbusw4e7k0_tmvbusinesssolutions
  - DB_PASSWORD=YOUR_DB_PASSWORD (fill in your password)
  - DB_NAME=tmvbusw4e7k0_tmvbusinesssolutions
  - CLIENT_URL=https://tmvbusinesssolutions.co.za
  - YOCO_SECRET_KEY=YOUR_YOCO_SECRET_KEY (get from Yoco account)
  - EMAIL_USER and EMAIL_PASSWORD configured

- [ ] **3. Files prepared locally:**
  - [ ] All project files copied to deployment directory
  - [ ] node_modules/ excluded from copy
  - [ ] .git/ excluded from copy
  - [ ] .env.afrihost created with test values
  - [ ] .htaccess prepared for Node.js routing

## Phase 2: Upload to Afrihost ✓

- [ ] **1. Login to cPanel**
  - [ ] URL: https://cpanel.tmvbusinesssolutions.co.za
  - [ ] Username/Password: Your cPanel credentials
  - [ ] File Manager opened

- [ ] **2. Configure File Manager**
  - [ ] Settings → Enable "Show hidden files"
  - [ ] Navigate to: public_html
  - [ ] This will show .htaccess and .env files

- [ ] **3. Upload critical files first (in order)**
  - [ ] `.htaccess` (CRITICAL - must be first)
  - [ ] `package.json`
  - [ ] `server.js`
  - [ ] `start.js`
  - [ ] `.env` (renamed from .env.afrihost)

- [ ] **4. Upload frontend files (in order)**
  - [ ] `pages/` folder
  - [ ] `scripts/` folder
  - [ ] `styles/` folder
  - [ ] `assets/` folder
  - [ ] `images/` folder
  - [ ] `logos/` folder
  - [ ] `cart/` folder
  - [ ] `index.html`
  - [ ] `styles.css`

- [ ] **5. Upload backend files**
  - [ ] `backend/` folder
  - [ ] `backend/database/` with all migrations
  - [ ] `backend/routes/` with all API endpoints
  - [ ] `backend/models/` with all Sequelize models
  - [ ] `backend/middleware/` with auth/validation

## Phase 3: Server Installation ✓

- [ ] **1. Access server terminal**
  - [ ] Via cPanel Terminal (if available)
  - [ ] OR SSH: `ssh username@tmvbusinesssolutions.co.za`

- [ ] **2. Navigate to deployment directory**
  ```bash
  cd ~/public_html
  pwd  # verify location
  ```

- [ ] **3. Rename environment file**
  ```bash
  mv .env.afrihost .env
  # Verify: cat .env | grep DB_HOST
  ```

- [ ] **4. Install Node.js dependencies**
  ```bash
  npm install --production
  # Should show: added XXX packages in X seconds
  ```

- [ ] **5. Verify installation**
  ```bash
  ls -la node_modules | head -10
  npm list | head -5
  ```

## Phase 4: Start Node.js Server ✓

### Option A: cPanel Passenger (Recommended)
- [ ] **1. Create wrapper file**
  ```bash
  cat > ~/public_html/app.js << 'EOF'
  module.exports = require('./server');
  EOF
  ```

- [ ] **2. Create Node.js application in cPanel**
  - [ ] Go to: cPanel → Ruby On Rails / Node.js
  - [ ] Click: "Create Application"
  - [ ] Settings:
    - Node.js version: 14.x or 16.x
    - Application root: /home/username/public_html
    - Application startup file: app.js
    - Application environment: production
    - Click: "Create"

- [ ] **3. Verify in cPanel UI**
  - [ ] Application appears in list
  - [ ] Status shows "Running"
  - [ ] Reload with "Reload" button if needed

### Option B: PM2 (Production Alternative)
- [ ] **1. Install PM2 globally**
  ```bash
  npm install -g pm2
  pm2 --version  # verify installation
  ```

- [ ] **2. Start application**
  ```bash
  cd ~/public_html
  pm2 start server.js --name tmv-api
  ```

- [ ] **3. Save PM2 configuration**
  ```bash
  pm2 save
  pm2 startup
  # Run command shown by pm2 startup
  ```

- [ ] **4. Verify running**
  ```bash
  pm2 list
  pm2 logs tmv-api  # (first 10 lines)
  ```

## Phase 5: Server Verification ✓

- [ ] **1. Check if server is responding**
  ```bash
  curl http://localhost:3000/api/health
  # Expected: {"status": "ok"} or similar
  ```

- [ ] **2. Check listening port**
  ```bash
  netstat -an | grep 3000
  # Should show: LISTEN 0.0.0.0:3000
  ```

- [ ] **3. Check error logs**
  ```bash
  pm2 logs tmv-api 2>&1 | tail -50
  # OR if using nohup: tail -f ~/public_html/server.log
  ```

- [ ] **4. Test via HTTP/HTTPS**
  - [ ] Open browser: https://tmvbusinesssolutions.co.za
  - [ ] Should load without 503 error
  - [ ] Check console (F12) for JavaScript errors

## Phase 6: Database Configuration ✓

- [ ] **1. Whitelist development IP (if needed)**
  - [ ] Get your IP: `curl https://checkip.amazonaws.com`
  - [ ] Go to Afrihost cPanel → Remote MySQL
  - [ ] Add IP to "Hosts" list
  - [ ] Wait 5 minutes for changes to propagate

- [ ] **2. Test database connection**
  ```bash
  mysql -h tmvbusinesssolutions.co.za \
    -u tmvbusw4e7k0_tmvbusinesssolutions \
    -p tmvbusw4e7k0_tmvbusinesssolutions
  # When prompted, enter your database password
  # Type: \q to exit
  ```

- [ ] **3. Verify migrations are run**
  ```bash
  # On server, navigate to project root
  npm run migrate  # if migrate script exists
  # OR manually verify in MySQL that tables exist
  ```

- [ ] **4. Test database via API**
  ```bash
  curl https://tmvbusinesssolutions.co.za/api/test-db
  # Should show database status and table list
  ```

## Phase 7: Integration Testing ✓

- [ ] **1. Test registration flow**
  - [ ] Visit: https://tmvbusinesssolutions.co.za
  - [ ] Click: Register as New Company/Job Seeker
  - [ ] Fill form and submit
  - [ ] Verify: Account created in database
  - [ ] Check: MySQL `SELECT COUNT(*) FROM users;`

- [ ] **2. Test login flow**
  - [ ] Visit: https://tmvbusinesssolutions.co.za
  - [ ] Click: Login
  - [ ] Enter test credentials
  - [ ] Verify: Dashboard loads
  - [ ] Check: Console has no CORS errors

- [ ] **3. Test payment initialization**
  - [ ] Visit: https://tmvbusinesssolutions.co.za/pages/payment-test.html
  - [ ] Click: Pay Now
  - [ ] Verify: Yoco modal appears
  - [ ] Don't complete payment (test only)

- [ ] **4. Monitor logs during testing**
  ```bash
  pm2 logs tmv-api --lines 50
  # Watch for any database/payment errors
  ```

## Phase 8: Troubleshooting ✓

### If Server Won't Start
- [ ] Check syntax: `node -c server.js`
- [ ] Test locally: `NODE_ENV=production npm start`
- [ ] Check logs: `pm2 logs tmv-api`
- [ ] Verify .env exists: `ls -la .env`

### If Database Connection Fails
- [ ] Verify whitelist: Afrihost cPanel → Remote MySQL
- [ ] Test credentials: `mysql -h tmvbusinesssolutions.co.za -u user -p`
- [ ] Check .env: `cat .env | grep DB_`
- [ ] Verify no typos in hostname

### If Payment Doesn't Work
- [ ] Verify keys in .env: `cat .env | grep YOCO`
- [ ] Test API: `curl https://tmvbusinesssolutions.co.za/api/payments/test`
- [ ] Check console (F12) for Yoco script errors
- [ ] Verify Yoco keys are LIVE keys, not test keys

### If Email Doesn't Send
- [ ] Test SMTP: `telnet mail.afrihost.com 587`
- [ ] Verify .env has EMAIL_USER and EMAIL_PASSWORD
- [ ] Check logs for SMTP errors
- [ ] Ensure Afrihost email account is active

## Completion Checklist

- [ ] ✅ All files uploaded to public_html
- [ ] ✅ npm install completed successfully
- [ ] ✅ Server is running (pm2 list shows "online")
- [ ] ✅ https://tmvbusinesssolutions.co.za loads
- [ ] ✅ Database connection test passes (/api/test-db returns data)
- [ ] ✅ Login works with test credentials
- [ ] ✅ Payment modal appears and initializes
- [ ] ✅ No 503/500 errors in browser console
- [ ] ✅ No database connection errors in pm2 logs
- [ ] ✅ Email configuration tested (if configured)
- [ ] ✅ Yoco live keys are in .env (not test keys)

## Go-Live Checklist

- [ ] Update Yoco payment mode from test to production in database/config
- [ ] Update email templates with production URLs
- [ ] Enable SSL (should already be enabled)
- [ ] Set up regular database backups
- [ ] Configure error monitoring (optional but recommended)
- [ ] Test complete customer flow one more time
- [ ] Update documentation with actual access logs and procedures

## Post-Deployment Support

For issues after deployment:
1. Check error logs: `pm2 logs tmv-api`
2. Verify environment: `cat .env | grep -E "DB_|NODE_"`
3. Test endpoints: `curl https://tmvbusinesssolutions.co.za/api/health`
4. Check PM2 status: `pm2 status`
5. Restart if needed: `pm2 restart tmv-api`


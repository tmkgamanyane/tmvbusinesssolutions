# TMV Business Solutions - Live Deployment Troubleshooting Guide

## ✅ Changes Made for Live Deployment

### 1. Fixed API Configuration
- **File Updated:** `scripts/api.js`
- **Change:** Updated `API_BASE_URL` from `http://localhost:3000/api` to `https://tmvbusinesssolutions.co.za/api`

### 2. Enhanced CORS Configuration
- **File Updated:** `server.js`
- **Changes:**
  - Added multiple origin variations (http/https, www subdomain)
  - Added detailed CORS logging
  - Exposed Set-Cookie headers for authentication

### 3. Session Cookie Configuration
- **File Updated:** `server.js`
- **Changes:**
  - Set `secure: true` in production for HTTPS
  - Set `sameSite: 'none'` for cross-origin cookies in production
  - Added domain-specific cookie settings

### 4. Apache Configuration
- **File Created:** `.htaccess`
- **Purpose:** Proxy API requests to Node.js server and enable CORS

## 🚀 Deployment Checklist

### Step 1: Upload Files to Server
```bash
# Upload all files to your Afrihost web directory
# Make sure these files are uploaded:
- .env (with production settings)
- .htaccess (Apache configuration)
- server.js (updated)
- scripts/api.js (updated)
- All other project files
```

### Step 2: Install Dependencies
```bash
ssh your-username@tmvbusinesssolutions.co.za
cd /path/to/your/project
npm install
```

### Step 3: Setup Database
```bash
# Connect to MySQL
mysql -u root -p

# Run the database setup script
source database-setup.sql

# Verify database exists
SHOW DATABASES;
USE tmvbusinesssolutions;
SHOW TABLES;
```

### Step 4: Start Node.js Server
```bash
# Option 1: Using PM2 (recommended)
pm2 start ecosystem.config.json --env production
pm2 save
pm2 startup

# Option 2: Using npm
npm start

# Option 3: Direct node
node start.js
```

### Step 5: Verify Server is Running
```bash
# Check if server is listening on port 3000
netstat -tuln | grep 3000

# Check PM2 status
pm2 status

# Check logs
pm2 logs tmvbusinesssolutions
```

### Step 6: Test the Setup
1. Visit: `https://tmvbusinesssolutions.co.za/pages/server-status.html`
2. This will automatically run tests for:
   - Server connection
   - Login API
   - Registration API
   - Payment API

## 🔍 Troubleshooting Common Issues

### Issue 1: "Network error. Please make sure the server is running"

**Possible Causes & Solutions:**

1. **Node.js server not running**
   ```bash
   # Check if server is running
   pm2 status
   
   # Start if not running
   pm2 start tmvbusinesssolutions
   ```

2. **Server running on wrong port**
   ```bash
   # Check .env file
   cat .env | grep PORT
   # Should show: PORT=3000
   
   # Check if port 3000 is in use
   netstat -tuln | grep 3000
   ```

3. **Apache not proxying to Node.js**
   - Verify `.htaccess` file exists in web root
   - Check Apache error logs:
     ```bash
     tail -f /var/log/apache2/error.log
     ```
   - Ensure mod_proxy and mod_rewrite are enabled:
     ```bash
     sudo a2enmod proxy
     sudo a2enmod proxy_http
     sudo a2enmod rewrite
     sudo systemctl restart apache2
     ```

4. **Firewall blocking port 3000**
   ```bash
   # Allow port 3000
   sudo ufw allow 3000/tcp
   ```

### Issue 2: CORS Errors in Browser Console

**Solutions:**

1. **Check CORS configuration in server.js**
   - Origin should include your domain
   - `credentials: true` should be set

2. **Browser console shows specific origin blocked**
   ```bash
   # Check server logs for CORS messages
   pm2 logs tmvbusinesssolutions | grep CORS
   ```

3. **Add origin to allowed list in server.js:**
   ```javascript
   const allowedOrigins = [
       'https://tmvbusinesssolutions.co.za',
       'https://www.tmvbusinesssolutions.co.za'
       // Add more if needed
   ];
   ```

### Issue 3: Login Works But Session Not Maintained

**Solutions:**

1. **Check cookie settings**
   - Open browser DevTools → Application → Cookies
   - Look for `tmv_session` cookie
   - If missing, check server session configuration

2. **HTTPS and Secure Cookies**
   - Ensure SSL certificate is installed
   - Verify `secure: true` in production
   - Check `sameSite: 'none'` is set

3. **Domain mismatch**
   - Cookie domain should match your site domain
   - Check `.env` has correct `CLIENT_URL`

### Issue 4: Database Connection Failed

**Solutions:**

1. **Check database credentials in .env**
   ```bash
   cat .env | grep DB_
   ```

2. **Test database connection**
   ```bash
   mysql -u root -p tmvbusinesssolutions
   ```

3. **Grant proper permissions**
   ```sql
   GRANT ALL PRIVILEGES ON tmvbusinesssolutions.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Issue 5: Payment Not Working

**Solutions:**

1. **Check Yoco keys in .env**
   ```bash
   cat .env | grep YOCO
   # Should show YOCO_MODE=live
   ```

2. **Verify payment endpoint**
   - Test: `https://tmvbusinesssolutions.co.za/api/payments/create-checkout`

3. **Check Yoco account status**
   - Ensure live mode is activated
   - Verify API keys are correct

## 📊 Server Monitoring Commands

```bash
# Check server status
pm2 status

# View real-time logs
pm2 logs tmvbusinesssolutions

# Monitor server resources
pm2 monit

# Restart server
pm2 restart tmvbusinesssolutions

# Stop server
pm2 stop tmvbusinesssolutions

# View error logs only
pm2 logs tmvbusinesssolutions --err

# Clear logs
pm2 flush
```

## 🔧 Apache Configuration

If using Apache as reverse proxy, ensure these modules are enabled:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl restart apache2
```

## 📝 Quick Test Commands

```bash
# Test server is accessible
curl https://tmvbusinesssolutions.co.za/api/test

# Test login endpoint
curl -X POST https://tmvbusinesssolutions.co.za/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Check server response headers
curl -I https://tmvbusinesssolutions.co.za/api/test
```

## 🆘 Emergency Fixes

### Server Won't Start
```bash
# Check for syntax errors
node -c server.js

# Check for port conflicts
lsof -i :3000
# Kill conflicting process if needed
kill -9 <PID>

# Start with verbose logging
NODE_ENV=production node start.js
```

### High Memory Usage
```bash
# Restart server
pm2 restart tmvbusinesssolutions

# Check memory usage
pm2 list
```

### Server Crashes Repeatedly
```bash
# Check error logs
pm2 logs tmvbusinesssolutions --err --lines 100

# Check system logs
tail -f /var/log/syslog
```

## 📞 Support Checklist

When contacting support, provide:
1. Output of `pm2 logs tmvbusinesssolutions --lines 50`
2. Output of `pm2 status`
3. Browser console errors (DevTools → Console)
4. Network tab errors (DevTools → Network)
5. Server status test results from `/pages/server-status.html`

## ✅ Final Verification

After deployment, verify these are working:
- [ ] Homepage loads: `https://tmvbusinesssolutions.co.za`
- [ ] API responds: `https://tmvbusinesssolutions.co.za/api/test`
- [ ] Login page loads: `https://tmvbusinesssolutions.co.za/pages/client_login.html`
- [ ] Can register a new user
- [ ] Can login with credentials
- [ ] Session persists after login
- [ ] Can initiate payment flow
- [ ] Server status page shows all green: `/pages/server-status.html`
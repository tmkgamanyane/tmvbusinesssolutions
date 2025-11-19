# 🚨 CRITICAL DATABASE CONFIGURATION ISSUE FOUND

## The Problem: Render Backend Shows 502 Bad Gateway

**When you curl:** `https://tmv-backend.onrender.com/api/test-db`

**You get:** 502 Bad Gateway HTML error page (not JSON)

This means the **Render backend itself is crashing or unreachable**, not just failing to connect to the database.

---

## Root Cause Analysis

### Issue 1: Database Credentials NOT Set on Render

**Location:** `server.js` lines 289-350

```javascript
const sequelize = new Sequelize(
    process.env.DB_NAME || 'tmvbusinesssolutions',       // ← Uses env var OR fallback
    process.env.DB_USER || 'root',                        // ← Uses env var OR fallback  
    process.env.DB_PASSWORD || 'Moses@1985',              // ← Uses env var OR fallback
    {
        host: process.env.DB_HOST || 'localhost',         // ← Uses env var OR fallback
        port: process.env.DB_PORT || 3306,                // ← Uses env var OR fallback
        dialect: 'mysql',
        ...
    }
);
```

**The Problem:**
- `process.env.DB_HOST` is probably NOT set on Render → defaults to `'localhost'`
- `process.env.DB_USER` is probably NOT set on Render → defaults to `'root'`
- `process.env.DB_PASSWORD` is probably NOT set on Render → defaults to `'Moses@1985'`
- When server starts on Render, it tries to connect to `localhost` (Render's own machine, not Afrihost!)
- Connection fails → Server crashes → 502 error

---

## Solution: Set Environment Variables on Render

### Step 1: Go to Render Dashboard

1. Visit: https://dashboard.render.com/d/srv-d4e6ma75r7bs73fj46og
2. Click: **Settings**
3. Scroll to: **Environment**
4. Add these variables (replace with YOUR actual values):

```
DB_HOST=tmvbusinesssolutions.co.za
DB_PORT=3306
DB_NAME=tmvbusw4e7k0_tmvbusinesssolutions
DB_USER=tmvbusw4e7k0_tmvbusinesssolutions
DB_PASSWORD=<your-actual-database-password>

NODE_ENV=production
SESSION_SECRET=<any-long-random-string>

EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=enquiries@tmvbusinesssolutions.co.za
EMAIL_PASS=<your-actual-email-password>
```

### Step 2: Verify Each Value

| Variable | Value | Where to find |
|----------|-------|---------------|
| `DB_HOST` | `tmvbusinesssolutions.co.za` | From Afrihost control panel |
| `DB_PORT` | `3306` | Standard MySQL port (check your Afrihost setup) |
| `DB_NAME` | `tmvbusw4e7k0_tmvbusinesssolutions` | From Afrihost database name |
| `DB_USER` | `tmvbusw4e7k0_tmvbusinesssolutions` | From Afrihost database user |
| `DB_PASSWORD` | `<your password>` | The password you set in Afrihost |

### Step 3: Deploy After Setting Variables

1. After adding all env vars, Render will auto-redeploy
2. OR manually trigger: **Manual Deploy** button in Render dashboard
3. Wait 2-3 minutes for deployment to complete
4. Check logs for: ✅ `Database connection has been established successfully`

### Step 4: Test the Endpoint

```bash
curl https://tmv-backend.onrender.com/api/test-db
```

**Expected response (JSON, not HTML):**
```json
{
  "timestamp": "...",
  "environment": {
    "DB_HOST": "tmvbusinesssolutions.co.za",
    "DB_PORT": "3306",
    "DB_NAME": "tmvbusw4e7k0_tmvbusinesssolutions",
    "DB_USER": "tmvbusw4e7k0_tmvbusinesssolutions",
    "DB_PASSWORD": "***SET***"
  },
  "tests": {
    "authentication": { "status": "SUCCESS", "message": "Connected to database" },
    "users_query": { "status": "SUCCESS", "user_count": 5 }
  }
}
```

---

## Why Frontend Login Still Fails

**Flow:**
1. Frontend sends login request → `https://tmv-backend.onrender.com/api/auth/login`
2. Render backend receives it ✅
3. Backend tries to query database: `User.findOne({ where: { email } })`
4. Connection to `localhost` fails ❌ (because env vars not set)
5. Exception thrown
6. Error handler catches it and sends HTML error page
7. Frontend receives HTML (not JSON)
8. Frontend error: "Server returned HTML or plain text instead of JSON"

**Once database env vars are set:**
1-6. Same process but Step 4 succeeds ✅
7. Backend sends proper JSON response
8. Frontend receives JSON ✅
9. Login works!

---

## Verification Checklist

**Before you set env vars, confirm:**
- [ ] You have Afrihost database name: `tmvbusw4e7k0_tmvbusinesssolutions`
- [ ] You have Afrihost database user: `tmvbusw4e7k0_tmvbusinesssolutions`
- [ ] You have the database password
- [ ] IP `169.0.83.170` is whitelisted in Afrihost Remote MySQL (if testing locally)
- [ ] Render's IP will need to be whitelisted too (get it from Render support or test endpoint logs)

**After you set env vars:**
- [ ] Check Render logs show "Database connection established"
- [ ] Test `/api/test-db` endpoint returns JSON (not HTML)
- [ ] Test login endpoint: should return JSON error or success
- [ ] Login in browser should work (once IPs whitelisted)

---

## Important Notes

1. **Render IP Whitelisting**: Once env vars are set, Render will try to connect from its server IP. You may need to:
   - Get Render's IP address
   - Add it to Afrihost Remote MySQL whitelist
   - This is in Render logs when it tries to connect

2. **Email not working yet**: Email sending also needs env vars set (EMAIL_HOST, EMAIL_USER, EMAIL_PASS)

3. **Session store**: Render will also try to connect with these credentials for session storage

4. **Do NOT commit .env file**: These secrets should ONLY be in Render environment, not in git

---

## Next Immediate Actions

1. ✅ Get your Afrihost credentials ready
2. ✅ Go to Render dashboard Settings → Environment
3. ✅ Add all DB_* and EMAIL_* variables
4. ✅ Save and wait for auto-redeploy (2-3 min)
5. ✅ Test `/api/test-db` endpoint
6. ✅ If connection fails, whitelist Render's IP in Afrihost
7. ✅ Test login endpoint

**THIS IS THE BLOCKER** - Nothing will work until these env vars are set on Render!


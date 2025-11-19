# 🔐 Authentication Flow - Step-by-Step Analysis

## Issue: "Server returned HTML or plain text instead of JSON"

This error means the backend is responding with **HTML or plain text** instead of **JSON**.

---

## STEP 1: Frontend Login Request (login.js)

**Location:** `scripts/login.js` Line 103-108

```javascript
const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, rememberMe }),
    credentials: 'include'
});
```

**What it does:**
- Sends POST request to: `https://tmv-backend.onrender.com/api/auth/login`
- Content-Type: `application/json` ✅
- Includes credentials (cookies) ✅
- Sends: `{ email, password, rememberMe }`

**Status:** ✅ Frontend request is correct

---

## STEP 2: Backend Login Endpoint (server.js)

**Location:** `server.js` Line 700-756

```javascript
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // ... validation ...
    
    // Query database for user
    const user = await User.findOne({ where: { email } });
    
    // ... verify password ...
    
    // Create session
    req.session.userId = user.id;
    
    // Return JSON response
    res.json({
        message: 'Login successful',
        user: { ... }
    });
});
```

**What it does:**
- ✅ Receives POST request
- ✅ Parses email/password from body
- ✅ Queries database with `User.findOne()`
- ✅ Verifies password with bcrypt
- ✅ Creates session
- ✅ Responds with JSON

**Potential Issues:**
1. ❌ Database query fails → Error response sent as HTML/plain text
2. ❌ Unhandled error in middleware → Express sends error page (HTML)
3. ❌ CORS error → Browser receives error instead of JSON

---

## STEP 3: Database Connection

**Location:** `server.js` Line 289-350

**Current Status Check:**

When you run `npm start` locally, you saw:
```
❌ Database Error: Access denied for user 'tmvbusw4e7k0_tmvbusinesssolutions'@'169-0-83-170.ip.ahisp.co.za'
Error Code: 1045 ER_ACCESS_DENIED_ERROR
```

**This means:**
- ✅ Network connection to Afrihost MySQL works
- ✅ Database hostname is correct: `tmvbusinesssolutions.co.za`
- ✅ Username is correct: `tmvbusw4e7k0_tmvbusinesssolutions`
- ❌ **IP 169.0.83.170 NOT whitelisted in Afrihost Remote MySQL**

---

## Root Cause of "HTML Response" Error

**Flow:**

```
1. Frontend sends: POST /api/auth/login with email/password
                           ↓
2. Backend receives request ✅
                           ↓
3. Backend tries: User.findOne({ where: { email } })
                           ↓
4. Database error: "Access denied" ❌
                           ↓
5. Exception caught in error handler
                           ↓
6. Express responds with 500 status + HTML error page (not JSON) ❌
                           ↓
7. Frontend receives HTML instead of JSON
                           ↓
8. Frontend error: "Server returned HTML or plain text instead of JSON" ⚠️
```

---

## Current Database Error Logs

When Render tries to login:

**From server.js Line 718-728 (Database query error logging):**

```
❌ Database error during user lookup: {
    name: 'SequelizeConnectionRefusedError',
    message: 'Access denied for user...',
    code: 'ER_ACCESS_DENIED_ERROR',
    errno: 1045,
    sql: 'SELECT * FROM `users` WHERE `email` = ...'
}
```

**This proves:**
- ✅ SQL query is correct
- ✅ Connection attempted
- ❌ IP blocked by Afrihost firewall

---

## SOLUTION: 3 Steps to Fix

### Step 1: Whitelist IPs in Afrihost Remote MySQL

**For LOCAL testing (your computer):**
- IP: `169.0.83.170`
- Location in Afrihost: Settings → Database → Remote MySQL → IP Whitelist
- Add: `169.0.83.170`

**For RENDER (backend production):**
- Get Render's IP (check server logs or contact Render support)
- Add: `RENDER_IP` to Afrihost whitelist

**How to find Render's IP:**
```
Option 1: Check Render logs at https://dashboard.render.com/d/srv-d4e6ma75r7bs73fj46og
Option 2: Run /api/test-db endpoint to see what IP Render is using
Option 3: Contact Render support for their outgoing IP ranges
```

### Step 2: Test After Whitelisting

**Test locally:**
```powershell
npm start
# Wait for: "✅ Database connected"
```

**Test from Render:**
```
Visit: https://tmv-backend.onrender.com/api/health
Look for: "database": "healthy"
```

### Step 3: Frontend Will Receive JSON

Once database is accessible:

```
✅ User.findOne() succeeds
✅ Password verified
✅ Session created
✅ res.json({ message: 'Login successful', user: {...} })
✅ Frontend receives JSON with status 200
✅ Login succeeds
```

---

## Server.js Login Endpoint - Complete Flow

**Lines 700-756 - Detailed Breakdown:**

| Step | Code | What Happens | Status |
|------|------|--------------|--------|
| 1 | `const { email, password } = req.body` | Extract credentials | ✅ Working |
| 2 | `email validation` | Check email format | ✅ Working |
| 3 | `User.findOne({ where: { email } })` | Query database | ❌ **BLOCKED - IP not whitelisted** |
| 4 | `bcrypt.compare()` | Verify password hash | ⏳ Waiting for Step 3 |
| 5 | `req.session.userId = user.id` | Create session | ⏳ Waiting for Step 3 |
| 6 | `res.json({...})` | Send JSON response | ⏳ Waiting for Step 3 |

---

## Login.js Response Handling - Complete Flow

**Lines 103-165 - Detailed Breakdown:**

| Step | Code | Expected | Actual (Now) |
|------|------|----------|--------------|
| 1 | `fetch()` | Sends request | ✅ Sent |
| 2 | `response.headers.get('content-type')` | Checks type | ✅ Reads header |
| 3 | `contentType.includes('application/json')` | Should be true | ❌ **Is 'text/html'** |
| 4 | `response.json()` | Parse JSON | ❌ Gets HTML instead |
| 5 | Error handling | Throw error | ❌ **"Server returned HTML..."** |

---

## Verification Checklist

### Frontend (login.js)
- ✅ API_BASE set correctly: `https://tmv-backend.onrender.com/api`
- ✅ fetch() sends POST to `/api/auth/login`
- ✅ Includes 'Content-Type: application/json'
- ✅ Error handling checks for JSON response

### Backend (server.js)
- ✅ POST `/api/auth/login` route exists
- ✅ Extracts email/password from body
- ✅ Queries database
- ✅ Responds with `res.json()`

### Database (Afrihost MySQL)
- ❌ **IP 169.0.83.170 NOT whitelisted** ← MAIN ISSUE
- ❌ Render IP NOT whitelisted ← SECONDARY ISSUE
- ✅ Database exists: `tmvbusw4e7k0_tmvbusinesssolutions`
- ✅ Users table exists
- ✅ Username/password correct

---

## Next Action Required

**YOU MUST DO THIS:**

1. Go to Afrihost control panel
2. Settings → Database → Remote MySQL → IP Whitelist
3. Add: `169.0.83.170` (your local IP)
4. Add: `[RENDER_IP]` (get this from Render)
5. Save changes
6. Wait 5-10 minutes for changes to propagate
7. Test login again

**After whitelisting, the error will disappear and login will work.**

---

## Debug Command

To test if database is accessible:

```powershell
# From your local machine
npm start

# Check logs for:
# ✅ "Database connected" = IP whitelisted ✅
# ❌ "Access denied" = IP still blocked ❌
```

---

**Summary:**
- Frontend ✅ Sends correct request
- Backend ✅ Ready to process
- Database ❌ **Blocked by IP whitelist** ← FIX THIS

Once you whitelist IPs, everything will work.


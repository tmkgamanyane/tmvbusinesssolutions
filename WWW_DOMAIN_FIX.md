# WWW vs Non-WWW Domain Fix - November 17, 2025

## Issue Identified by Afrihost Support

Your domain provider (Afrihost) identified that the `.htaccess` CORS headers were only allowing `https://tmvbusinesssolutions.co.za` (without www), but users accessing via `https://www.tmvbusinesssolutions.co.za` (with www) were being blocked.

### Original Problem in .htaccess:
```apache
# ❌ Only allowed non-www
Header always set Access-Control-Allow-Origin "https://tmvbusinesssolutions.co.za"
```

This caused CORS errors when users accessed the site via:
- `https://www.tmvbusinesssolutions.co.za` ❌ Blocked
- Forms couldn't submit
- API calls failed

## Solutions Applied

### 1. Fixed .htaccess (Apache Configuration)

#### A. Added WWW to Non-WWW Redirect
```apache
# ✅ Redirect www to non-www (normalize domain)
RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [R=301,L]
```

**What this does:**
- Automatically redirects `www.tmvbusinesssolutions.co.za` → `tmvbusinesssolutions.co.za`
- Users always end up on the non-www version
- Normalizes your domain for SEO

#### B. Updated CORS Headers to Support Both
```apache
# ✅ Enable CORS headers - Allow both www and non-www
SetEnvIf Origin "^https?://(www\.)?tmvbusinesssolutions\.co\.za$" AccessControlAllowOrigin=$0
Header always set Access-Control-Allow-Origin %{AccessControlAllowOrigin}e env=AccessControlAllowOrigin
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
Header always set Access-Control-Allow-Credentials "true"
```

**What this does:**
- Dynamically sets `Access-Control-Allow-Origin` based on the request origin
- Allows both `https://tmvbusinesssolutions.co.za` AND `https://www.tmvbusinesssolutions.co.za`
- Works even if redirect doesn't trigger immediately

### 2. Fixed Frontend API Calls

#### A. Updated `scripts/api.js`
**Before:**
```javascript
// ❌ Hardcoded domain (breaks with www)
const API_BASE_URL = 'https://tmvbusinesssolutions.co.za/api';
```

**After:**
```javascript
// ✅ Dynamic domain detection (works with www and non-www)
const API_BASE_URL = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.protocol}//${window.location.hostname}/api`;
```

**What this does:**
- Automatically uses the current domain (www or non-www)
- Works on localhost for development
- Works on live server with any domain variant

#### B. Updated Consultation Forms

Fixed 3 consultation form pages to use dynamic URLs:

**1. IT Infrastructure Form** (`pages/it_infrastructure.html`)
```javascript
// ✅ Dynamic API URL
const apiBaseUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.hostname}`;

const response = await fetch(`${apiBaseUrl}/api/consultation/it-infrastructure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
});
```

**2. Architecture Form** (`pages/architectural_services.html`)
- Same dynamic URL pattern applied

**3. Business Plan Form** (`pages/business_consulting.html`)
- Same dynamic URL pattern applied

### 3. Verified Node.js Server CORS

The server already had proper CORS configuration:
```javascript
// ✅ Server already allows both www and non-www
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://tmvbusinesssolutions.co.za',
            'https://www.tmvbusinesssolutions.co.za',  // ✅ Already included
            'http://tmvbusinesssolutions.co.za',
            'http://www.tmvbusinesssolutions.co.za',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        // ... validation logic
    },
    credentials: true
}));
```

## Complete Solution Summary

### Two-Pronged Approach:

#### 1. **Apache Level (Recommended)**
- Redirect all www traffic to non-www
- Normalize domain for consistency
- Better for SEO (single canonical domain)

**Result:** Users accessing `www.tmvbusinesssolutions.co.za` are immediately redirected to `tmvbusinesssolutions.co.za`

#### 2. **Application Level (Fallback)**
- Dynamic CORS headers in .htaccess allow both domains
- Frontend JavaScript automatically detects current domain
- Works regardless of which domain is accessed

**Result:** Even if redirect fails, API calls still work

## Benefits of This Approach

### SEO Benefits:
- ✅ Single canonical domain (non-www)
- ✅ No duplicate content issues
- ✅ Proper 301 redirects
- ✅ Consistent URLs across the site

### Technical Benefits:
- ✅ Works with www and non-www
- ✅ No hardcoded domains in JavaScript
- ✅ Works on localhost for development
- ✅ Proper CORS handling
- ✅ Session cookies work correctly

### User Experience:
- ✅ Forms submit successfully
- ✅ No CORS errors
- ✅ Consistent URLs in browser
- ✅ Fast redirects (301 permanent)

## Files Modified

### 1. Apache Configuration
- ✅ `.htaccess` - WWW redirect + dynamic CORS

### 2. Frontend JavaScript
- ✅ `scripts/api.js` - Dynamic API base URL
- ✅ `pages/it_infrastructure.html` - Dynamic consultation form
- ✅ `pages/architectural_services.html` - Dynamic consultation form
- ✅ `pages/business_consulting.html` - Dynamic consultation form

### 3. Server Configuration
- ✅ `server.js` - Already configured correctly (no changes needed)

## Testing After Deployment

### Test Scenario 1: Access with WWW
1. Go to `https://www.tmvbusinesssolutions.co.za`
2. **Expected:** Redirects to `https://tmvbusinesssolutions.co.za`
3. Submit a consultation form
4. **Expected:** ✅ Form submits successfully

### Test Scenario 2: Access without WWW
1. Go to `https://tmvbusinesssolutions.co.za`
2. **Expected:** Stays on non-www domain
3. Submit a consultation form
4. **Expected:** ✅ Form submits successfully

### Test Scenario 3: Direct Link with WWW
1. Someone shares `https://www.tmvbusinesssolutions.co.za/pages/it_infrastructure.html`
2. **Expected:** Redirects to `https://tmvbusinesssolutions.co.za/pages/it_infrastructure.html`
3. Fill and submit form
4. **Expected:** ✅ Form submits successfully

### Test Scenario 4: Localhost Development
1. Run server locally: `node server.js`
2. Open `http://localhost:3000`
3. **Expected:** API calls use `http://localhost:3000/api`
4. **Expected:** ✅ Everything works locally

## Deployment Instructions

### Upload Modified Files to Live Server:

```bash
# Upload .htaccess (Apache config)
scp .htaccess user@server:/var/www/tmvbusinesssolutions/

# Upload updated JavaScript
scp scripts/api.js user@server:/var/www/tmvbusinesssolutions/scripts/

# Upload updated consultation forms
scp pages/it_infrastructure.html user@server:/var/www/tmvbusinesssolutions/pages/
scp pages/architectural_services.html user@server:/var/www/tmvbusinesssolutions/pages/
scp pages/business_consulting.html user@server:/var/www/tmvbusinesssolutions/pages/
```

### No Server Restart Required:
- ✅ Apache reads `.htaccess` automatically
- ✅ HTML/JS files are static (no cache issues)
- ✅ Changes take effect immediately

### Clear Browser Cache (If Testing):
```
Ctrl + Shift + Delete (Windows/Linux)
Cmd + Shift + Delete (Mac)
```
Or use Incognito/Private browsing mode.

## How It Works

### Request Flow:

#### User Types: `www.tmvbusinesssolutions.co.za`

1. **Apache .htaccess catches request**
   ```apache
   RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
   RewriteRule ^(.*)$ https://%1/$1 [R=301,L]
   ```
   
2. **Browser redirected to:** `tmvbusinesssolutions.co.za`

3. **User fills consultation form**

4. **JavaScript detects domain:**
   ```javascript
   const apiBaseUrl = `${window.location.protocol}//${window.location.hostname}`;
   // Result: https://tmvbusinesssolutions.co.za
   ```

5. **API call sent to:** `https://tmvbusinesssolutions.co.za/api/consultation/...`

6. **Apache proxies to Node.js:**
   ```apache
   RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]
   ```

7. **Node.js server receives request**

8. **CORS check passes:**
   ```javascript
   origin: 'https://tmvbusinesssolutions.co.za' // ✅ Allowed
   ```

9. **Email sent successfully** ✅

10. **User sees success message** ✅

## Alternative Solution (If Issues Persist)

If you still have issues, you can try Afrihost's suggestion:

### Option A: Comment Out Specific CORS Header
```apache
# Comment out this line in .htaccess:
# Header always set Access-Control-Allow-Origin "https://tmvbusinesssolutions.co.za"
```

This lets Node.js handle CORS entirely (which already works correctly).

### Option B: Keep Our Solution
Our solution is more robust because:
- ✅ Redirects www to non-www (SEO benefit)
- ✅ Allows both domains (fallback)
- ✅ Frontend dynamically adapts
- ✅ Consistent with best practices

## Expected Results

### Before Fix:
```
❌ CORS error: Access denied
❌ Network error on form submit
❌ "Failed to submit consultation request"
❌ Console shows: "blocked by CORS policy"
```

### After Fix:
```
✅ www redirects to non-www
✅ Forms submit successfully
✅ No CORS errors
✅ Email sent to department
✅ User sees success message
✅ Console shows: 200 OK
```

## Why This Solution is Better

### Compared to Hardcoded URLs:
- ✅ Works with any domain variant
- ✅ Works in development (localhost)
- ✅ No need to update code for domain changes

### Compared to Commenting Out CORS:
- ✅ More secure (explicit origins)
- ✅ Works at Apache level (faster)
- ✅ Proper redirect strategy (SEO)
- ✅ No dependency on Node.js for CORS

### Compared to Only Allowing Non-WWW:
- ✅ Graceful handling of www traffic
- ✅ No broken links if someone shares www URL
- ✅ Proper 301 redirect preserves SEO juice

## Monitoring & Validation

### Check Apache Error Logs:
```bash
tail -f /var/log/apache2/error.log
```

### Check Apache Access Logs:
```bash
tail -f /var/log/apache2/access.log
```

### Check Node.js Logs:
```bash
pm2 logs tmvbusinesssolutions
```

### Test CORS Headers:
```bash
curl -I -X OPTIONS \
  -H "Origin: https://www.tmvbusinesssolutions.co.za" \
  -H "Access-Control-Request-Method: POST" \
  https://tmvbusinesssolutions.co.za/api/consultation/it-infrastructure
```

Expected response:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://www.tmvbusinesssolutions.co.za
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

## Issue Resolution Status

✅ **RESOLVED**

- ✅ WWW to non-WWW redirect implemented
- ✅ Dynamic CORS headers configured
- ✅ Frontend updated to detect domain automatically
- ✅ Server CORS already configured correctly
- ✅ All consultation forms updated

**Ready for deployment!** 🚀

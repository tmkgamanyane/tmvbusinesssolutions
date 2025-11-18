# TMV Business Solutions - Manual FTP Deployment & Testing Guide

## Table of Contents
1. [Manual FTP Upload Steps](#manual-ftp-upload-steps)
2. [Post-Deployment Verification](#post-deployment-verification)
3. [Testing Login Functionality](#testing-login-functionality)
4. [Testing Payment Integration](#testing-payment-integration)
5. [Troubleshooting](#troubleshooting)

---

## Manual FTP Upload Steps

### Prerequisites
- FileZilla or similar FTP client installed
- FTP credentials ready (provided below)
- All frontend files locally in: `C:\Users\tshep\OneDrive\Documents\GitHub\tmvbusinesssolutions`

### FTP Connection Details
```
FTP Server: ftp.tmvbusinesssolutions.co.za
Port: 21
Protocol: FTP
Username: tshepisokgamanyane@tmvbusinesssolutions.co.za
Password: Moses@1985
```

### Step 1: Connect via FileZilla

1. Open **FileZilla**
2. Go to **File → Site Manager** (Ctrl+S)
3. Click **New site**
4. Enter the following:
   - **Host:** `ftp.tmvbusinesssolutions.co.za`
   - **Port:** `21`
   - **Protocol:** FTP - File Transfer Protocol
   - **Logon Type:** Normal
   - **User:** `tshepisokgamanyane@tmvbusinesssolutions.co.za`
   - **Password:** `Moses@1985`
5. Click **Connect**

### Step 2: Enable Hidden Files Display

**Important:** The `.htaccess` file is hidden by default and must be visible to upload it.

1. In FileZilla, go to **View** menu
2. Check **Show hidden files**
3. You should now see the `.htaccess` file in your local directory (left side)

### Step 3: Upload Files in This Order

#### Priority 1: Upload `.htaccess` FIRST
- **Why:** This file handles URL rewriting and SPA routing fallback
- **Location:** Must be in the **domain root** (where you see `public_html`)
- **In FileZilla:**
  1. Navigate left side to your project folder
  2. Find `.htaccess` (should be visible now)
  3. Right-click → **Upload**
  4. Verify it appears on the right side at the root level

#### Priority 2: Upload Core HTML/CSS Files
Upload these files to the **root directory**:
- `index.html`
- `styles.css`

**In FileZilla:**
1. Select both files on the left side
2. Drag to right side (or right-click → Upload)
3. Verify they appear on the right side

#### Priority 3: Upload Folders (Drag and Drop)
Upload these **entire folders** to the root:
- `pages/` - Contains login, register, payment pages
- `scripts/` - Contains JavaScript logic for API calls, auth, payments
- `styles/` - Contains CSS stylesheets
- `assets/` - Contains payment modal and other assets
- `images/` - Marketing images (Facebook, Google, Instagram, TikTok ads)
- `logos/` - Company logo and branding
- `cart/` - Shopping cart resources

**In FileZilla:**
1. Select folders on left side
2. Drag to right side root
3. FileZilla will create the folder structure and upload all files inside

### Step 4: Verify Upload Completed

On the **right side (remote server)**, you should see:
```
✓ .htaccess (CRITICAL - must be present)
✓ index.html
✓ styles.css
✓ pages/ (folder with HTML files inside)
✓ scripts/ (folder with JS files inside)
✓ styles/ (folder with CSS files inside)
✓ assets/ (folder with payment-modal.js)
✓ images/ (folder with ad images)
✓ logos/ (folder with company logo)
✓ cart/ (folder with cart.png)
✓ public_html/ (existing Afrihost folder)
```

---

## Post-Deployment Verification

### Step 1: Clear Browser Cache

After upload completes, you **must** clear the browser cache to see the new files:

**Option A: Hard Refresh**
- Press: **Ctrl + Shift + R** (Windows/Linux)
- Or: **Cmd + Shift + R** (Mac)

**Option B: Incognito/Private Mode**
- Press: **Ctrl + Shift + N** (opens new incognito window)
- Incognito mode doesn't use cache

**Option C: Clear All Cache**
- Press: **Ctrl + Shift + Delete**
- Select "All time"
- Check "Cookies and other site data" + "Cached images and files"
- Click "Clear data"

### Step 2: Visit Your Website

1. Open browser
2. Go to: `https://tmvbusinesssolutions.co.za`
3. You should see the TMV homepage

### Step 3: Verify API Configuration

1. Press **F12** to open Developer Console
2. Go to **Console** tab
3. Type: `APP_CONFIG.API_BASE_URL`
4. You should see: `https://tmv-backend.onrender.com/api`

**If you see:**
- `http://localhost:3000/api` → Cache not cleared, try harder refresh
- Undefined → Config not loaded, check if files uploaded correctly
- `https://tmv-backend.onrender.com/api` ✓ **CORRECT**

### Step 4: Check Network Requests

1. Stay in **Developer Console**, go to **Network** tab
2. Refresh the page (F5)
3. Look for requests to `tmv-backend.onrender.com`
4. You should see multiple API calls (even if they fail with auth errors, that's OK)
5. Verify requests are going to: `https://tmv-backend.onrender.com/api/...`

**Not seeing backend requests?**
- Files may not be uploaded
- Cache not cleared
- Check `.htaccess` is present at root level

---

## Testing Login Functionality

### Step 1: Navigate to Login

1. On homepage, find and click **Login** button
2. You should be directed to login page (pages/client_login.html)
3. Verify URL is: `https://tmvbusinesssolutions.co.za/pages/client_login.html`

### Step 2: Create Test Account (Register First)

1. Look for **"Don't have an account? Register"** link
2. Click to go to registration page
3. Fill in form:
   - **Name:** Test User
   - **Email:** testuser@test.com
   - **Password:** Test@1234 (must be strong)
   - **Phone:** +27123456789
4. Click **Register**

**Expected Response:**
- Success message: "Registration successful"
- Redirected to login page
- Backend returns JSON response (check Network tab)

**If error:**
- Check Console tab for error message
- Verify backend is running: `curl https://tmv-backend.onrender.com/api/health`
- Check Network tab to see actual API response

### Step 3: Login with Test Account

1. On login page, enter:
   - **Email:** testuser@test.com
   - **Password:** Test@1234
2. Click **Login**

**Expected Response:**
- Success: Redirected to dashboard
- JWT token stored in browser (check Storage → Cookies)
- User information displayed on page

**Check in Developer Tools:**
- **Network tab:** POST request to `https://tmv-backend.onrender.com/api/auth/login`
- **Console tab:** Should show user data (no errors)
- **Application/Storage tab:** Should see `token` or `authToken` saved

### Step 4: Verify Authentication

After login:
1. Check you can access protected pages (dashboards)
2. Try accessing admin pages - should redirect if not admin
3. Logout and verify token is cleared
4. Try accessing protected page while logged out - should redirect to login

**Common Issues:**
- "Invalid credentials" → Check email/password are correct
- "Network error" → Backend not responding, check Render status
- "401 Unauthorized" → Token issue, check browser storage
- Redirects to login immediately → Token not being stored

---

## Testing Payment Integration

### Prerequisites
- Yoco account active (sandbox for testing)
- Payment gateway keys configured in backend
- Payment modal loaded from `assets/payment-modal.js`

### Step 1: Navigate to Payment Page

1. After login, find a service or package
2. Click **"Buy Now"** or **"Checkout"** button
3. Should trigger payment modal to appear

### Step 2: Verify Payment Modal

In Developer Console:
1. Go to **Console** tab
2. Type: `window.Yoco` 
3. Should show Yoco object is loaded

**If Yoco is undefined:**
- `assets/payment-modal.js` may not be loaded
- Check Network tab for `assets/payment-modal.js` request
- Verify file was uploaded to `assets/` folder

### Step 3: Test Payment Flow

**For Testing (Sandbox):**
Use test card: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

**For Production (Live):**
Use real card details

### Step 4: Monitor Payment Request

1. Before clicking "Pay", open Network tab
2. Click "Pay" in modal
3. Look for POST request to: `https://tmv-backend.onrender.com/api/payments/create-payment-intent`
4. Check response:
   - Should return payment intent ID
   - Or redirect to Yoco payment page

**Expected Flow:**
1. Submit payment modal
2. Backend creates Yoco payment intent
3. Yoco payment page opens
4. User completes payment
5. Redirect to success/failure page

### Step 5: Verify Payment Success

After successful payment:
1. Should redirect to: `pages/payment_success.html`
2. URL should be: `https://tmvbusinesssolutions.co.za/pages/payment_success.html`
3. Should display success message
4. Check backend logs for payment confirmation

**Check in Console:**
- Look for success notification
- Verify order/transaction ID is displayed

### Step 6: Check Failed Payment

1. Try payment with invalid card (e.g., `4000 0000 0000 0002`)
2. Should redirect to: `pages/payment_failed.html`
3. Should show error message

---

## Troubleshooting

### Issue: "Cannot find module" or 404 errors

**Solution:**
1. Verify all folders are uploaded (check on FTP server)
2. Check file paths in HTML (should be relative: `./scripts/config.js`)
3. Verify `.htaccess` is present for SPA routing

### Issue: API calls return 503 or Connection refused

**Cause:** Backend not accessible or CORS issue

**Solution:**
1. Check Render backend is running: `https://tmv-backend.onrender.com/api/health`
2. Verify CORS is configured for `tmvbusinesssolutions.co.za`
3. Check frontend is calling correct API URL in Console

### Issue: Login returns "Invalid credentials" for correct password

**Cause:** Password hashing or database issue

**Solution:**
1. Check backend logs on Render
2. Verify database is connected (health check shows "healthy")
3. Try registering new account again
4. Check password meets requirements (min 8 chars, uppercase, number, special char)

### Issue: Payment modal not appearing

**Cause:** Yoco not loaded or modal script issue

**Solution:**
1. Check `assets/payment-modal.js` exists on server
2. Verify in Network tab that asset loads successfully
3. Check Console for JavaScript errors
4. Verify Yoco keys in backend environment variables

### Issue: Users can't complete registration

**Cause:** Email validation or backend database issue

**Solution:**
1. Check email format is valid
2. Verify database connection is healthy
3. Check backend logs for SQL errors
4. Try with different email address
5. Verify password meets complexity requirements

### Issue: Pages redirect to login unexpectedly

**Cause:** JWT token not being stored or CORS headers missing

**Solution:**
1. Check browser Storage → Cookies for token
2. Verify Network response includes Set-Cookie header
3. Check CORS headers in response (should include Access-Control-Allow-Credentials)
4. Clear all cookies and try login again

### Issue: Styling not loading (pages look broken)

**Cause:** CSS files not uploaded or path issue

**Solution:**
1. Check `styles/` folder exists on FTP
2. Verify `.htaccess` is present (handles style.css rewrite)
3. Check Network tab for CSS file requests
4. Verify file paths in HTML are relative: `styles/...`
5. Hard refresh to clear CSS cache

---

## Quick Reference

### Critical Files (Must Upload)
```
✓ .htaccess          (URL rewriting & SPA routing)
✓ index.html         (Homepage)
✓ styles.css         (Main stylesheet)
✓ pages/             (All page templates)
✓ scripts/config.js  (API configuration - must point to Render)
```

### API Endpoints (All should call Render)
- Register: `POST https://tmv-backend.onrender.com/api/auth/register`
- Login: `POST https://tmv-backend.onrender.com/api/auth/login`
- Payment: `POST https://tmv-backend.onrender.com/api/payments/create-payment-intent`

### Important URLs
- **Frontend:** `https://tmvbusinesssolutions.co.za`
- **Backend:** `https://tmv-backend.onrender.com`
- **API Base:** `https://tmv-backend.onrender.com/api`
- **Admin Panel:** `https://tmvbusinesssolutions.co.za/pages/admin_login.html`

### Credentials for Testing
```
FTP Server: ftp.tmvbusinesssolutions.co.za
FTP User: tshepisokgamanyane@tmvbusinesssolutions.co.za
FTP Password: Moses@1985

Yoco Test Card: 4111 1111 1111 1111
Yoco Test Expiry: 12/25
Yoco Test CVC: 123
```

---

## Success Indicators

After completing all steps, you should see:

✅ Homepage loads at `https://tmvbusinesssolutions.co.za`
✅ API calls go to `https://tmv-backend.onrender.com/api`
✅ Registration works and creates user account
✅ Login works and stores JWT token
✅ Protected pages accessible only when logged in
✅ Payment modal appears on purchase
✅ Test payment creates transaction in Yoco
✅ Payment success/failure pages display correctly
✅ Console shows no errors (only logs/info messages)
✅ All styling loads correctly

---

## Contact Information

**If issues persist:**
- Check Render backend logs: https://dashboard.render.com
- Check Afrihost panel for file status
- Verify database connection in backend health check
- Review browser console for specific error messages

**Last Updated:** November 19, 2025
**System Status:** Backend ✅ | Database ✅ | Frontend 🔄 (pending FTP)

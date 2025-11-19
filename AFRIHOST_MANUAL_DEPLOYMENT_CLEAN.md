# TMV Business Solutions - Afrihost Manual Deployment Guide

## Overview
This guide helps you manually deploy the TMV Business Solutions project to Afrihost's `public_html` folder since FTP has connection issues.

## What You're Deploying
- **Frontend:** HTML, CSS, JavaScript files (React-like single-page app)
- **Backend:** Node.js Express server (separate - already on Render)
- **Database:** MySQL on Afrihost (already configured)
- **API:** Calls to Render backend at https://tmv-backend.onrender.com/api

## CRITICAL: Do NOT upload these folders/files
- ❌ `node_modules/` - Too large, not needed for frontend
- ❌ `backend/` - Only needed on Render
- ❌ `.git/` - Version control, not needed
- ❌ `package.json` (root) - Backend dependencies
- ❌ `server.js` - Backend code
- ❌ `start.js` - Backend startup
- ❌ `.env` - Secret credentials
- ❌ `ecosystem.config.json` - PM2 config
- ❌ `render.yaml` - Render deployment config
- ❌ `*.md` files - Documentation

## Files/Folders TO upload to public_html

### Root Level Files
```
✓ index.html
✓ styles.css
✓ .htaccess (CRITICAL for SPA routing)
```

### Root Level Folders
```
✓ pages/              - All HTML pages (login, register, payment, etc)
✓ scripts/            - All JavaScript files (config.js, api.js, auth.js, etc)
✓ styles/             - CSS stylesheets
✓ assets/             - payment-modal.js and other assets
✓ images/             - Logo and marketing images
✓ logos/              - Company branding
✓ cart/               - Shopping cart resources
```

## Structure in public_html

After upload, your public_html should look like:
```
public_html/
├── index.html
├── styles.css
├── .htaccess
├── pages/
│   ├── client_login.html
│   ├── client_register.html
│   ├── payment_success.html
│   ├── payment_failed.html
│   └── ... (other pages)
├── scripts/
│   ├── config.js       (CRITICAL - points to Render backend)
│   ├── api.js          (points to Render backend)
│   ├── auth.js
│   ├── login.js
│   └── ... (other scripts)
├── styles/
│   └── ... (CSS files)
├── assets/
│   └── payment-modal.js
├── images/
│   └── ... (image files)
├── logos/
│   └── ... (logo files)
└── cart/
    └── ... (cart files)
```

## Step-by-Step Upload Instructions

### Using FileZilla

1. **Connect to Afrihost FTP**
   - Server: ftp.tmvbusinesssolutions.co.za
   - Port: 21
   - Username: tshepisokgamanyane@tmvbusinesssolutions.co.za
   - Password: Moses@1985

2. **Navigate in FileZilla**
   - Left side: Your local folder with the project files
   - Right side: Should show `public_html` folder

3. **Enter public_html folder on right side**
   - Double-click `public_html` to enter it

4. **IMPORTANT: Enable hidden files**
   - View → Show hidden files
   - This is needed to see and upload `.htaccess`

5. **Upload .htaccess FIRST**
   - Find `.htaccess` in local folder (left side)
   - Right-click → Upload
   - Verify it appears in public_html (right side)

6. **Upload index.html and styles.css**
   - Select both files
   - Right-click → Upload

7. **Upload all folders**
   - Select: pages, scripts, styles, assets, images, logos, cart
   - Right-click → Upload
   - FileZilla will create folder structure automatically

8. **Verify upload complete**
   - All folders and files should appear in public_html on right side
   - `.htaccess` must be present (hidden file)

### Using Afrihost File Manager (Web)

1. **Login to Afrihost Control Panel**
   - https://www.afrihost.com/
   - Find File Manager

2. **Navigate to public_html**

3. **Upload files:**
   - Click Upload button
   - Select files/folders from your computer
   - Upload index.html, styles.css, and all folders

4. **Enable hidden files in File Manager**
   - Look for View options
   - Check "Show hidden files"
   - Upload `.htaccess`

## After Upload - Critical Steps

### 1. Clear Browser Cache
- Hard refresh: **Ctrl+Shift+R** (Windows/Linux)
- Or: **Cmd+Shift+R** (Mac)
- Or: Open in Incognito/Private window

### 2. Test the deployment
- Go to: https://tmvbusinesssolutions.co.za
- Homepage should load

### 3. Verify API Configuration
- Press **F12** (Developer Console)
- Go to **Console** tab
- Type: `APP_CONFIG.API_BASE_URL`
- Should show: `https://tmv-backend.onrender.com/api`

### 4. Test Login
- Click Login button
- Try logging in with test account
- Should call Render backend

### 5. Check Network Requests
- In Developer Console, go to **Network** tab
- Refresh page
- Look for requests to `tmv-backend.onrender.com`
- All API calls should go there

## Environment Configuration

The frontend automatically detects the environment:
- **Development (localhost):** Uses `http://localhost:3000/api`
- **Production (Afrihost):** Uses `https://tmv-backend.onrender.com/api`

This is configured in:
- `scripts/config.js`
- `scripts/api.js`
- All dashboard scripts (login.js, auth.js, etc.)

## API Endpoints Used

When running on Afrihost, all these endpoints are called at Render backend:

```
POST   https://tmv-backend.onrender.com/api/auth/register
POST   https://tmv-backend.onrender.com/api/auth/login
POST   https://tmv-backend.onrender.com/api/auth/logout
GET    https://tmv-backend.onrender.com/api/auth/me
POST   https://tmv-backend.onrender.com/api/payments/create-checkout
GET    https://tmv-backend.onrender.com/api/payments/status/:checkoutId
POST   https://tmv-backend.onrender.com/api/quote-request
POST   https://tmv-backend.onrender.com/api/booking
```

## Database Access

The database is on Afrihost MySQL:
- Host: `tmvbusinesssolutions.co.za`
- Database: `tmvbusw4e7k0_tmvbusinesssolutions`
- User: `tmvbusw4e7k0_tmvbusinesssolutions`

The Render backend connects to this database using environment variables.

## Troubleshooting

### Issue: "Cannot reach server" or 503 errors
**Solution:** 
- Check Render backend is running: https://tmv-backend.onrender.com/api/test
- Should return: `{"message":"Server is running!"}`

### Issue: Login fails with "Network error"
**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Check F12 Console for errors
- Verify API base URL points to Render

### Issue: Pages look broken (no styling)
**Solution:**
- Check `.htaccess` was uploaded (must be at root of public_html)
- Hard refresh browser
- Verify `styles.css` exists in public_html

### Issue: Payment button doesn't work
**Solution:**
- Check `assets/payment-modal.js` was uploaded
- Check F12 Console for Yoco loading errors
- Verify Yoco keys are configured on Render backend

## Support

If you encounter issues:
1. Check browser console (F12) for JavaScript errors
2. Check Network tab to see API calls
3. Check Render logs: https://dashboard.render.com/d/srv-d4e6ma75r7bs73fj46og
4. Verify all files were uploaded to public_html
5. Verify `.htaccess` is present at root

## Next Steps

After successful deployment:
1. Test all login/register flows
2. Test payment integration
3. Monitor Render backend logs for errors
4. Set up uptime monitoring for https://tmvbusinesssolutions.co.za
5. Configure SSL certificate (should be automatic on Afrihost)

---
**Last Updated:** November 19, 2025
**System Status:** Backend ✅ (Render) | Database ✅ (Afrihost MySQL) | Frontend 🔄 (Manual Afrihost Upload)

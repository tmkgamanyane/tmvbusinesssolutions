# 🚀 QUICK START: Manual Upload to Afrihost public_html

## What You Need to Do RIGHT NOW

### Step 1: Gather Files (Already in your project)

These files/folders are ready to upload:
```
✓ index.html
✓ styles.css
✓ .htaccess
✓ pages/
✓ scripts/
✓ styles/
✓ assets/
✓ images/
✓ logos/
✓ cart/
```

**DO NOT UPLOAD:**
- node_modules/ (too large)
- backend/ (backend code)
- server.js, start.js (backend)
- .env (secrets)
- *.md files (documentation)

### Step 2: Upload to Afrihost

**Using FileZilla:**

1. Open FileZilla
2. Connect to: `ftp.tmvbusinesssolutions.co.za:21`
3. Username: `tshepisokgamanyane@tmvbusinesssolutions.co.za`
4. Password: `Moses@1985`
5. Navigate to `public_html` folder
6. **Enable hidden files:** View → Show hidden files
7. **Upload in this order:**
   - `.htaccess` FIRST (hidden file, critical)
   - `index.html`
   - `styles.css`
   - Then all folders: `pages/`, `scripts/`, `styles/`, `assets/`, `images/`, `logos/`, `cart/`

**Expected upload time:** 5-15 minutes

### Step 3: Test

After upload:

1. **Clear browser cache:** Ctrl+Shift+R
2. **Visit:** https://tmvbusinesssolutions.co.za
3. **Homepage should load** with styling

### Step 4: Verify Everything Works

**In browser console (F12):**
```javascript
APP_CONFIG.API_BASE_URL
// Should return: https://tmv-backend.onrender.com/api
```

**Try to login:**
- Login page should be accessible
- API calls should go to Render backend
- Should show login/register forms

---

## Files Reference

See detailed files info in:
- `AFRIHOST_MANUAL_DEPLOYMENT_CLEAN.md` - Complete deployment guide
- `FILES_TO_UPLOAD.md` - All files and folders explained
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

## Configuration Already Done

✅ All API endpoints point to: `https://tmv-backend.onrender.com/api`
✅ All scripts configured for Afrihost production
✅ Backend running on Render (separate)
✅ Database connected to Afrihost MySQL
✅ CORS configured to accept requests

**Nothing else needs configuration - just upload and test!**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find page" | Check .htaccess uploaded to public_html root |
| "No styling" | Check styles.css and styles/ folder uploaded |
| "API error" | Check Render backend: https://tmv-backend.onrender.com/api/test |
| "Login fails" | Hard refresh browser (Ctrl+Shift+R) |
| "Hidden files not visible" | Enable in FileZilla: View → Show hidden files |

---

**You're ready to upload! Follow the steps above and your site will be live.** 

For detailed guidance, see: `AFRIHOST_MANUAL_DEPLOYMENT_CLEAN.md`


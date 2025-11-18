# 🚀 DEPLOY NOW - Quick Start

**Start here if you want to deploy immediately!**

---

## Step 1: Push to GitHub (2 minutes)

```powershell
git add .
git commit -m "Configure for Render + Afrihost deployment"
git push origin main
```

✅ Verify at: https://github.com/tmkgamanyane/tmvbusinesssolutions

---

## Step 2: Deploy to Render (5 minutes)

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub: `tmkgamanyane/tmvbusinesssolutions`
4. Configure:
   - Name: `tmv-backend`
   - Branch: `main`
   - Build: `npm install`
   - Start: `node server.js`
   - Plan: `Free`

5. Click **"Advanced"** and add these environment variables:

```bash
DB_HOST=mysql.afrihost.com
DB_PORT=3306
DB_NAME=tmvbusinesssolutions
DB_USER=tmvbusinesssolutions
DB_PASSWORD=Moses@1985

EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_USER=architecture@tmvbusinesssolutions.co.za
EMAIL_PASS=your_email_password

YOCO_PUBLIC_KEY=pk_live_cdb8540cen7gg6q11c54
YOCO_SECRET_KEY=your_live_secret_key

CLIENT_URL=https://tmvbusinesssolutions.co.za
BASE_URL=https://tmvbusinesssolutions.co.za
```

6. Click **"Create Web Service"**
7. Wait 2-3 minutes for deployment

✅ Test: https://tmv-backend.onrender.com/api/health

---

## Step 3: Upload to Afrihost (10 minutes)

1. Open FileZilla (or FTP client)
2. Connect:
   - Host: `ftp.tmvbusinesssolutions.co.za`
   - Username: *(your FTP username)*
   - Password: *(your FTP password)*

3. Upload to `/public_html/`:
   - `.htaccess` ← MUST upload this!
   - `index.html`
   - `styles.css`
   - `scripts.js`
   - `pages/` folder
   - `scripts/` folder
   - `styles/` folder
   - `assets/` folder
   - `images/` folder
   - `logos/` folder

4. **DO NOT** upload:
   - `server.js`
   - `backend/` folder
   - `node_modules/`
   - `package.json`

✅ Test: https://tmvbusinesssolutions.co.za/

---

## Step 4: Setup Database (5 minutes)

1. Log in to Afrihost Control Panel
2. Go to **"MySQL Databases"**
3. Create database (if not exists):
   - Name: `tmvbusinesssolutions`
   - User: `tmvbusinesssolutions`
   - Password: `Moses@1985`
4. Open **phpMyAdmin**
5. Select database → Import → Choose `database-setup.sql` → Go

✅ Check Render logs for: "Connected to MySQL database"

---

## Step 5: Enable SSL (2 minutes)

1. Afrihost Control Panel → **"SSL Certificates"**
2. Select **"Let's Encrypt"** (free)
3. Enable for both:
   - `tmvbusinesssolutions.co.za`
   - `www.tmvbusinesssolutions.co.za`

✅ Test: https://tmvbusinesssolutions.co.za/ (should have green padlock)

---

## Step 6: Test Everything (5 minutes)

Open browser console and test:

```javascript
// Test API health
fetch('https://tmvbusinesssolutions.co.za/api/health')
  .then(r => r.json())
  .then(d => console.log(d));
// Expected: {status: "ok"}

// Test form submission
// 1. Go to: https://tmvbusinesssolutions.co.za/pages/it_infrastructure.html
// 2. Fill form and submit
// 3. Check email inbox for confirmation
```

✅ All tests pass? **You're live!** 🎉

---

## 🐛 Quick Fixes

**"502 Error"**: Wait 60 seconds (Render cold start), then refresh

**"CORS Error"**: Check CLIENT_URL in Render dashboard

**"Email not sending"**: Verify EMAIL_PASS in Render dashboard

**"Database error"**: Contact Afrihost to allow Render connections

---

## 📚 Need More Details?

- **Complete Guide**: See `RENDER_DEPLOYMENT_GUIDE.md`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md`
- **Architecture**: See `AFRIHOST_RENDER_SETUP.md`

---

## ✅ Success!

Your site is live at:
- 🌐 **Frontend**: https://tmvbusinesssolutions.co.za
- ⚙️ **Backend**: https://tmv-backend.onrender.com

**Total Time**: ~30 minutes

---

**Questions?** Check troubleshooting sections in the detailed guides.

Good luck! 🚀

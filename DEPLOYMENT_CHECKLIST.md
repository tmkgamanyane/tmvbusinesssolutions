# 🚀 Quick Deployment Checklist

**TMV Business Solutions - Render + Afrihost Deployment**

---

## ✅ Pre-Deployment Verification

### 1. Code is Ready
- [ ] Latest code committed to GitHub
- [ ] `render.yaml` configured with environment variables
- [ ] `.htaccess` proxies to `https://tmv-backend.onrender.com`
- [ ] `server.js` CORS allows Afrihost domain
- [ ] All dependencies in `package.json`

### 2. Credentials Gathered
- [ ] Afrihost MySQL hostname: `__________________`
- [ ] Database name: `tmvbusinesssolutions`
- [ ] Database user: `tmvbusinesssolutions`
- [ ] Database password: `Moses@1985`
- [ ] Email password for `architecture@tmvbusinesssolutions.co.za`: `__________________`
- [ ] Yoco LIVE secret key: `__________________`
- [ ] Yoco LIVE public key: `pk_live_cdb8540cen7gg6q11c54`

---

## 🎯 Deployment Steps

### Step 1: Deploy to Render (30 minutes)

1. **Create Web Service**
   - [ ] Go to https://dashboard.render.com/
   - [ ] Click "New +" → "Web Service"
   - [ ] Connect GitHub: `tmkgamanyane/tmvbusinesssolutions`
   - [ ] Name: `tmv-backend`
   - [ ] Region: `Frankfurt (EU Central)`
   - [ ] Branch: `main`
   - [ ] Build: `npm install`
   - [ ] Start: `node server.js`
   - [ ] Plan: `Free`

2. **Add Environment Variables** (click "Advanced")
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=mysql.afrihost.com
   DB_PORT=3306
   DB_NAME=tmvbusinesssolutions
   DB_USER=tmvbusinesssolutions
   DB_PASSWORD=Moses@1985
   SESSION_SECRET=<generate random>
   JWT_SECRET=<generate random>
   EMAIL_HOST=mail.afrihost.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=architecture@tmvbusinesssolutions.co.za
   EMAIL_PASS=<your email password>
   YOCO_SECRET_KEY=<your live secret key>
   YOCO_PUBLIC_KEY=pk_live_cdb8540cen7gg6q11c54
   CLIENT_URL=https://tmvbusinesssolutions.co.za
   BASE_URL=https://tmvbusinesssolutions.co.za
   ```

3. **Deploy**
   - [ ] Click "Create Web Service"
   - [ ] Wait 2-5 minutes
   - [ ] Verify "Live" status

4. **Test Backend**
   - [ ] Open: https://tmv-backend.onrender.com/
   - [ ] Test: https://tmv-backend.onrender.com/api/health
   - [ ] Check logs for: "✅ Email server is ready"

---

### Step 2: Upload to Afrihost (20 minutes)

1. **Prepare Files**
   - [ ] Open FileZilla (or FTP client)
   - [ ] Connect to: `ftp.tmvbusinesssolutions.co.za`
   - [ ] Use Afrihost FTP credentials

2. **Upload Frontend Only**
   ```
   Upload these folders/files to /public_html/:
   - .htaccess
   - index.html
   - styles.css
   - scripts.js
   - pages/
   - scripts/
   - styles/
   - assets/
   - images/
   - logos/
   - cart/
   
   DO NOT upload:
   - server.js
   - backend/
   - node_modules/
   - package.json
   - .env
   ```

3. **Verify Upload**
   - [ ] Open: https://tmvbusinesssolutions.co.za/
   - [ ] Check browser console for errors

---

### Step 3: Configure Afrihost MySQL (15 minutes)

1. **Create Database** (if not exists)
   - [ ] Log in to Afrihost Control Panel
   - [ ] MySQL Databases → Create
   - [ ] Name: `tmvbusinesssolutions`
   - [ ] User: `tmvbusinesssolutions`
   - [ ] Password: `Moses@1985`
   - [ ] Note the hostname (e.g., `mysql.afrihost.com`)

2. **Import Schema**
   - [ ] Open phpMyAdmin
   - [ ] Select `tmvbusinesssolutions` database
   - [ ] Import → Choose `database-setup.sql`
   - [ ] Click "Go"

3. **Enable Remote Access**
   - [ ] Contact Afrihost Support
   - [ ] Request: Allow Render.com connections to MySQL
   - [ ] Wait for confirmation

---

### Step 4: Enable SSL (10 minutes)

1. **Let's Encrypt (Free)**
   - [ ] Afrihost Control Panel → SSL Certificates
   - [ ] Select "Let's Encrypt"
   - [ ] Enable for: `tmvbusinesssolutions.co.za`
   - [ ] Enable for: `www.tmvbusinesssolutions.co.za`
   - [ ] Enable auto-renewal

2. **Verify SSL**
   - [ ] Open: https://tmvbusinesssolutions.co.za/
   - [ ] Check for green padlock
   - [ ] No SSL warnings

---

### Step 5: Test Everything (15 minutes)

#### Basic Tests
- [ ] Homepage loads: https://tmvbusinesssolutions.co.za/
- [ ] WWW redirects: https://www.tmvbusinesssolutions.co.za/ → non-www
- [ ] HTTPS works (no errors)
- [ ] API responds: Open console, run:
  ```javascript
  fetch('https://tmvbusinesssolutions.co.za/api/health')
    .then(r => r.json())
    .then(d => console.log(d));
  ```

#### Form Tests
- [ ] IT Infrastructure form submits
- [ ] Architecture form submits
- [ ] Business Plan form submits
- [ ] No CORS errors in console
- [ ] Emails received in correct inboxes

#### Auth Tests
- [ ] User registration works
- [ ] User login works
- [ ] Session persists

#### Payment Test
- [ ] Payment modal opens
- [ ] Can proceed to Yoco (use test amount)

---

## 🐛 Quick Troubleshooting

### "502 Bad Gateway" on API
**Fix**: Wait 60 seconds for Render cold start, then retry

### "Database connection failed"
**Fix**: Contact Afrihost to allow Render IP connections

### "Email not sending"
**Fix**: Verify EMAIL_PASS in Render environment variables

### "CORS error"
**Fix**: Check CLIENT_URL=https://tmvbusinesssolutions.co.za in Render

### "Render service sleeping"
**Fix**: Set up UptimeRobot: https://uptimerobot.com/

---

## 📋 Post-Deployment

### Immediate (Today)
- [ ] Monitor Render logs for 1 hour
- [ ] Test all forms
- [ ] Verify emails arrive
- [ ] Share URL with team

### This Week
- [ ] Set up UptimeRobot monitor
- [ ] Enable Render email notifications
- [ ] Document all credentials in password manager
- [ ] Test payment with real transaction

### Monthly
- [ ] Check Afrihost bandwidth usage
- [ ] Review Render metrics
- [ ] Verify SSL certificate auto-renewal
- [ ] Backup database

---

## 🎯 Success Criteria

You're done when:

✅ Render status shows "Live" (green)
✅ Homepage loads with no console errors
✅ API health check returns `{"status":"ok"}`
✅ Forms submit successfully
✅ Emails arrive in correct inboxes
✅ No CORS errors
✅ Database queries work (login/register)
✅ SSL certificate valid

---

## 📞 Need Help?

- **Render Logs**: https://dashboard.render.com/ → tmv-backend → Logs
- **Afrihost Support**: 087 944 0000 | support@afrihost.com
- **Detailed Guide**: See `RENDER_DEPLOYMENT_GUIDE.md`
- **Afrihost Setup**: See `AFRIHOST_RENDER_SETUP.md`

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Render URL**: https://tmv-backend.onrender.com
**Live URL**: https://tmvbusinesssolutions.co.za

Good luck! 🚀

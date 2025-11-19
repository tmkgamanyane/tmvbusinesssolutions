# TMV Business Solutions - Quick FTP Deployment Reference

## 🚀 Quick Deploy (3 Steps)

### Step 1: Deploy Frontend to Afrihost

**Linux/Mac/Git Bash:**
```bash
./deploy-ftp.sh
```

**Windows PowerShell:**
```powershell
.\deploy-to-afrihost.ps1
```

**Windows Command Prompt:**
```batch
deploy.bat
```

### Step 2: Verify Deployment

```bash
./verify-deployment.sh https://tmvbusinesssolutions.co.za
```

Or manually visit:
- https://tmvbusinesssolutions.co.za/api/status/comprehensive

### Step 3: Test Critical Features

1. **Homepage**: https://tmvbusinesssolutions.co.za
2. **Login**: https://tmvbusinesssolutions.co.za/pages/client_login.html
3. **Payment**: Test checkout flow
4. **Email**: Submit a form and check email delivery

---

## 📋 FTP Credentials

```
Host:     ftp.tmvbusinesssolutions.co.za
Port:     21
Protocol: FTP
Username: tshepisokgamanyane@tmvbusinesssolutions.co.za
Password: Moses@1985
Directory: / (root)
```

---

## 🔍 Quick Status Check

**API Health:**
```bash
curl https://tmvbusinesssolutions.co.za/api/health
```

**Comprehensive Status:**
```bash
curl https://tmvbusinesssolutions.co.za/api/status/comprehensive
```

**Test Endpoint:**
```bash
curl https://tmvbusinesssolutions.co.za/api/test
```

---

## 📁 Files Deployed

### ✅ Include (Frontend Only)
- `.htaccess` ← **CRITICAL**
- `index.html`
- `styles.css`
- `pages/` - All HTML pages
- `scripts/` - JavaScript files
- `styles/` - CSS stylesheets
- `assets/` - Images and resources
- `images/` - Marketing materials
- `logos/` - Branding
- `cart/` - Shopping cart

### ❌ Exclude (Backend)
- `backend/` - Backend code
- `node_modules/` - Dependencies
- `server.js` - Server file
- `package.json` - Dependencies
- `.env` - Environment variables
- `.git/` - Git repository
- `*.md` - Documentation

---

## 🔧 Backend Options

### Option A: Backend on Render (Current)
- Already deployed at: https://tmv-backend.onrender.com
- No changes needed
- .htaccess proxies API calls automatically

### Option B: Backend on Afrihost (If Node.js supported)
1. Upload backend files to separate directory
2. Run: `npm install`
3. Run: `pm2 start ecosystem.config.json --env production`
4. Update .htaccess to proxy to localhost:3000

---

## 🗄️ Database Setup (Afrihost MySQL)

### Create Database
1. Log in to Afrihost Control Panel
2. MySQL Databases → Create New
3. Database: `tmvbusinesssolutions`
4. Username: `tmvbusinesssolutions`
5. Password: `Moses@1985`

### Import Schema
- Via phpMyAdmin: Import `database-setup.sql`
- Or let Node.js auto-create tables on first run

---

## 📧 Email Configuration (Afrihost SMTP)

```env
EMAIL_HOST=mail.afrihost.com
EMAIL_PORT=587
EMAIL_USER=architecture@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=Tshepiso@1985
```

---

## 🔒 SSL Certificate

### Enable Let's Encrypt (Free)
1. Afrihost Control Panel → SSL Certificates
2. Select: Let's Encrypt
3. Enable for: `tmvbusinesssolutions.co.za` and `www.tmvbusinesssolutions.co.za`
4. Auto-renewal: Enabled

---

## ⚠️ Troubleshooting

### 502 Bad Gateway
- Backend not running or sleeping
- Wake up: `curl https://tmv-backend.onrender.com/api/health`

### CORS Errors
- Check .htaccess is uploaded
- Verify CORS headers in browser DevTools

### Database Connection Failed
- Check credentials in .env
- Verify database exists in Afrihost panel
- Test: `mysql -h localhost -u tmvbusinesssolutions -p`

### Email Not Sending
- Verify SMTP credentials
- Check email account is active
- Test endpoint: `/api/test-email`

### .htaccess Not Working
- Ensure file uploaded to root directory
- Contact Afrihost to enable mod_rewrite and mod_proxy
- Check file isn't renamed (must be exactly `.htaccess`)

---

## 📊 API Endpoints

### Health & Status
- `GET /api/health` - Basic health check
- `GET /api/status/comprehensive` - Detailed system status
- `GET /api/test` - Simple connectivity test
- `GET /api/test-db` - Database diagnostics
- `GET /api/test-email` - Email test

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user session

### Payments (Yoco)
- `GET /api/payments/public-key` - Get Yoco public key
- `POST /api/payments/create-checkout` - Create checkout session
- `POST /api/payments/process-payment` - Process payment
- `GET /api/payments/status/:checkoutId` - Check payment status

### Jobs
- `GET /api/jobs` - List job postings
- `POST /api/jobs` - Create job posting
- `GET /api/jobs/:id` - Get specific job
- `POST /api/jobs/:id/applications` - Submit application

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Homepage loads without errors
- [ ] All CSS/JS files load correctly
- [ ] API health check returns 200 OK
- [ ] User registration works
- [ ] User login works and session persists
- [ ] Payment gateway loads (Yoco modal)
- [ ] Email notifications send
- [ ] No CORS errors in browser console
- [ ] HTTPS enforced (no mixed content warnings)
- [ ] www redirects to non-www
- [ ] All pages accessible

---

## 📞 Support Contacts

**Afrihost Support**
- Email: support@afrihost.com
- Phone: 087 944 0000
- Web: https://www.afrihost.com/support

**For Detailed Documentation**
- See: `AFRIHOST_FTP_DEPLOYMENT.md`
- See: `MANUAL_FTP_DEPLOYMENT_GUIDE.md`
- See: `AFRIHOST_RENDER_SETUP.md`

---

## 💡 Pro Tips

1. **Always clear browser cache** after deployment (Ctrl+Shift+R)
2. **Test in incognito mode** to avoid cached content
3. **Monitor API responses** in browser DevTools → Network tab
4. **Check server logs** regularly for errors
5. **Use verification script** after each deployment

---

## 🎯 One-Line Deploy & Verify

```bash
./deploy-ftp.sh && sleep 5 && ./verify-deployment.sh https://tmvbusinesssolutions.co.za
```

---

**Last Updated:** November 19, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅

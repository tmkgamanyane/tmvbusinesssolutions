# TMV Business Solutions - Afrihost Quick Start Guide

## 🚀 Deploy to Afrihost with Node.js in 5 Steps

This is a simplified guide to get your application running on Afrihost with Node.js support.

---

## Prerequisites

✅ Afrihost account with **Node.js enabled**  
✅ FTP/cPanel credentials  
✅ Domain pointing to your Afrihost server

---

## Step 1: Prepare Deployment Package

Run the deployment preparation script:

```bash
# Linux/Mac/Git Bash
./deploy-afrihost-nodejs.sh
```

This creates a deployment package in `/tmp/tmv-afrihost-deploy/` with all necessary files.

---

## Step 2: Upload Files to Afrihost

### Option A: FTP Client (FileZilla/WinSCP)

1. Connect to FTP:
   - Host: `ftp.tmvbusinesssolutions.co.za`
   - Port: `21`
   - Username: Your Afrihost FTP username
   - Password: Your Afrihost FTP password

2. Navigate to `public_html` folder

3. Upload **all contents** from `/tmp/tmv-afrihost-deploy/`

### Option B: cPanel File Manager

1. Login: `https://cpanel.tmvbusinesssolutions.co.za`
2. Open **File Manager**
3. Go to `public_html`
4. Click **Upload**
5. Select all files from `/tmp/tmv-afrihost-deploy/`
6. Wait for upload to complete

---

## Step 3: Configure Environment Variables

Before starting the server, configure your environment:

1. On the server, edit the `.env` file in `public_html`
2. Update these critical values:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Email Configuration
EMAIL_USER=your_email@tmvbusinesssolutions.co.za
EMAIL_PASSWORD=your_email_password

# Payment Gateway
YOCO_PUBLIC_KEY=pk_live_your_public_key
YOCO_SECRET_KEY=sk_live_your_secret_key

# JWT Secret (generate a random string)
JWT_SECRET=your_random_secret_here_make_it_long_and_complex
```

---

## Step 4: Install Dependencies & Start Server

SSH into your Afrihost server and run:

```bash
# Navigate to project directory
cd ~/public_html

# Install dependencies (takes 2-5 minutes)
npm install --production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.json --env production
pm2 save
pm2 startup
# Run the command that PM2 outputs

# Verify it's running
pm2 status
pm2 logs tmvbusinesssolutions
```

### Alternative: Start with nohup (simpler)

```bash
cd ~/public_html
nohup npm start > server.log 2>&1 &

# Check if running
ps aux | grep node
tail -f server.log
```

---

## Step 5: Verify Deployment

### Check Server Status

```bash
# Check if Node.js is listening
netstat -an | grep 3000

# Test API endpoint
curl http://localhost:3000/api/health
```

### Test in Browser

1. Open: `https://tmvbusinesssolutions.co.za`
2. Homepage should load without errors
3. Open console (F12) - no errors should appear
4. Try login/registration to test API

### Check Logs

```bash
# PM2 logs
pm2 logs tmvbusinesssolutions --lines 50

# Or nohup logs
tail -f ~/public_html/server.log
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Website loads: https://tmvbusinesssolutions.co.za
- [ ] API responds: `curl https://tmvbusinesssolutions.co.za/api/health`
- [ ] Login/Registration works
- [ ] Database queries work (no connection errors in logs)
- [ ] Email notifications send
- [ ] Payment gateway initializes (Yoco modal appears)
- [ ] SSL/HTTPS working (padlock icon in browser)
- [ ] No CORS errors in browser console

---

## 🔧 Quick Troubleshooting

### Server won't start?

```bash
# Check syntax
node -c server.js

# Check if .env exists
ls -la .env

# Reinstall dependencies
rm -rf node_modules
npm install --production

# Check logs
pm2 logs tmvbusinesssolutions --err
```

### Database connection fails?

```bash
# Test database connection
mysql -u your_db_user -p -h localhost your_db_name

# Verify .env credentials
cat .env | grep DB_

# Restart after fixing
pm2 restart tmvbusinesssolutions
```

### API returns 502?

```bash
# Check if Node.js is running
ps aux | grep node
netstat -an | grep 3000

# Check .htaccess proxies to localhost:3000
cat .htaccess | grep localhost

# Test Node.js directly
curl http://localhost:3000/api/health

# Restart server
pm2 restart tmvbusinesssolutions
```

---

## 📞 Need Help?

### Detailed Documentation
- **Full Guide**: `AFRIHOST_NODEJS_DEPLOYMENT.md`
- **Checklist**: `AFRIHOST_CHECKLIST.md`
- **Environment Template**: `.env.afrihost`

### Support Contacts
- **Afrihost Support**: support@afrihost.com | 087 944 0000
- **Application Support**: architecture@tmvbusinesssolutions.co.za

---

## 🎯 Key Configuration Files

| File | Purpose |
|------|---------|
| `.htaccess` | Proxies /api/* to localhost:3000 |
| `.env` | Environment variables (database, email, payment keys) |
| `server.js` | Main Node.js application |
| `ecosystem.config.json` | PM2 process manager configuration |
| `package.json` | Node.js dependencies |

---

## 🔄 Update Existing Deployment

```bash
# On server
cd ~/public_html

# Pull latest code (if using git)
git pull origin main

# Update dependencies
npm install --production

# Restart application
pm2 restart tmvbusinesssolutions

# Check logs
pm2 logs tmvbusinesssolutions
```

---

## 📊 Monitor Your Application

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs tmvbusinesssolutions

# Monitor CPU/Memory
pm2 monit

# Check disk space
df -h
```

---

**Ready to deploy?** Run `./deploy-afrihost-nodejs.sh` to get started!

---

**Version**: 1.0  
**Last Updated**: November 2024  
**Status**: Production Ready ✅

# 🚀 Deploy to Afrihost with Node.js - Getting Started

## Overview

This project is now configured for deployment to Afrihost hosting with **local Node.js support**. Both the frontend and backend will run on the same Afrihost server.

## ⚡ Quick Deploy (3 Commands)

```bash
# 1. Prepare deployment package
./deploy-afrihost-nodejs.sh

# 2. Upload to Afrihost (use FTP client, cPanel, or command line)
# Files will be in: /tmp/tmv-afrihost-deploy/

# 3. SSH into Afrihost and run:
cd ~/public_html
npm install --production
pm2 start ecosystem.config.json --env production
```

That's it! Your site should now be live at https://tmvbusinesssolutions.co.za

## 📚 Documentation

We've created comprehensive documentation to guide you through the deployment:

### 📖 Main Guides

1. **[AFRIHOST_QUICK_START.md](AFRIHOST_QUICK_START.md)**
   - ⏱️ 5-minute quick start guide
   - Perfect if you want to deploy fast
   - Step-by-step with success checklist

2. **[AFRIHOST_NODEJS_DEPLOYMENT.md](AFRIHOST_NODEJS_DEPLOYMENT.md)**
   - 📋 Complete deployment guide
   - Detailed instructions for every step
   - Troubleshooting section
   - Monitoring and maintenance tips

### 🛠️ Tools Provided

1. **`deploy-afrihost-nodejs.sh`**
   - Automated deployment preparation
   - Creates clean deployment package
   - Interactive prompts for guidance

2. **`.env.afrihost`**
   - Environment configuration template
   - Fill in your credentials
   - Copy to `.env` before deploying

## 🔧 What Changed

We've configured the project specifically for Afrihost Node.js hosting:

### ✅ Configuration Updates

- **`.htaccess`** - Now proxies API requests to `localhost:3000` (your local Node.js server)
- **`ecosystem.config.json`** - Uses relative paths for flexibility
- **Deployment Scripts** - New tools for easy deployment

### 🏗️ Architecture

```
Afrihost Server (tmvbusinesssolutions.co.za)
├── Apache Web Server
│   ├── Serves static files (HTML, CSS, JS, images)
│   └── Proxies /api/* to localhost:3000 (via .htaccess)
│
├── Node.js Server (port 3000)
│   ├── Express API endpoints
│   ├── Authentication
│   ├── Payment processing (Yoco)
│   └── Email notifications
│
├── MySQL Database
└── Email (SMTP)
```

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ Afrihost hosting account with **Node.js enabled**
- ✅ cPanel/FTP access credentials
- ✅ Domain pointing to your Afrihost server
- ✅ MySQL database created in cPanel
- ✅ Email account configured
- ✅ Yoco payment keys (live mode)

## 🎯 Deployment Checklist

Use this checklist to track your deployment:

### Phase 1: Preparation
- [ ] Run `./deploy-afrihost-nodejs.sh`
- [ ] Review deployment package in `/tmp/tmv-afrihost-deploy/`
- [ ] Verify `.env` file has correct credentials
- [ ] Ensure all critical files are present (.htaccess, server.js, package.json)

### Phase 2: Upload
- [ ] Connect to Afrihost via FTP/cPanel
- [ ] Upload all files from `/tmp/tmv-afrihost-deploy/` to `public_html`
- [ ] Verify `.htaccess` uploaded correctly
- [ ] Verify `.env` uploaded (may need to enable "show hidden files")

### Phase 3: Server Setup
- [ ] SSH into Afrihost server
- [ ] Navigate to `~/public_html`
- [ ] Run `npm install --production`
- [ ] Start server with PM2 or nohup
- [ ] Verify server is running (pm2 status or ps aux | grep node)

### Phase 4: Verification
- [ ] Visit https://tmvbusinesssolutions.co.za
- [ ] Check homepage loads without errors
- [ ] Test API: `curl https://tmvbusinesssolutions.co.za/api/health`
- [ ] Test login/registration
- [ ] Verify database connection
- [ ] Test payment gateway
- [ ] Check email notifications

## 🚨 Common Issues & Solutions

### Server won't start
```bash
# Check for errors
pm2 logs tmvbusinesssolutions --err

# Verify .env exists
ls -la .env

# Reinstall dependencies
rm -rf node_modules
npm install --production
```

### Database connection fails
```bash
# Test connection
mysql -u your_db_user -p -h localhost your_db_name

# Check credentials in .env
cat .env | grep DB_

# Restart server
pm2 restart tmvbusinesssolutions
```

### API returns 502
```bash
# Check if Node.js is running
ps aux | grep node
netstat -an | grep 3000

# Verify .htaccess proxies to localhost:3000
cat .htaccess | grep localhost:3000

# Test direct connection
curl http://localhost:3000/api/health
```

## 📞 Support

### Documentation
- Quick Start: [AFRIHOST_QUICK_START.md](AFRIHOST_QUICK_START.md)
- Full Guide: [AFRIHOST_NODEJS_DEPLOYMENT.md](AFRIHOST_NODEJS_DEPLOYMENT.md)
- Checklist: [AFRIHOST_CHECKLIST.md](AFRIHOST_CHECKLIST.md)

### Afrihost Support
- Website: https://www.afrihost.com/support
- Email: support@afrihost.com
- Phone: 087 944 0000

### Application Support
- Email: architecture@tmvbusinesssolutions.co.za

## 🔍 What's Different from Render Deployment?

Previously, the backend was hosted on Render.com and the frontend on Afrihost. Now everything runs on Afrihost:

| Aspect | Before (Render) | After (Afrihost Node.js) |
|--------|-----------------|--------------------------|
| **Backend Host** | Render.com | Afrihost (localhost:3000) |
| **API Proxy** | https://tmv-backend.onrender.com | http://localhost:3000 |
| **Cold Starts** | Yes (Render free tier sleeps) | No (always running) |
| **Setup Complexity** | Two separate deployments | Single unified deployment |
| **Cost** | Render free tier | Included in Afrihost plan |

## 💡 Tips for Success

1. **Always configure .env first** - The application won't work without proper environment variables
2. **Use PM2 for production** - It keeps your app running and restarts on crashes
3. **Enable "show hidden files"** in cPanel - You need to see .htaccess and .env
4. **Test locally first** - Run `npm start` locally to catch any issues before deploying
5. **Monitor logs regularly** - Use `pm2 logs` to catch issues early
6. **Set up backups** - Backup your database and files regularly
7. **Use SSL/HTTPS** - Afrihost provides free Let's Encrypt certificates

## 🎓 Learning Resources

### Node.js on Afrihost
- Contact Afrihost support to verify Node.js is enabled
- Check available Node.js versions in cPanel
- PM2 documentation: https://pm2.keymetrics.io/docs/usage/quick-start/

### Application Monitoring
```bash
# Check server status
pm2 status

# View real-time logs
pm2 logs tmvbusinesssolutions

# Monitor CPU/Memory
pm2 monit

# Restart if needed
pm2 restart tmvbusinesssolutions
```

## 🎉 Success!

Once deployed successfully:
- ✅ Your site loads at https://tmvbusinesssolutions.co.za
- ✅ Users can register and login
- ✅ Payments work through Yoco
- ✅ Emails send properly
- ✅ No errors in browser console or server logs

Congratulations! Your TMV Business Solutions platform is now live on Afrihost! 🚀

---

**Need help?** Start with [AFRIHOST_QUICK_START.md](AFRIHOST_QUICK_START.md) for a quick deployment, or read [AFRIHOST_NODEJS_DEPLOYMENT.md](AFRIHOST_NODEJS_DEPLOYMENT.md) for detailed instructions.

**Version**: 1.0  
**Last Updated**: November 2024  
**Status**: Production Ready ✅

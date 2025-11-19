# Afrihost Public_HTML Files - What to Upload

## Quick Reference

**Total files to upload: ~45-50 files**
**Total size: ~12-15 MB**
**Upload order: Critical files first, then folders**

---

## ✅ FILES TO UPLOAD (Upload these)

### Critical Root Files (UPLOAD FIRST)
```
.htaccess                    [CRITICAL - MUST be first]
.env                         [CRITICAL - Rename from .env.afrihost]
.env.afrihost                [Only if uploading template]
package.json                 [Required for npm install]
package-lock.json            [Optional, can regenerate]
```

### Server Files
```
server.js                    [Main Express server]
start.js                     [Server startup wrapper]
scripts.js                   [Database/utility functions]
```

### Frontend Root Files
```
index.html                   [Homepage]
styles.css                   [Global styles]
LIVE_DEPLOYMENT_GUIDE.md     [Deployment reference]
README.md                    [Project documentation]
```

### API Configuration
```
backend/email-service.js     [Email handling]
backend/tunnel.js            [Database tunnel]
backend/package.json         [Backend dependencies list]
```

### Folders to Upload (ALL)

#### 1. pages/ folder (43 HTML files)
```
pages/accounting_services_clean.html
pages/accounting_services_simple.html
pages/accounting_services.html
pages/admin_dashboard.html
pages/admin_login.html
pages/admin_manage_users.html
pages/admin_setup.html
pages/architectural_services.html
pages/branding_identity.html
pages/business_consulting_simple.html
pages/business_consulting.html
pages/careers_employer_portal.html
pages/client_login.html
pages/company_registration.html
pages/employer_admin_dashboard.html
pages/employer_auth.html
pages/employer_dashboard.html
pages/employer_management_dashboard.html
pages/employer_portal.html
pages/hr_login.html
pages/it_infrastructure.html
pages/jobseeker_auth.html
pages/jobseeker_dashboard.html
pages/jobseeker_login.html
pages/legal.html
pages/login_debugger.html
pages/management_sections.html
pages/manager_login.html
pages/marketing_services.html
pages/other.html
pages/payment_cancelled.html
pages/payment_demo.html
pages/payment_failed.html
pages/payment_success.html
pages/payment-cancelled.html
pages/payment-failed.html
pages/payment-success.html
pages/payment-test.html
pages/registration_success.html
pages/sars_services.html
pages/server-status.html
pages/social_media_growth.html
pages/structured_packages.html
pages/web_design.html
```

#### 2. scripts/ folder (JavaScript files - API calls, auth, etc)
```
scripts/admin_dashboard.js
scripts/admin_manage_users.js
scripts/advanced-search-system.js
scripts/api.js                    [CRITICAL - API endpoints config]
scripts/auth-check-simple.js
scripts/auth-check.js
scripts/auth.js
scripts/cart.js
scripts/config.js
scripts/dashboard-analytics.js
scripts/employer_admin_dashboard.js
scripts/employer_auth.js
scripts/employer_dashboard.js
scripts/employer_management_dashboard.js
scripts/enhanced-application-workflow.js
scripts/enhanced-form-validation.js
scripts/jobseeker_dashboard.js
scripts/jobseeker-auth.js
scripts/jobseeker-login.js
scripts/jobseeker-portal.js
scripts/login.js
scripts/payment-modal.js
scripts/services.js
scripts/utils.js
[Plus any additional .js files in scripts/]
```

#### 3. styles/ folder (CSS files)
```
styles/main.css
styles/responsive.css
styles/dashboard.css
styles/auth.css
styles/payment.css
[All other .css files in styles/]
```

#### 4. assets/ folder (Images, icons, etc)
```
assets/payment-modal.js
assets/[all image files]
assets/[all SVG files]
[All files in assets/]
```

#### 5. images/ folder (All images)
```
images/[all .jpg, .png, .gif files]
```

#### 6. logos/ folder (Brand logos)
```
logos/[all logo files]
```

#### 7. cart/ folder (Shopping cart)
```
cart/[all cart-related files]
```

#### 8. backend/database/ folder (Database configuration)
```
backend/database/config.js
backend/database/migrations/[all migration files]
backend/database/seeders/[all seeder files if exist]
```

#### 9. backend/middleware/ folder (Express middleware)
```
backend/middleware/[all middleware files]
```

#### 10. backend/models/ folder (Sequelize models)
```
backend/models/[all model files]
```

#### 11. backend/routes/ folder (API routes)
```
backend/routes/[all route files]
```

---

## ❌ FILES NOT TO UPLOAD (Skip these)

### System Files
```
.git/                        [Git repository - not needed on server]
.gitignore                   [Git config - not needed on server]
node_modules/                [Will be created by npm install]
.vscode/                     [Editor settings - not needed on server]
.DS_Store                    [Mac system file - not needed]
Thumbs.db                    [Windows system file - not needed]
```

### Configuration Files
```
.env                         [Local version - use .env.afrihost uploaded as .env]
.env.example                 [Example only - not needed on server]
.env.local                   [Local development - not needed on server]
.eslintrc                    [Development tool config]
.prettierrc                  [Development tool config]
tsconfig.json               [TypeScript config if not used]
```

### Development/Build Files
```
webpack.config.js            [Build tool - not needed on production]
babel.config.js              [Build tool - not needed on production]
jest.config.js               [Testing - not needed on production]
docker-compose.yml           [Docker config - not needed on Afrihost]
Dockerfile                   [Docker config - not needed on Afrihost]
```

### Documentation/Reference (Optional - can upload for reference)
```
CONSULTATION_FORM_FIX.md     [Optional reference]
EMAIL_FIXES_APPLIED.md       [Optional reference]
DEPLOYMENT.md                [Optional reference]
SYSTEM_STATUS_AND_LINUX_COMPATIBILITY.md  [Optional]
WWW_DOMAIN_FIX.md            [Optional]
[Other .md files - reference only, not required]
```

### Testing/Debugging Files
```
test-node.html               [Testing only - not needed on production]
login_debugger.html          [Debugging - not needed on production]
test.js                      [Testing - not needed on production]
spec/                        [Test specs - not needed on production]
tests/                       [Test files - not needed on production]
```

### Config/Process Files
```
ecosystem.config.json        [PM2 config - not needed if using cPanel Passenger]
deploy.bat                   [Windows batch - not needed]
deploy.sh                    [Bash script - not needed]
render.yaml                  [Render config - not needed on Afrihost]
run_migration.js             [Migration runner - usually not needed]
fix_management_account.js    [Maintenance script - not needed]
migrate_industry_to_department.js  [Migration script - not needed on production]
diagnose-db.sh               [Diagnostic script - not needed]
```

---

## Upload Sequence (Recommended Order)

### Step 1: Upload Critical Files First
1. `.htaccess` 
2. `package.json`
3. `.env` (renamed from .env.afrihost)

### Step 2: Upload Server Files
4. `server.js`
5. `start.js`
6. `scripts.js`

### Step 3: Upload Frontend Root Files
7. `index.html`
8. `styles.css`

### Step 4: Upload Folders (in order)
9. `pages/` folder
10. `scripts/` folder
11. `styles/` folder
12. `assets/` folder
13. `images/` folder
14. `logos/` folder
15. `cart/` folder
16. `backend/` folder

### Step 5: Upload Documentation (optional)
17. `README.md`
18. Any deployment guides for reference

---

## File Size Reference

| Item | Size |
|------|------|
| Total HTML files (pages/) | ~3 MB |
| Total JavaScript (scripts/) | ~2.5 MB |
| Total CSS (styles/) | ~0.5 MB |
| Images/Assets | ~4 MB |
| Backend files | ~1 MB |
| Other files | ~1.5 MB |
| **TOTAL** | **~12-15 MB** |

---

## Verification After Upload

After all files uploaded, verify:

```bash
# In cPanel Terminal
cd ~/public_html

# Check critical files exist
ls -la .htaccess
ls -la .env
ls -la server.js
ls -la package.json

# Check folders exist
ls -d pages/ scripts/ styles/ assets/ images/ logos/ cart/ backend/

# Count files
find . -type f ! -path './node_modules/*' ! -path './.git/*' | wc -l
# Should show approximately 50+ files

# Check total size
du -sh .
# Should show 12-15 MB
```

---

## Important Notes

1. **Always upload `.htaccess` first** - Required for Node.js routing
2. **Rename `.env.afrihost` to `.env`** - Must be exactly `.env`, not `.env.afrihost`
3. **Enable "Show hidden files"** in cPanel File Manager to see `.htaccess` and `.env`
4. **Don't upload node_modules** - Let `npm install` create it on server
5. **Don't upload .git directory** - Not needed on production server
6. **Large files first** - Upload larger files/folders first to avoid timeouts
7. **Verify permissions** - After upload, verify files are readable (644 for files, 755 for directories)

---

## Troubleshooting

**Q: I can't see .htaccess file in cPanel File Manager**
A: Enable "Settings" → Check "Show hidden files"

**Q: Files uploaded but server won't start**
A: Check that `.env` exists (not `.env.afrihost`) and `server.js` is in root

**Q: Getting "Cannot find module" errors**
A: Run `npm install --production` on server after uploading files

**Q: Upload is very slow**
A: Upload folders one at a time instead of everything at once


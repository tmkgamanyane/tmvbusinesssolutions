# TMV Business Solutions Platform

## Overview
TMV Business Solutions is a comprehensive business platform offering architecture services, company registration, job posting and recruitment, and various business solutions.

## Live Deployment
- **Live URL**: https://tmvbusinesssolutions.co.za
- **Database**: tmvbusinesssolutions
- **Environment**: Production ready

## Features
- 🏢 Company Registration Services
- 🏗️ Architecture & Design Services  
- 💼 Job Posting & Recruitment Portal
- 👥 User Management (Admin, Employer, Job Seeker)
- 💳 Payment Processing (Yoco Integration)
- 📧 Email System Integration
- 🎨 Branding & Identity Services

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL/MariaDB
- PM2 (for production deployment)

### Installation
1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd tmvbusinesssolutions
   npm install
   ```

2. **Database Setup**:
   ```bash
   # Run in MySQL/phpMyAdmin
   mysql -u root -p < database-setup.sql
   ```

3. **Environment Configuration**:
   ```bash
   # Production uses .env file (already configured)
   # Database: tmvbusinesssolutions
   # User: root
   # Password: Moses@1985
   # Email: Tshepiso@1985
   ```

4. **Deploy to Production**:
   ```bash
   # Linux/Mac
   chmod +x deploy.sh
   ./deploy.sh
   
   # Windows
   deploy.bat
   
   # Manual start
   npm start
   
   # Production with PM2
   npm run pm2:start
   ```

## Database Configuration
- **Database Name**: `tmvbusinesssolutions`
- **Username**: `root`
- **Password**: `Moses@1985`
- **Host**: `localhost`
- **Port**: `3306`

## Email Configuration
- **SMTP Host**: mail.tmvbusinesssolutions.co.za
- **Port**: 587
- **Authentication**: Yes
- **Main Email**: architecture@tmvbusinesssolutions.co.za
- **Password**: Tshepiso@1985

### Department Emails
- Careers: careers@tmvbusinesssolutions.co.za
- IT Infrastructure: itinfrustructure@tmvbusinesssolutions.co.za
- Architecture: architecture@tmvbusinesssolutions.co.za
- Enquiries: enquiries@tmvbusinesssolutions.co.za

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout

### Services
- `GET /services` - Get all services
- `POST /company-registration` - Register company
- `POST /architecture-request` - Submit architecture request
- `POST /job-posting` - Create job posting

### Payments
- `POST /process-payment` - Process Yoco payments
- `GET /payment-status/:id` - Check payment status

## Deployment

### Production Deployment
1. **Server Setup**:
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start application
   npm run pm2:start
   
   # Monitor
   pm2 status
   pm2 logs tmvbusinesssolutions
   ```

2. **Database Migration**:
   ```bash
   # Ensure database user exists
   mysql -u root -p < database-setup.sql
   ```

3. **SSL Certificate**:
   - Configure SSL certificate for https://tmvbusinesssolutions.co.za
   - Update nginx/apache configuration

### Environment Variables
All environment variables are configured in `.env` file:
- Database credentials
- Email SMTP settings
- Yoco payment keys
- JWT secrets

## File Structure
```
tmvbusinesssolutions/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   └── database/        # Database schemas
├── pages/               # Frontend HTML pages
├── scripts/             # Frontend JavaScript
├── styles/              # CSS stylesheets
├── assets/              # Images and static files
├── server.js            # Main server file
├── package.json         # Dependencies
├── database-setup.sql   # Database initialization
└── .env                 # Environment configuration
```

## Security Features
- JWT authentication
- Password hashing (bcrypt)
- CORS protection
- Session management
- Input validation
- SQL injection protection

## Support
For technical support, contact: architecture@tmvbusinesssolutions.co.za

## License
MIT License - See LICENSE file for details

---
**TMV Business Solutions** - Professional Business Services Platform# tmvbusinesssolutions

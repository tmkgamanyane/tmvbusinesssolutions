const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes, Op } = require('sequelize');
const nodemailer = require('nodemailer');
// const emailService = require('./backend/email-service');
const { checkUserExists, requireEmployer, requireManager, requireJobseeker, requireAdmin } = require('./backend/middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// EMAIL CONFIGURATION
// ==========================================

// Department-specific email addresses
const DEPARTMENT_EMAILS = {
    careers: 'careers@tmvbusinesssolutions.co.za',
    itInfrastructure: 'itinfrustructure@tmvbusinesssolutions.co.za', 
    architecture: 'architecture@tmvbusinesssolutions.co.za',
    businessplan: 'businessplan@tmvbusinesssolutions.co.za',
    general: 'enquiries@tmvbusinesssolutions.co.za'
};

// Afrihost SMTP Configuration
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'mail.afrihost.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // Use string comparison for env vars
    auth: {
        user: process.env.EMAIL_USER || 'enquiries@tmvbusinesssolutions.co.za',
        pass: process.env.EMAIL_PASS || 'Tshepiso@1985'
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
    debug: process.env.NODE_ENV === 'development' // Enable debug in development
});

// Test email configuration on startup
emailTransporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// Department-specific email sending function
async function sendDepartmentEmail(department, to, subject, html, fromEmail = null) {
    try {
        const departmentEmail = DEPARTMENT_EMAILS[department] || DEPARTMENT_EMAILS.general;
        
        // Clean email setup - use only the provided email without department brackets
        const fromAddress = fromEmail || `"TMV Business Solutions - ${department.charAt(0).toUpperCase() + department.slice(1)}" <${departmentEmail}>`;
        const replyToAddress = fromEmail || departmentEmail;
        
        const info = await emailTransporter.sendMail({
            from: fromAddress,
            to,
            subject,
            html,
            replyTo: replyToAddress
        });
        
        console.log(`📧 ${department} email sent to ${to} from ${fromAddress}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send ${department} email to ${to}:`, error.message);
        console.error(`❌ Full error details:`, error);
        return { success: false, error: error.message, fullError: error.code || error };
    }
}

// General email sending helper function (backward compatibility)
async function sendEmail(to, subject, html, fromDepartment = 'general') {
    return await sendDepartmentEmail(fromDepartment, to, subject, html);
}

// ==========================================
// CRITICAL: Process Error Handlers
// Prevent server crashes from unhandled errors
// ==========================================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION - Server continues running:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Timestamp:', new Date().toISOString());
    console.error('---');
    // Don't exit - keep server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED PROMISE REJECTION - Server continues running:');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    console.error('Timestamp:', new Date().toISOString());
    console.error('---');
    // Don't exit - keep server running
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
    console.log('📡 SIGTERM signal received: closing HTTP server gracefully');
    // Don't force exit - let connections close gracefully
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
    console.log('📡 SIGINT signal received: closing HTTP server gracefully');
    // Don't force exit - let connections close gracefully
});

// Log when process is about to exit
process.on('exit', (code) => {
    console.log(`⚠️ Process exiting with code: ${code}`);
});

console.log('✅ Error handlers initialized - Server will stay alive through errors');
console.log('---');

// Trust proxy for secure cookies when behind Afrihost / Apache / Nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware (Helmet) - only load if not already loaded
try {
    const helmet = require('helmet');
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));
    console.log('🛡️ Helmet security middleware enabled');
} catch (e) {
    console.warn('⚠️ Helmet not installed. Consider adding it for security hardening (npm install helmet)');
}

// Rate limiting to mitigate brute force & abuse (requires express-rate-limit)
let rateLimitLoaded = false;
try {
    const rateLimit = require('express-rate-limit');
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200,                 // Allow 200 requests per window per IP
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/', apiLimiter);
    rateLimitLoaded = true;
    console.log('🚦 API rate limiting enabled');
} catch (e) {
    console.warn('⚠️ express-rate-limit not installed. Install with: npm install express-rate-limit');
}

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za',
            'https://tmvbusinesssolutions.co.za',
            'https://www.tmvbusinesssolutions.co.za',
            'http://tmvbusinesssolutions.co.za',
            'http://www.tmvbusinesssolutions.co.za',
            'http://127.0.0.1:3000',
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:8000'
        ];
        
        // Allow requests with no origin (like mobile apps, Postman, or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

// Compression middleware for better performance
let compressionLoaded = false;
try {
    const compression = require('compression');
    app.use(compression());
    compressionLoaded = true;
    console.log('📦 Compression middleware enabled');
} catch (e) {
    console.warn('⚠️ compression not installed. Install with: npm install compression');
}

// MySQL Session Store for production persistence (instead of MemoryStore)
let sessionStore = undefined;
try {
    const MySQLStore = require('express-mysql-session')(session);
    sessionStore = new MySQLStore({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Moses@1985',
        database: process.env.DB_NAME || 'tmvbusinesssolutions',
        clearExpired: true,
        checkExpirationInterval: 900000, // 15 minutes
        expiration: 86400000, // 24 hours
        createDatabaseTable: true,
        schema: {
            tableName: 'sessions',
            columnNames: {
                session_id: 'session_id',
                expires: 'expires',
                data: 'data'
            }
        }
    });
    console.log('🗄️ MySQL session store configured for production persistence');
} catch (e) {
    console.warn('⚠️ express-mysql-session not installed. Using MemoryStore (not recommended for production)');
    console.warn('   Install with: npm install express-mysql-session');
}

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Use MySQL store if available, otherwise defaults to MemoryStore
    name: 'tmv_session', // Custom session name
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true for HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin with HTTPS
        domain: process.env.NODE_ENV === 'production' ? '.tmvbusinesssolutions.co.za' : undefined
    }
}));

// Increase payload size limit for file uploads (images in base64)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Generic express error handling middleware
app.use((err, req, res, next) => {
    try {
        console.error('Express error handler caught error:', err && err.stack ? err.stack : err);
    } catch (loggingError) {
        console.error('Error while logging express error:', loggingError);
    }

    // If headers already sent, delegate to default Express handler
    if (res.headersSent) {
        return next(err);
    }

    // Respond with JSON error without terminating the process
    res.status(err && err.status ? err.status : 500).json({
        error: true,
        message: err && err.message ? err.message : 'Internal Server Error'
    });
});

// Helper function to create proper display name
function createDisplayName(firstName, lastName) {
    if (!firstName && !lastName) return 'Guest';
    if (!lastName) return firstName;
    if (!firstName) return lastName;
    
    // Check if first name and last name are the same (case insensitive)
    if (firstName.trim().toLowerCase() === lastName.trim().toLowerCase()) {
        return firstName.trim();
    }
    
    // If they're different, combine them
    return `${firstName.trim()} ${lastName.trim()}`.trim();
}

// MySQL Database Connection - Afrihost Configuration
const sequelize = new Sequelize(
    process.env.DB_NAME || 'tmvbusinesssolutions',  // ✅ Correct spelling
    process.env.DB_USER || 'root',                 // ✅ Using root user
    process.env.DB_PASSWORD || 'Moses@1985',       // ✅ Correct password
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false, // Only log in development
        pool: {
            max: 10,           // Increased pool size for production
            min: 0,
            acquire: 60000,    // Increased to 60 seconds
            idle: 10000
        },
        dialectOptions: {
            connectTimeout: 60000,  // 60 seconds connection timeout
            multipleStatements: false,
            supportBigNumbers: true,
            bigNumberStrings: true
        },
        retry: {
            max: 3,  // Retry failed connections 3 times
            match: [
                /ETIMEDOUT/,
                /EHOSTUNREACH/,
                /ECONNRESET/,
                /ECONNREFUSED/,
                /ETIMEDOUT/,
                /ESOCKETTIMEDOUT/,
                /EHOSTDOWN/,
                /EPIPE/,
                /EAI_AGAIN/,
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ]
        }
    }
);

// Test database connection with detailed error handling
async function testConnection() {
    try {
        console.log('🔄 Attempting database connection...');
        console.log('📊 Database:', process.env.DB_NAME || 'tmvbusinesssolutions');
        console.log('👤 User:', process.env.DB_USER || 'root');
        console.log('🏠 Host:', process.env.DB_HOST || 'localhost');
        console.log('🔌 Port:', process.env.DB_PORT || 3306);
        
        await sequelize.authenticate();
        console.log('✅ Database connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:');
        console.error('   Error name:', error.name);
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.original?.code);
        console.error('   Error errno:', error.original?.errno);
        console.error('   Error syscall:', error.original?.syscall);
        
        // Provide helpful troubleshooting messages
        if (error.original?.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('');
            console.error('🔐 ACCESS DENIED - Troubleshooting:');
            console.error('   1. Check database username is correct: root');
            console.error('   2. Check database password is correct: Moses@1985');
            console.error('   3. Run in MySQL: GRANT ALL PRIVILEGES ON tmvbusinesssolutions.* TO "root"@"localhost";');
            console.error('   4. Run in MySQL: FLUSH PRIVILEGES;');
        } else if (error.original?.code === 'ECONNREFUSED') {
            console.error('');
            console.error('🔌 CONNECTION REFUSED - Troubleshooting:');
            console.error('   1. Check if MySQL service is running');
            console.error('   2. Run: sudo systemctl status mysql (Linux)');
            console.error('   3. Run: sudo systemctl start mysql (to start MySQL)');
            console.error('   4. Check if MySQL is listening on port 3306');
        } else if (error.original?.code === 'ER_BAD_DB_ERROR') {
            console.error('');
            console.error('🗄️  DATABASE NOT FOUND - Troubleshooting:');
            console.error('   1. Database "tmvbusinesssolutions" does not exist');
            console.error('   2. Run in MySQL: CREATE DATABASE tmvbusinesssolutions CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
            console.error('   3. Or check if database name is spelled correctly');
        }
        
        return false;
    }
}

// Define Models
const User = sequelize.define('User', {
    first_name: { 
        type: DataTypes.STRING, 
        allowNull: false,
        validate: {
            notEmpty: { msg: 'First name is required' },
            len: { args: [2, 100], msg: 'First name must be between 2 and 100 characters' }
        }
    },
    last_name: { 
        type: DataTypes.STRING, 
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Last name is required' },
            len: { args: [2, 100], msg: 'Last name must be between 2 and 100 characters' }
        }
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true,
        validate: {
            isEmail: { msg: 'Must be a valid email address' },
            notEmpty: { msg: 'Email is required' }
        }
    },
    password_hash: { 
        type: DataTypes.STRING, 
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Password is required' },
            len: { args: [6, 255], msg: 'Password must be at least 6 characters' }
        }
    },
    role: { 
        type: DataTypes.ENUM('client', 'employer', 'job_seeker', 'jobseeker', 'admin', 'administrator', 'management', 'hr_recruitment'), 
        defaultValue: 'client',
        comment: 'User role: client, employer, jobseeker, admin, administrator, management, hr_recruitment'
    },
    hrRole: {
        type: DataTypes.STRING(50), // Temporarily changed from ENUM to STRING to allow sync
        allowNull: true,
        comment: 'HR role for internal employer users'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Account activation status'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: { args: [10, 15], msg: 'Phone number must be between 10 and 15 characters' }
        }
    },
    id_number: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: { args: [13, 13], msg: 'ID number must be exactly 13 digits' }
        }
    },
    title: {
        type: DataTypes.ENUM('Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev'),
        allowNull: true
    },
    industry: {
        type: DataTypes.STRING,
        allowNull: true
    },
    job_updates: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    }
}, {
    tableName: 'users',
    timestamps: false
});

const Cart = sequelize.define('Cart', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    items: { type: DataTypes.JSON, allowNull: false },
});

const CompanyRegistration = sequelize.define('CompanyRegistration', {
    service: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
});

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized. Please login.' });
    }
};

// RBAC Middleware - Require specific employer role
const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // First check if user is authenticated
            if (!req.session.userId || !req.session.userType) {
                return res.status(401).json({ message: 'Unauthorized. Please login.' });
            }

            // Only applies to employer users
            if (req.session.userType !== 'employer') {
                return res.status(403).json({ message: 'Access denied. Employer account required.' });
            }

            // Get employer profile to check role
            const employerProfile = await EmployerProfile.findOne({
                where: { userId: req.session.userId }
            });

            if (!employerProfile) {
                return res.status(404).json({ message: 'Employer profile not found.' });
            }

            // Flatten the allowedRoles array (in case it's passed as a single array argument)
            const roles = allowedRoles.flat();
            
            // Ensure role is trimmed and compared properly
            const userRole = employerProfile.role ? employerProfile.role.toString().trim() : '';
            const roleMatch = roles.some(role => role.toString().trim() === userRole);
            
            if (!roleMatch) {
                return res.status(403).json({ 
                    message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${employerProfile.role}` 
                });
            }

            // Attach employer profile to request for use in route handlers
            req.employerProfile = employerProfile;
            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ message: 'Error checking permissions.' });
        }
    };
};

// RBAC Middleware - Require specific permission
const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            // First check if user is authenticated
            if (!req.session.userId || !req.session.userType) {
                console.log(`⚠️ Permission denied: Not authenticated (checking ${permissionName})`);
                return res.status(401).json({ message: 'Unauthorized. Please login.' });
            }

            // Only applies to employer users
            if (req.session.userType !== 'employer') {
                console.log(`⚠️ Permission denied: Not employer (checking ${permissionName})`);
                return res.status(403).json({ message: 'Access denied. Employer account required.' });
            }

            // Get employer profile to check permission
            const employerProfile = await EmployerProfile.findOne({
                where: { userId: req.session.userId }
            });

            if (!employerProfile) {
                console.log(`⚠️ Permission denied: Profile not found for user ${req.session.userId} (checking ${permissionName})`);
                return res.status(404).json({ message: 'Employer profile not found.' });
            }

            console.log(`🔐 Permission check for ${permissionName}:`, {
                userId: req.session.userId,
                role: employerProfile.role,
                hasPermission: !!employerProfile[permissionName],
                permissionValue: employerProfile[permissionName]
            });

            // Check if user has the required permission
            if (!employerProfile[permissionName]) {
                console.log(`⚠️ Permission denied: User ${req.session.userId} (${employerProfile.role}) lacks ${permissionName}`);
                return res.status(403).json({ 
                    message: `Access denied. Required permission: ${permissionName}`,
                    userRole: employerProfile.role,
                    hint: 'Please contact your administrator to grant you the required permissions.'
                });
            }

            // Attach employer profile to request for use in route handlers
            req.employerProfile = employerProfile;
            console.log(`✅ Permission granted: ${permissionName} for user ${req.session.userId}`);
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Error checking permissions.' });
        }
    };
};

// AUTHENTICATION ROUTES

// Register Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, userType = 'client' } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            return res.status(400).json({ 
                message: 'All fields are required',
                errors: {
                    firstName: !firstName ? 'First name is required' : null,
                    lastName: !lastName ? 'Last name is required' : null,
                    email: !email ? 'Email is required' : null,
                    password: !password ? 'Password is required' : null,
                    confirmPassword: !confirmPassword ? 'Confirm password is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters',
                errors: { password: 'Password must be at least 6 characters' }
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                message: 'Passwords do not match',
                errors: { confirmPassword: 'Passwords do not match' }
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Email already registered',
                errors: { email: 'This email is already registered' }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password_hash: hashedPassword,
            role: userType
        });

        // Auto-login after registration
        req.session.userId = newUser.id;
        req.session.userName = createDisplayName(newUser.first_name, newUser.last_name);
        req.session.userEmail = newUser.email;
        req.session.userType = newUser.role;

        // Send registration notification email (internal)
        try {
            const subject = 'New user registration - TMV Business Solutions';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color:#0082B0;">New User Registration</h2>
                    <p><strong>Name:</strong> ${newUser.first_name} ${newUser.last_name}</p>
                    <p><strong>Email:</strong> ${newUser.email}</p>
                    <p><strong>User Type:</strong> ${newUser.role}</p>
                    <p style="color:#666; font-size:12px;">This is an automated notification.</p>
                </div>`;
            const emailResult = await sendDepartmentEmail('general', 'leads@tmvbusinesssolutions.co.za', subject, html);
            if (emailResult && emailResult.success) {
                console.log('✅ Registration notification email sent successfully');
            } else {
                console.error('❌ Failed to send registration notification email:', emailResult ? emailResult.error : 'Unknown error');
            }
        } catch (emailError) {
            console.error('❌ Failed to send registration notification email:', emailError);
            // Don't fail the registration if email fails
        }

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                name: createDisplayName(newUser.first_name, newUser.last_name),
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                email: newUser.email,
                userType: newUser.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Registration failed',
            error: error.message 
        });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required',
                errors: {
                    email: !email ? 'Email is required' : null,
                    password: !password ? 'Password is required' : null
                }
            });
        }

        // Find user - with detailed error logging
        let user;
        try {
            console.log('🔍 Attempting to find user with email:', email);
            user = await User.findOne({ where: { email } });
            console.log('✅ User lookup successful:', user ? 'User found' : 'User not found');
        } catch (dbError) {
            console.error('❌ Database error during user lookup:', {
                name: dbError.name,
                message: dbError.message,
                code: dbError.code,
                errno: dbError.errno,
                sql: dbError.sql
            });
            throw new Error(`Database query failed: ${dbError.message}`);
        }

        if (!user) {
            return res.status(401).json({ 
                message: 'Invalid email or password',
                errors: { email: 'Invalid credentials' }
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Invalid email or password',
                errors: { password: 'Invalid credentials' }
            });
        }

        // Create session
        req.session.userId = user.id;
        req.session.userName = createDisplayName(user.first_name, user.last_name);
        req.session.userEmail = user.email;
        req.session.userType = user.role;

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: createDisplayName(user.first_name, user.last_name),
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                userType: user.role
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Login failed',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

// Helper to clear the session cookie consistently
function clearSessionCookie(res) {
    const cookieOptions = { path: '/' };
    if (process.env.NODE_ENV === 'production') {
        cookieOptions.domain = '.tmvbusinesssolutions.co.za';
        cookieOptions.secure = true;
        cookieOptions.sameSite = 'none';
    }
    // Cookie name matches the one configured in express-session (name: 'tmv_session')
    res.clearCookie('tmv_session', cookieOptions);
}

// Logout Route
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                message: 'Logout failed',
                error: err.message 
            });
        }
        clearSessionCookie(res);
        res.json({ message: 'Logout successful' });
    });
});

// Get Current User Route (Check if logged in)
app.get('/api/auth/me', async (req, res) => {
    if (req.session.userId) {
        try {
            // Get full user data including permissions
            const user = await User.findByPk(req.session.userId);
            
            let permissions = {};
            if (req.session.userType === 'employer') {
                const employerProfile = await EmployerProfile.findOne({
                    where: { userId: req.session.userId }
                });
                if (employerProfile) {
                    permissions = employerProfile.toJSON();
                }
            }

            res.json({
                isAuthenticated: true,
                id: req.session.userId,
                name: req.session.userName,
                email: user?.email || req.session.userEmail,
                userType: req.session.userType,
                role: user?.role,
                permissions: permissions
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.json({
                isAuthenticated: true,
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail,
                userType: req.session.userType
            });
        }
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Fix My Permissions - Grants all management permissions to current user
app.post('/api/admin/fix-my-permissions', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not logged in' });
        }

        const employerProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });

        if (!employerProfile) {
            return res.status(404).json({ message: 'Employer profile not found' });
        }

        // Grant all management permissions
        await employerProfile.update({
            canCreatePost: true,
            canWritePost: true,
            canEditPost: true,
            canDeletePost: true,
            canAssignPost: true,
            canTransferPost: true,
            canWithdrawPost: true,
            canViewApplications: true,
            canReviewApplications: true,
            canShortlistCandidates: true,
            canRejectCandidates: true,
            canScheduleInterviews: true,
            canPullReportApplied: true,
            canPullReportShortlisted: true,
            canPullReportRejected: true,
            canPullReportFull: true,
            canExportReports: true,
            canViewAnalytics: true,
            canViewAllJobs: true,
            canMonitorPerformance: true,
            canAssignTasks: true,
            canApproveJobs: true,
            canManageTeam: true,
            canManagePermissions: true
        });

        console.log(`✅ Granted all permissions to user ${req.session.userId} (${employerProfile.role})`);

        res.json({
            message: 'All permissions granted successfully',
            role: employerProfile.role,
            permissions: employerProfile.toJSON()
        });

    } catch (error) {
        console.error('Error fixing permissions:', error);
        res.status(500).json({ message: 'Error updating permissions' });
    }
});

// ==================== EMPLOYER AUTHENTICATION ROUTES ====================

// Employer Login Route
app.post('/api/auth/employer/login', async (req, res) => {
    const { email, password, requiredRole } = req.body;
    
    console.log('=== EMPLOYER LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Required Role:', requiredRole);

    try {
        // Find user by email
        const user = await User.findOne({ where: { email } });
        console.log('User found:', user ? 'YES' : 'NO');
        
        if (!user) {
            console.log('User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        console.log('User data:', { id: user.id, email: user.email, hasPasswordHash: !!user.password_hash });

        // Verify password
        if (!user.password_hash) {
            console.error('ERROR: User has no password_hash field!');
            return res.status(500).json({ message: 'Account configuration error' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('Invalid password');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Find employer profile
        console.log('Looking for employer profile for userId:', user.id);
        const employerProfile = await EmployerProfile.findOne({
            where: { userId: user.id }
        });
        console.log('Employer profile found:', employerProfile ? 'YES' : 'NO');

        if (!employerProfile) {
            console.log('No employer profile found');
            return res.status(403).json({ 
                message: 'Access denied. This account is not an employer account.' 
            });
        }
        
        console.log('Employer role:', employerProfile.role);
        console.log('Required role:', requiredRole);

        // Check if user has the required role (if specified)
        if (requiredRole && employerProfile.role !== requiredRole) {
            console.log('Role mismatch');
            return res.status(403).json({ 
                message: `Access denied. Required role: ${requiredRole}. Your role: ${employerProfile.role}` 
            });
        }

        console.log('Login successful, setting session...');
        // Set session data
        req.session.userId = user.id;
        req.session.userName = `${user.first_name} ${user.last_name}`;
        req.session.userEmail = user.email;
        req.session.userType = 'employer';
        req.session.employerRole = employerProfile.role;
        req.session.accessLevel = employerProfile.accessLevel;
        
        console.log('Sending response...');
        // Return user data with role and permissions
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: employerProfile.role,
                accessLevel: employerProfile.accessLevel,
                department: employerProfile.department,
                jobTitle: employerProfile.jobTitle,
                permissions: {
                    // Job Posting Permissions
                    canCreatePost: employerProfile.canCreatePost,
                    canWritePost: employerProfile.canWritePost,
                    canEditPost: employerProfile.canEditPost,
                    canDeletePost: employerProfile.canDeletePost,
                    canAssignPost: employerProfile.canAssignPost,
                    canTransferPost: employerProfile.canTransferPost,
                    canWithdrawPost: employerProfile.canWithdrawPost,
                    // Application Management Permissions
                    canViewApplications: employerProfile.canViewApplications,
                    canReviewApplications: employerProfile.canReviewApplications,
                    canShortlistCandidates: employerProfile.canShortlistCandidates,
                    canRejectCandidates: employerProfile.canRejectCandidates,
                    canScheduleInterviews: employerProfile.canScheduleInterviews,
                    // Reporting Permissions
                    canPullReportApplied: employerProfile.canPullReportApplied,
                    canPullReportShortlisted: employerProfile.canPullReportShortlisted,
                    canPullReportRejected: employerProfile.canPullReportRejected,
                    canPullReportFull: employerProfile.canPullReportFull,
                    canExportReports: employerProfile.canExportReports,
                    // Administrator Permissions
                    canAddUsers: employerProfile.canAddUsers,
                    canDeleteUsers: employerProfile.canDeleteUsers,
                    canResetPasswords: employerProfile.canResetPasswords,
                    canManageSettings: employerProfile.canManageSettings,
                    canManagePermissions: employerProfile.canManagePermissions,
                    // Analytics & Monitoring
                    canViewAnalytics: employerProfile.canViewAnalytics,
                    canViewAllJobs: employerProfile.canViewAllJobs,
                    canMonitorPerformance: employerProfile.canMonitorPerformance,
                    // Management Permissions
                    canAssignTasks: employerProfile.canAssignTasks,
                    canApproveJobs: employerProfile.canApproveJobs,
                    canManageTeam: employerProfile.canManageTeam
                }
            }
        });
        console.log('=== LOGIN COMPLETE ===');
    } catch (error) {
        console.error('=== EMPLOYER LOGIN ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Server error during login',
            error: error.message,
            details: error.toString()
        });
    }
});

// Admin Register Manager or HR Personnel Route
app.post('/api/auth/employer/register', requireRole(['administrator']), async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        role,
        department,
        jobTitle,
        contactNumber,
        accessLevel,
        permissions
    } = req.body;

    try {
        // Validate required fields
        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ 
                message: 'Email, password, first name, last name, and role are required' 
            });
        }

        // Validate role
        const validRoles = ['administrator', 'management', 'hr_recruitment'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Must be: administrator, management, or hr_recruitment' 
            });
        }

        // Only administrators can create other administrators
        if (role === 'administrator' && req.employerProfile.role !== 'administrator') {
            return res.status(403).json({ 
                message: 'Only administrators can create other administrator accounts' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with correct role
        // Role mapping: 'administrator' → administrator, 'management' → management, 'hr_recruitment' → hr_recruitment
        const newUser = await User.create({
            email,
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            role: role  // Use the actual role from request
        });

        // Determine access level based on role if not provided
        let finalAccessLevel = accessLevel;
        if (!finalAccessLevel) {
            finalAccessLevel = role === 'administrator' ? 1 : role === 'management' ? 2 : 3;
        }

        // Get default permissions for the role
        const defaultPermissions = getRolePermissions(role);

        // Merge with custom permissions if provided
        const finalPermissions = permissions ? { ...defaultPermissions, ...permissions } : defaultPermissions;

        // Create employer profile with permissions
        const employerProfile = await EmployerProfile.create({
            userId: newUser.id,
            role,
            accessLevel: finalAccessLevel,
            department,
            jobTitle,
            contactNumber,
            // Job Posting Permissions
            canCreatePost: finalPermissions.canCreatePost || false,
            canWritePost: finalPermissions.canWritePost || false,
            canEditPost: finalPermissions.canEditPost || false,
            canDeletePost: finalPermissions.canDeletePost || false,
            canAssignPost: finalPermissions.canAssignPost || false,
            canTransferPost: finalPermissions.canTransferPost || false,
            canWithdrawPost: finalPermissions.canWithdrawPost || false,
            // Application Management
            canViewApplications: finalPermissions.canViewApplications || false,
            canReviewApplications: finalPermissions.canReviewApplications || false,
            canShortlistCandidates: finalPermissions.canShortlistCandidates || false,
            canRejectCandidates: finalPermissions.canRejectCandidates || false,
            canScheduleInterviews: finalPermissions.canScheduleInterviews || false,
            // Reporting Permissions
            canPullReportApplied: finalPermissions.canPullReportApplied || false,
            canPullReportShortlisted: finalPermissions.canPullReportShortlisted || false,
            canPullReportRejected: finalPermissions.canPullReportRejected || false,
            canPullReportFull: finalPermissions.canPullReportFull || false,
            canExportReports: finalPermissions.canExportReports || false,
            // Administrator Permissions
            canAddUsers: finalPermissions.canAddUsers || false,
            canDeleteUsers: finalPermissions.canDeleteUsers || false,
            canResetPasswords: finalPermissions.canResetPasswords || false,
            canManageSettings: finalPermissions.canManageSettings || false,
            canManagePermissions: finalPermissions.canManagePermissions || false,
            // Analytics & Monitoring
            canViewAnalytics: finalPermissions.canViewAnalytics || false,
            canViewAllJobs: finalPermissions.canViewAllJobs || false,
            canMonitorPerformance: finalPermissions.canMonitorPerformance || false,
            // Management Permissions
            canAssignTasks: finalPermissions.canAssignTasks || false,
            canApproveJobs: finalPermissions.canApproveJobs || false,
            canManageTeam: finalPermissions.canManageTeam || false
        });

        res.status(201).json({
            message: 'Employer account created successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                role: employerProfile.role,
                accessLevel: employerProfile.accessLevel,
                department: employerProfile.department,
                jobTitle: employerProfile.jobTitle
            }
        });
    } catch (error) {
        console.error('Employer registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Admin Update User Permissions Route
app.put('/api/auth/employer/permissions/:userId', requireRole(['administrator', 'management']), async (req, res) => {
    const { userId } = req.params;
    const { permissions } = req.body;

    try {
        // Find the employer profile
        const employerProfile = await EmployerProfile.findOne({
            where: { userId: userId }
        });

        if (!employerProfile) {
            return res.status(404).json({ message: 'Employer profile not found' });
        }

        // Update permissions (only update fields that are provided)
        const updateData = {};
        
        // Job Posting Permissions
        if (permissions.canCreatePost !== undefined) updateData.canCreatePost = permissions.canCreatePost;
        if (permissions.canWritePost !== undefined) updateData.canWritePost = permissions.canWritePost;
        if (permissions.canEditPost !== undefined) updateData.canEditPost = permissions.canEditPost;
        if (permissions.canDeletePost !== undefined) updateData.canDeletePost = permissions.canDeletePost;
        if (permissions.canAssignPost !== undefined) updateData.canAssignPost = permissions.canAssignPost;
        if (permissions.canTransferPost !== undefined) updateData.canTransferPost = permissions.canTransferPost;
        if (permissions.canWithdrawPost !== undefined) updateData.canWithdrawPost = permissions.canWithdrawPost;
        
        // Application Management
        if (permissions.canViewApplications !== undefined) updateData.canViewApplications = permissions.canViewApplications;
        if (permissions.canReviewApplications !== undefined) updateData.canReviewApplications = permissions.canReviewApplications;
        if (permissions.canShortlistCandidates !== undefined) updateData.canShortlistCandidates = permissions.canShortlistCandidates;
        if (permissions.canRejectCandidates !== undefined) updateData.canRejectCandidates = permissions.canRejectCandidates;
        if (permissions.canScheduleInterviews !== undefined) updateData.canScheduleInterviews = permissions.canScheduleInterviews;
        
        // Reporting Permissions
        if (permissions.canPullReportApplied !== undefined) updateData.canPullReportApplied = permissions.canPullReportApplied;
        if (permissions.canPullReportShortlisted !== undefined) updateData.canPullReportShortlisted = permissions.canPullReportShortlisted;
        if (permissions.canPullReportRejected !== undefined) updateData.canPullReportRejected = permissions.canPullReportRejected;
        if (permissions.canPullReportFull !== undefined) updateData.canPullReportFull = permissions.canPullReportFull;
        if (permissions.canExportReports !== undefined) updateData.canExportReports = permissions.canExportReports;
        
        // Administrator Permissions
        if (permissions.canAddUsers !== undefined) updateData.canAddUsers = permissions.canAddUsers;
        if (permissions.canDeleteUsers !== undefined) updateData.canDeleteUsers = permissions.canDeleteUsers;
        if (permissions.canResetPasswords !== undefined) updateData.canResetPasswords = permissions.canResetPasswords;
        if (permissions.canManageSettings !== undefined) updateData.canManageSettings = permissions.canManageSettings;
        if (permissions.canManagePermissions !== undefined) updateData.canManagePermissions = permissions.canManagePermissions;
        
        // Analytics & Monitoring
        if (permissions.canViewAnalytics !== undefined) updateData.canViewAnalytics = permissions.canViewAnalytics;
        if (permissions.canViewAllJobs !== undefined) updateData.canViewAllJobs = permissions.canViewAllJobs;
        if (permissions.canMonitorPerformance !== undefined) updateData.canMonitorPerformance = permissions.canMonitorPerformance;
        
        // Management Permissions
        if (permissions.canAssignTasks !== undefined) updateData.canAssignTasks = permissions.canAssignTasks;
        if (permissions.canApproveJobs !== undefined) updateData.canApproveJobs = permissions.canApproveJobs;
        if (permissions.canManageTeam !== undefined) updateData.canManageTeam = permissions.canManageTeam;

        // Update the profile
        await employerProfile.update(updateData);

        // Fetch updated profile
        const updatedProfile = await EmployerProfile.findOne({
            where: { userId: userId },
            include: [{
                model: User,
                attributes: ['id', 'email', 'first_name', 'last_name']
            }]
        });

        res.json({
            message: 'Permissions updated successfully',
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Update permissions error:', error);
        res.status(500).json({ message: 'Server error updating permissions' });
    }
});

// Get all employer users (Admin only)
app.get('/api/employer/users', requireRole(['administrator', 'management']), async (req, res) => {
    try {
        // Fetch all employer profiles with user information
        const profiles = await EmployerProfile.findAll({
            include: [{
                model: User,
                attributes: ['id', 'first_name', 'last_name', 'email', 'isActive']
            }],
            order: [['accessLevel', 'ASC'], ['createdAt', 'DESC']]
        });

        const users = profiles.map(profile => ({
            userId: profile.userId,
            firstName: profile.User.first_name,
            lastName: profile.User.last_name,
            email: profile.User.email,
            isActive: profile.User.isActive,
            role: 'employer',  // Main user role
            employerRole: profile.role,  // Specific employer role (administrator, management, hr_recruitment)
            accessLevel: profile.accessLevel,
            department: profile.department,
            jobTitle: profile.jobTitle,
            contactNumber: profile.contactNumber,
            permissions: {
                // Job Posting
                canCreatePost: profile.canCreatePost,
                canWritePost: profile.canWritePost,
                canEditPost: profile.canEditPost,
                canDeletePost: profile.canDeletePost,
                canAssignPost: profile.canAssignPost,
                canTransferPost: profile.canTransferPost,
                canWithdrawPost: profile.canWithdrawPost,
                // Applications
                canViewApplications: profile.canViewApplications,
                canReviewApplications: profile.canReviewApplications,
                canShortlistCandidates: profile.canShortlistCandidates,
                canRejectCandidates: profile.canRejectCandidates,
                canScheduleInterviews: profile.canScheduleInterviews,
                // Reporting
                canPullReportApplied: profile.canPullReportApplied,
                canPullReportShortlisted: profile.canPullReportShortlisted,
                canPullReportRejected: profile.canPullReportRejected,
                canPullReportFull: profile.canPullReportFull,
                canExportReports: profile.canExportReports,
                // Admin
                canAddUsers: profile.canAddUsers,
                canDeleteUsers: profile.canDeleteUsers,
                canResetPasswords: profile.canResetPasswords,
                canManageSettings: profile.canManageSettings,
                canManagePermissions: profile.canManagePermissions,
                // Analytics
                canViewAnalytics: profile.canViewAnalytics,
                canViewAllJobs: profile.canViewAllJobs,
                canMonitorPerformance: profile.canMonitorPerformance,
                // Management
                canAssignTasks: profile.canAssignTasks,
                canApproveJobs: profile.canApproveJobs,
                canManageTeam: profile.canManageTeam
            }
        }));

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Get Employer Profile Route
app.get('/api/auth/employer/me', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'employer') {
        return res.status(401).json({ message: 'Not authenticated as employer' });
    }

    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: { exclude: ['password_hash'] }
        });

        const employerProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });

        if (!employerProfile) {
            return res.status(404).json({ message: 'Employer profile not found' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: employerProfile.role,
                accessLevel: employerProfile.accessLevel,
                department: employerProfile.department,
                jobTitle: employerProfile.jobTitle,
                contactNumber: employerProfile.contactNumber,
                permissions: {
                    canAddUsers: employerProfile.canAddUsers,
                    canDeleteUsers: employerProfile.canDeleteUsers,
                    canResetPasswords: employerProfile.canResetPasswords,
                    canManageSettings: employerProfile.canManageSettings,
                    canViewAnalytics: employerProfile.canViewAnalytics,
                    canAssignTasks: employerProfile.canAssignTasks,
                    canApproveJobs: employerProfile.canApproveJobs,
                    canViewAllJobs: employerProfile.canViewAllJobs,
                    canPostJobs: employerProfile.canPostJobs,
                    canManageApplications: employerProfile.canManageApplications,
                    canManageUsers: employerProfile.canManageUsers
                }
            }
        });
    } catch (error) {
        console.error('Get employer profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ADMIN SETUP & USER MANAGEMENT ROUTES ====================

// Initial Admin Setup Route (One-time use)
app.post('/api/auth/setup-admin', async (req, res) => {
    console.log('🔵 Admin setup route hit');
    console.log('📝 Request body:', req.body);
    
    const { email, password, firstName, lastName } = req.body;

    try {
        console.log('🔍 Checking for existing admin...');
        // Check if any admin already exists
        const existingAdmin = await EmployerProfile.findOne({
            where: { role: 'administrator' }
        });
        console.log('✅ Admin check complete:', existingAdmin ? 'Admin exists' : 'No admin found');

        if (existingAdmin) {
            return res.status(403).json({ 
                message: 'Admin already exists. Please login or contact system administrator.' 
            });
        }

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ 
                message: 'Email, password, first name, and last name are required' 
            });
        }

        // Check if user with email exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const newUser = await User.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password_hash: hashedPassword,
            role: 'employer'
        });

        // Create admin profile with full permissions
        const adminProfile = await EmployerProfile.create({
            userId: newUser.id,
            role: 'administrator',
            accessLevel: 1,
            department: 'Administration',
            jobTitle: 'System Administrator',
            canAddUsers: true,
            canDeleteUsers: true,
            canResetPasswords: true,
            canManageSettings: true,
            canViewAnalytics: true,
            canAssignTasks: true,
            canApproveJobs: true,
            canViewAllJobs: true,
            canPostJobs: true,
            canManageApplications: true,
            canManageUsers: true
        });

        res.status(201).json({
            message: 'Administrator account created successfully! You can now login.',
            user: {
                id: newUser.id,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                email: newUser.email,
                role: adminProfile.role
            }
        });
    } catch (error) {
        console.error('Admin setup error:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Server error during admin setup',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Admin: Get All Employer Users
app.get('/api/admin/users', requireRole(['administrator', 'management']), async (req, res) => {
    try {
        // Fetch all employer profiles with user information (same approach as /api/employer/users)
        const profiles = await EmployerProfile.findAll({
            include: [{
                model: User,
                attributes: ['id', 'first_name', 'last_name', 'email', 'isActive']
            }],
            order: [['accessLevel', 'ASC'], ['createdAt', 'DESC']]
        });

        // Map to the format expected by admin dashboard
        const usersWithProfiles = profiles.map(profile => ({
            id: profile.User.id,
            name: `${profile.User.first_name} ${profile.User.last_name}`,
            first_name: profile.User.first_name,
            last_name: profile.User.last_name,
            email: profile.User.email,
            isActive: profile.User.isActive,
            employerRole: profile.role,
            department: profile.department,
            jobTitle: profile.jobTitle,
            EmployerProfile: {
                userId: profile.userId,
                role: profile.role,
                accessLevel: profile.accessLevel,
                department: profile.department,
                jobTitle: profile.jobTitle,
                contactNumber: profile.contactNumber
            }
        }));

        res.json({ users: usersWithProfiles });
    } catch (error) {
        console.error('Get users error:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ 
            message: 'Server error fetching users',
            error: error.message 
        });
    }
});

// Admin: Create Manager or HR Personnel
app.post('/api/admin/create-user', requireRole(['administrator']), async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        role,
        department,
        jobTitle,
        contactNumber
    } = req.body;

    try {
        // Validate required fields
        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ 
                message: 'Email, password, first name, last name, and role are required' 
            });
        }

        // Validate role
        const validRoles = ['administrator', 'management', 'hr_recruitment'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Must be: administrator, management, or hr_recruitment' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with correct role mapping
        // Admin panel role → users.role mapping:
        // 'administrator' → 'administrator'
        // 'management' → 'management' 
        // 'hr_recruitment' → 'hr_recruitment'
        const newUser = await User.create({
            email,
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            role: role  // Use the actual role from request (administrator, management, hr_recruitment)
        });

        // Determine access level based on role
        const accessLevel = role === 'administrator' ? 1 : role === 'management' ? 2 : 3;

        // Get default permissions for the role
        const defaultPermissions = getRolePermissions(role);

        // Create employer profile with permissions
        const employerProfile = await EmployerProfile.create({
            userId: newUser.id,
            role,
            accessLevel,
            department: department || '',
            jobTitle: jobTitle || '',
            contactNumber: contactNumber || '',
            canAddUsers: defaultPermissions.canAddUsers,
            canDeleteUsers: defaultPermissions.canDeleteUsers,
            canResetPasswords: defaultPermissions.canResetPasswords,
            canManageSettings: defaultPermissions.canManageSettings,
            canViewAnalytics: defaultPermissions.canViewAnalytics,
            canAssignTasks: defaultPermissions.canAssignTasks,
            canApproveJobs: defaultPermissions.canApproveJobs,
            canViewAllJobs: defaultPermissions.canViewAllJobs,
            canPostJobs: defaultPermissions.canPostJobs,
            canManageApplications: defaultPermissions.canManageApplications,
            canManageUsers: defaultPermissions.canManageUsers
        });

        res.status(201).json({
            message: `${role === 'administrator' ? 'Administrator' : role === 'management' ? 'Manager' : 'HR Personnel'} account created successfully`,
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                role: employerProfile.role,
                accessLevel: employerProfile.accessLevel,
                department: employerProfile.department,
                jobTitle: employerProfile.jobTitle
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Server error during user creation',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Admin: Delete User
app.delete('/api/admin/users/:userId', requireRole(['administrator']), async (req, res) => {
    const { userId } = req.params;

    try {
        // Don't allow deleting yourself
        if (parseInt(userId) === req.session.userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete employer profile first (foreign key constraint)
        await EmployerProfile.destroy({ where: { userId } });
        
        // Delete user
        await user.destroy();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error during user deletion' });
    }
});

// Admin: Reset User Password
app.post('/api/admin/reset-password/:userId', requireRole(['administrator']), async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    try {
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password_hash = hashedPassword;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

// ==================== END ADMIN SETUP & USER MANAGEMENT ROUTES ====================

// ==================== END EMPLOYER AUTHENTICATION ROUTES ====================

// Protected route example
app.get('/api/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: { exclude: ['password'] }
        });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
});

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Database diagnostic endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const dbDiagnostics = {
            timestamp: new Date().toISOString(),
            environment: {
                DB_HOST: process.env.DB_HOST || 'Not set',
                DB_PORT: process.env.DB_PORT || 'Not set',
                DB_NAME: process.env.DB_NAME || 'Not set',
                DB_USER: process.env.DB_USER || 'Not set',
                DB_PASSWORD: process.env.DB_PASSWORD ? '***SET***' : 'Not set',
            },
            tests: {}
        };

        // Test 1: Try to authenticate
        try {
            await sequelize.authenticate();
            dbDiagnostics.tests.authentication = { status: 'SUCCESS', message: 'Connected to database' };
        } catch (error) {
            dbDiagnostics.tests.authentication = { status: 'FAILED', error: error.message };
        }

        // Test 2: Try to query users table
        try {
            const userCount = await sequelize.query('SELECT COUNT(*) as count FROM users', { raw: true });
            dbDiagnostics.tests.users_query = { status: 'SUCCESS', user_count: userCount[0][0].count };
        } catch (error) {
            dbDiagnostics.tests.users_query = { status: 'FAILED', error: error.message };
        }

        // Test 3: Check if tables exist
        try {
            const tables = await sequelize.query(`
                SELECT TABLE_NAME FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE()
            `, { raw: true });
            dbDiagnostics.tests.tables = { 
                status: 'SUCCESS', 
                tables: tables[0].map(t => t.TABLE_NAME) 
            };
        } catch (error) {
            dbDiagnostics.tests.tables = { status: 'FAILED', error: error.message };
        }

        res.json(dbDiagnostics);
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Health check endpoint for production monitoring
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
            database: { status: 'unknown' },
            email: { status: 'unknown' },
            payment: { status: 'unknown' },
            session: { status: 'unknown' }
        }
    };

    // Check database connectivity
    try {
        await sequelize.authenticate();
        health.checks.database = { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
        health.checks.database = { status: 'unhealthy', message: error.message };
        health.status = 'degraded';
    }

    // Check email transporter
    try {
        if (emailTransporter) {
            await emailTransporter.verify();
            health.checks.email = { status: 'healthy', message: 'Email service ready' };
        } else {
            health.checks.email = { status: 'warning', message: 'Email transporter not configured' };
        }
    } catch (error) {
        health.checks.email = { status: 'unhealthy', message: error.message };
        health.status = 'degraded';
    }

    // Check payment gateway configuration
    try {
        if (YOCO_CONFIG && YOCO_CONFIG.secretKey) {
            health.checks.payment = { status: 'healthy', message: `Yoco configured in ${YOCO_CONFIG.mode} mode` };
        } else {
            health.checks.payment = { status: 'warning', message: 'Payment gateway not configured' };
        }
    } catch (error) {
        health.checks.payment = { status: 'unhealthy', message: error.message };
    }

    // Check session store
    try {
        if (sessionStore) {
            health.checks.session = { status: 'healthy', message: 'MySQL session store active' };
        } else {
            health.checks.session = { status: 'warning', message: 'Using memory store' };
        }
    } catch (error) {
        health.checks.session = { status: 'unhealthy', message: error.message };
    }

    // Set appropriate HTTP status code
    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 503 : 200;
    res.status(statusCode).json(health);
});

// Comprehensive API status endpoint for deployment verification
app.get('/api/status/comprehensive', async (req, res) => {
    const startTime = Date.now();
    
    const status = {
        timestamp: new Date().toISOString(),
        server: {
            status: 'running',
            uptime: process.uptime(),
            uptimeFormatted: formatUptime(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            pid: process.pid
        },
        database: {
            status: 'unknown',
            host: process.env.DB_HOST || 'Not configured',
            name: process.env.DB_NAME || 'Not configured',
            tablesCreated: false,
            tables: []
        },
        email: {
            status: 'unknown',
            host: process.env.EMAIL_HOST || 'Not configured',
            port: process.env.EMAIL_PORT || 'Not configured',
            configured: false
        },
        payment: {
            status: 'unknown',
            provider: 'Yoco',
            mode: YOCO_CONFIG?.mode || 'Not configured',
            configured: false
        },
        apis: {
            authentication: {
                register: '/api/auth/register',
                login: '/api/auth/login',
                logout: '/api/auth/logout',
                me: '/api/auth/me'
            },
            payments: {
                createCheckout: '/api/payments/create-checkout',
                processPayment: '/api/payments/process-payment',
                status: '/api/payments/status/:checkoutId',
                publicKey: '/api/payments/public-key'
            },
            jobs: {
                list: '/api/jobs',
                create: '/api/jobs',
                applications: '/api/jobs/:id/applications'
            },
            architecture: {
                request: '/api/architecture/request',
                consultation: '/api/architecture/consultation'
            }
        },
        security: {
            https: req.protocol === 'https',
            corsEnabled: true,
            sessionStore: sessionStore ? 'MySQL' : 'Memory',
            helmetEnabled: false, // Will be true if helmet is loaded
            rateLimitEnabled: false // Will be true if rate limiter is loaded
        },
        dependencies: {
            express: require('express/package.json').version,
            sequelize: require('sequelize/package.json').version,
            mysql2: require('mysql2/package.json').version,
            nodemailer: require('nodemailer/package.json').version,
            bcrypt: require('bcrypt/package.json').version
        }
    };
    
    // Test database connection
    try {
        await sequelize.authenticate();
        status.database.status = 'connected';
        status.database.tablesCreated = true;
        
        // Get list of tables
        const [tables] = await sequelize.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);
        status.database.tables = tables.map(t => t.TABLE_NAME);
        
        // Get user count
        const [userCount] = await sequelize.query('SELECT COUNT(*) as count FROM users');
        status.database.userCount = userCount[0].count;
        
    } catch (error) {
        status.database.status = 'error';
        status.database.error = error.message;
    }
    
    // Test email configuration
    try {
        if (emailTransporter) {
            await emailTransporter.verify();
            status.email.status = 'ready';
            status.email.configured = true;
        } else {
            status.email.status = 'not configured';
        }
    } catch (error) {
        status.email.status = 'error';
        status.email.error = error.message;
        status.email.configured = false;
    }
    
    // Check payment gateway
    try {
        if (YOCO_CONFIG && YOCO_CONFIG.secretKey && YOCO_CONFIG.publicKey) {
            status.payment.status = 'configured';
            status.payment.configured = true;
            status.payment.publicKeyPreview = YOCO_CONFIG.publicKey.substring(0, 20) + '...';
        } else {
            status.payment.status = 'not configured';
            status.payment.configured = false;
        }
    } catch (error) {
        status.payment.status = 'error';
        status.payment.error = error.message;
    }
    
    // Check security middleware
    try {
        require('helmet');
        status.security.helmetEnabled = true;
    } catch (e) {
        status.security.helmetEnabled = false;
    }
    
    try {
        require('express-rate-limit');
        status.security.rateLimitEnabled = true;
    } catch (e) {
        status.security.rateLimitEnabled = false;
    }
    
    // Calculate response time
    status.responseTime = `${Date.now() - startTime}ms`;
    
    // Overall health status
    const dbHealthy = status.database.status === 'connected';
    const emailHealthy = status.email.status === 'ready' || status.email.status === 'not configured';
    const paymentHealthy = status.payment.status === 'configured' || status.payment.status === 'not configured';
    
    status.overall = {
        healthy: dbHealthy && emailHealthy && paymentHealthy,
        readyForProduction: dbHealthy && status.email.configured && status.payment.configured && status.security.https
    };
    
    res.json(status);
});

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
}

// Debug endpoint to check users
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'employer' },
            attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'isActive'],
            order: [['id', 'ASC']]
        });
        
        const usersWithProfiles = await Promise.all(users.map(async (u) => {
            const profile = await EmployerProfile.findOne({
                where: { userId: u.id },
                attributes: ['role', 'accessLevel', 'department', 'jobTitle']
            });
            
            return {
                id: u.id,
                name: `${u.first_name} ${u.last_name}`,
                email: u.email,
                isActive: u.isActive,
                employerRole: profile?.role,
                accessLevel: profile?.accessLevel,
                department: profile?.department,
                jobTitle: profile?.jobTitle
            };
        }));
        
        res.json({ 
            count: usersWithProfiles.length,
            users: usersWithProfiles
        });
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete user by email (for cleanup purposes)
app.delete('/api/cleanup/user/:email', async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        
        // Find user
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            return res.json({ message: 'User not found', email });
        }
        
        // Delete employer profile if exists
        await EmployerProfile.destroy({ where: { userId: user.id } });
        
        // Delete user
        await user.destroy();
        
        res.json({ 
            message: 'User and associated profile deleted successfully',
            email,
            userId: user.id
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ message: 'Error during cleanup', error: error.message });
    }
});

// Debug endpoint to check all users
app.get('/api/debug/all-users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        });
        
        const profiles = await EmployerProfile.findAll();
        
        res.json({ 
            totalUsers: users.length,
            users,
            totalProfiles: profiles.length,
            profiles
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

// Quote Request Route
app.post('/api/quote-request', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;

        // Validation
        if (!name || !email || !service) {
            return res.status(400).json({ 
                message: 'Name, email, and service are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    email: !email ? 'Email is required' : null,
                    service: !service ? 'Service is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Send quote request email using the unified system
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">New Quote Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                    <p><strong>Service:</strong> ${service}</p>
                </div>

                ${message ? `
                <div style="background: #fff; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Additional Details</h3>
                    <p style="line-height: 1.6;">${message}</p>
                </div>
                ` : ''}

                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString('en-ZA', { 
                            timeZone: 'Africa/Johannesburg',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} (South African Time)
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This quote request was submitted through the TMV Business Solutions website.
                    </p>
                </div>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'general',
            'leads@tmvbusinesssolutions.co.za',
            `New Quote Request from ${name} - ${service}`,
            emailHtml
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send quote request email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to process quote request. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ Quote request email sent successfully');

        res.status(200).json({
            message: 'Quote request submitted successfully',
            data: {
                name,
                email,
                service,
                submittedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Quote request error:', error);
        res.status(500).json({ 
            message: 'Quote request failed',
            error: error.message 
        });
    }
});

// Service Booking Route
app.post('/api/booking', async (req, res) => {
    try {
        const { name, email, phone, service, preferredDate, requirements } = req.body;

        // Validation
        if (!name || !email || !service) {
            return res.status(400).json({ 
                message: 'Name, email, and service are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    email: !email ? 'Email is required' : null,
                    service: !service ? 'Service is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Send booking notification email using the unified system
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">New Service Booking</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                    <p><strong>Service:</strong> ${service}</p>
                    <p><strong>Preferred Date:</strong> ${preferredDate || 'Not specified'}</p>
                </div>

                ${requirements ? `
                <div style="background: #fff; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Requirements</h3>
                    <p style="line-height: 1.6;">${requirements}</p>
                </div>
                ` : ''}

                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString('en-ZA', { 
                            timeZone: 'Africa/Johannesburg',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} (South African Time)
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This booking was submitted through the TMV Business Solutions website.
                    </p>
                </div>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'general',
            'leads@tmvbusinesssolutions.co.za',
            `New Service Booking from ${name} - ${service}`,
            emailHtml
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send booking email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to process booking. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ Booking email sent successfully');

        res.status(200).json({
            message: 'Booking submitted successfully',
            data: {
                name,
                email,
                service,
                preferredDate,
                bookedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            message: 'Booking failed',
            error: error.message 
        });
    }
});

// ==========================================
// DEPARTMENT-SPECIFIC SERVICE ENDPOINTS
// ==========================================

// IT Infrastructure Booking Endpoint
app.post('/api/services/it-infrastructure', async (req, res) => {
    try {
        const { name, email, phone, serviceType, requirements, urgency, preferredDate } = req.body;

        // Validation
        if (!name || !email || !serviceType) {
            return res.status(400).json({ 
                message: 'Name, email, and service type are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    email: !email ? 'Email is required' : null,
                    serviceType: !serviceType ? 'Service type is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Send IT infrastructure booking email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New IT Infrastructure Service Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                </div>

                <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Service Details</h3>
                    <p><strong>Service Type:</strong> ${serviceType}</p>
                    <p><strong>Urgency:</strong> ${urgency || 'Standard'}</p>
                    <p><strong>Preferred Date:</strong> ${preferredDate || 'Flexible'}</p>
                </div>

                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Requirements</h3>
                    <p>${requirements || 'No specific requirements provided'}</p>
                </div>

                <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                    This request was submitted via the TMV Business Solutions IT Infrastructure portal.
                </p>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'itInfrastructure',
            DEPARTMENT_EMAILS.itInfrastructure,
            `New IT Infrastructure Request: ${serviceType} - ${name}`,
            emailHtml
        );

        if (emailResult) {
            console.log('✅ IT Infrastructure booking email sent successfully');
        } else {
            console.error('⚠️ Failed to send IT Infrastructure booking email');
        }

        res.status(200).json({
            message: 'IT Infrastructure service request submitted successfully',
            data: {
                name,
                email,
                serviceType,
                urgency: urgency || 'Standard',
                submittedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('IT Infrastructure booking error:', error);
        res.status(500).json({ 
            message: 'Service request failed',
            error: error.message 
        });
    }
});

// Architectural Services Booking Endpoint
app.post('/api/services/architectural', async (req, res) => {
    try {
        const { name, email, phone, projectType, projectScale, location, requirements, budget, timeline } = req.body;

        // Validation
        if (!name || !email || !projectType) {
            return res.status(400).json({ 
                message: 'Name, email, and project type are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    email: !email ? 'Email is required' : null,
                    projectType: !projectType ? 'Project type is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Send architectural services email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New Architectural Services Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                </div>

                <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Project Details</h3>
                    <p><strong>Project Type:</strong> ${projectType}</p>
                    <p><strong>Project Scale:</strong> ${projectScale || 'Not specified'}</p>
                    <p><strong>Location:</strong> ${location || 'Not specified'}</p>
                    <p><strong>Budget Range:</strong> ${budget || 'To be discussed'}</p>
                    <p><strong>Timeline:</strong> ${timeline || 'Flexible'}</p>
                </div>

                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Project Requirements</h3>
                    <p>${requirements || 'No specific requirements provided'}</p>
                </div>

                <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                    This request was submitted via the TMV Business Solutions Architectural Services portal.
                </p>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'architecture',
            DEPARTMENT_EMAILS.architecture,
            `New Architectural Project: ${projectType} - ${name}`,
            emailHtml
        );

        if (emailResult) {
            console.log('✅ Architectural services email sent successfully');
        } else {
            console.error('⚠️ Failed to send architectural services email');
        }

        res.status(200).json({
            message: 'Architectural services request submitted successfully',
            data: {
                name,
                email,
                projectType,
                projectScale: projectScale || 'Not specified',
                submittedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Architectural services booking error:', error);
        res.status(500).json({ 
            message: 'Service request failed',
            error: error.message 
        });
    }
});

// General Enquiries Endpoint
app.post('/api/services/enquiry', async (req, res) => {
    try {
        const { name, email, phone, subject, message, serviceInterest } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                message: 'Name, email, subject, and message are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    email: !email ? 'Email is required' : null,
                    subject: !subject ? 'Subject is required' : null,
                    message: !message ? 'Message is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Send general enquiry email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New General Enquiry</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Contact Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                </div>

                <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Enquiry Details</h3>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Service Interest:</strong> ${serviceInterest || 'General enquiry'}</p>
                </div>

                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Message</h3>
                    <p>${message}</p>
                </div>

                <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                    This enquiry was submitted via the TMV Business Solutions contact portal.
                </p>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'general',
            DEPARTMENT_EMAILS.general,
            `New Enquiry: ${subject} - ${name}`,
            emailHtml
        );

        if (emailResult) {
            console.log('✅ General enquiry email sent successfully');
        } else {
            console.error('⚠️ Failed to send general enquiry email');
        }

        res.status(200).json({
            message: 'Enquiry submitted successfully',
            data: {
                name,
                email,
                subject,
                submittedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('General enquiry error:', error);
        res.status(500).json({ 
            message: 'Enquiry submission failed',
            error: error.message 
        });
    }
});

// Email Test Route - Test all department emails
app.get('/api/test-email', async (req, res) => {
    try {
        const testEmail = process.env.TEST_EMAIL || 'tshepisokgamanyane@gmail.com';
        const results = {};

        // Test careers email
        console.log('🧪 Testing careers email...');
        results.careers = await sendDepartmentEmail(
            'careers',
            testEmail,
            'TEST: Careers Department Email Configuration',
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">✅ Careers Email Test Successful</h2>
                    <p>This is a test email from the <strong>careers@tmvbusinesssolutions.co.za</strong> department.</p>
                    <p>If you received this email, the careers email configuration is working correctly.</p>
                    <p><em>Sent at: ${new Date().toISOString()}</em></p>
                </div>
            `
        );

        // Test IT Infrastructure email
        console.log('🧪 Testing IT Infrastructure email...');
        results.itInfrastructure = await sendDepartmentEmail(
            'itInfrastructure',
            testEmail,
            'TEST: IT Infrastructure Department Email Configuration',
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">✅ IT Infrastructure Email Test Successful</h2>
                    <p>This is a test email from the <strong>itinfrustructure@tmvbusinesssolutions.co.za</strong> department.</p>
                    <p>If you received this email, the IT infrastructure email configuration is working correctly.</p>
                    <p><em>Sent at: ${new Date().toISOString()}</em></p>
                </div>
            `
        );

        // Test Architecture email
        console.log('🧪 Testing Architecture email...');
        results.architecture = await sendDepartmentEmail(
            'architecture',
            testEmail,
            'TEST: Architecture Department Email Configuration',
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">✅ Architecture Email Test Successful</h2>
                    <p>This is a test email from the <strong>architecture@tmvbusinesssolutions.co.za</strong> department.</p>
                    <p>If you received this email, the architecture email configuration is working correctly.</p>
                    <p><em>Sent at: ${new Date().toISOString()}</em></p>
                </div>
            `
        );

        // Test General Enquiries email
        console.log('🧪 Testing General Enquiries email...');
        results.general = await sendDepartmentEmail(
            'general',
            testEmail,
            'TEST: General Enquiries Department Email Configuration',
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">✅ General Enquiries Email Test Successful</h2>
                    <p>This is a test email from the <strong>enquiries@tmvbusinesssolutions.co.za</strong> department.</p>
                    <p>If you received this email, the general enquiries email configuration is working correctly.</p>
                    <p><em>Sent at: ${new Date().toISOString()}</em></p>
                </div>
            `
        );

        const successCount = Object.values(results).filter(result => result && result.success === true).length;
        const totalTests = Object.keys(results).length;

        res.json({
            success: successCount === totalTests,
            message: `Email test completed: ${successCount}/${totalTests} departments successful`,
            testEmail: testEmail,
            results: {
                careers: (results.careers && results.careers.success) ? 'SUCCESS' : 'FAILED',
                itInfrastructure: (results.itInfrastructure && results.itInfrastructure.success) ? 'SUCCESS' : 'FAILED',
                architecture: (results.architecture && results.architecture.success) ? 'SUCCESS' : 'FAILED',
                general: (results.general && results.general.success) ? 'SUCCESS' : 'FAILED'
            },
            departments: {
                careers: DEPARTMENT_EMAILS.careers,
                itInfrastructure: DEPARTMENT_EMAILS.itInfrastructure,
                architecture: DEPARTMENT_EMAILS.architecture,
                general: DEPARTMENT_EMAILS.general
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({
            success: false,
            message: 'Email test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Individual Department Email Test Route
app.post('/api/test-email', async (req, res) => {
    try {
        const { department, testEmail } = req.body;
        
        // Validation
        if (!department || !testEmail) {
            return res.status(400).json({
                success: false,
                message: 'Department and testEmail are required',
                error: 'Missing required fields'
            });
        }

        // Validate department
        const validDepartments = ['careers', 'itInfrastructure', 'architecture', 'general'];
        if (!validDepartments.includes(department)) {
            return res.status(400).json({
                success: false,
                message: `Invalid department. Must be one of: ${validDepartments.join(', ')}`,
                error: 'Invalid department'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(testEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
                error: 'Invalid email format'
            });
        }

        // Department display names and colors
        const departmentInfo = {
            careers: { name: 'Careers', email: 'careers@tmvbusinesssolutions.co.za', color: '#e74c3c' },
            itInfrastructure: { name: 'IT Infrastructure', email: 'itinfrustructure@tmvbusinesssolutions.co.za', color: '#3498db' },
            architecture: { name: 'Architecture', email: 'architecture@tmvbusinesssolutions.co.za', color: '#f39c12' },
            general: { name: 'General Enquiries', email: 'enquiries@tmvbusinesssolutions.co.za', color: '#27ae60' }
        };

        const deptInfo = departmentInfo[department];
        
        console.log(`🧪 Testing ${deptInfo.name} email to ${testEmail}...`);
        
        // Send test email
        const result = await sendDepartmentEmail(
            department,
            testEmail,
            `TEST: ${deptInfo.name} Department Email Configuration`,
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
                    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: ${deptInfo.color}; text-align: center; margin-bottom: 30px;">
                            ✅ ${deptInfo.name} Email Test Successful
                        </h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
                                <strong>🎉 Congratulations!</strong> This test email was successfully sent from the 
                                <strong style="color: ${deptInfo.color};">${deptInfo.name}</strong> department.
                            </p>
                        </div>

                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">Email Configuration Details:</h3>
                            <p><strong>Department:</strong> ${deptInfo.name}</p>
                            <p><strong>From Email:</strong> ${deptInfo.email}</p>
                            <p><strong>Test Recipient:</strong> ${testEmail}</p>
                            <p><strong>Sent At:</strong> ${new Date().toLocaleString('en-ZA', {
                                timeZone: 'Africa/Johannesburg',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })} (South African Time)</p>
                        </div>

                        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
                            <p style="margin: 0; color: #155724;">
                                <strong>✨ What this means:</strong> The email system is working correctly and emails from this department 
                                will be successfully delivered to customers and leads.
                            </p>
                        </div>

                        <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
                                This is a test email from TMV Business Solutions<br>
                                Email System Configuration Test
                            </p>
                        </div>
                    </div>
                </div>
            `
        );

        if (result.success) {
            console.log(`✅ ${deptInfo.name} test email sent successfully: ${result.messageId}`);
            res.json({
                success: true,
                message: `Test email from ${deptInfo.name} department sent successfully`,
                department: deptInfo.name,
                fromEmail: deptInfo.email,
                toEmail: testEmail,
                messageId: result.messageId,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error(`❌ Failed to send ${deptInfo.name} test email:`, result.error);
            res.status(500).json({
                success: false,
                message: `Failed to send test email from ${deptInfo.name} department`,
                department: deptInfo.name,
                fromEmail: deptInfo.email,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Individual email test error:', error);
        res.status(500).json({
            success: false,
            message: 'Email test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// CONSULTATION API ENDPOINT
// ===============================

// Consultation Booking Endpoint
app.post('/api/consultation', async (req, res) => {
    try {
        const { firstName, lastName, email, cellNo, telNo, description } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !description) {
            return res.status(400).json({ 
                message: 'First name, last name, email, and description are required',
                errors: {
                    firstName: !firstName ? 'First name is required' : null,
                    lastName: !lastName ? 'Last name is required' : null,
                    email: !email ? 'Email is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Phone validation (if provided)
        if (cellNo || telNo) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
            if (cellNo && !phoneRegex.test(cellNo)) {
                return res.status(400).json({ 
                    message: 'Invalid cell phone number format',
                    errors: { cellNo: 'Please enter a valid cell phone number' }
                });
            }
            if (telNo && !phoneRegex.test(telNo)) {
                return res.status(400).json({ 
                    message: 'Invalid telephone number format',
                    errors: { telNo: 'Please enter a valid telephone number' }
                });
            }
        }

        // Send consultation email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New Consultation Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Cell Phone:</strong> ${cellNo || 'Not provided'}</p>
                    <p><strong>Telephone:</strong> ${telNo || 'Not provided'}</p>
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Consultation Description</h3>
                    <p style="line-height: 1.6;">${description}</p>
                </div>

                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString('en-ZA', { 
                            timeZone: 'Africa/Johannesburg',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} (South African Time)
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This consultation request was submitted through the TMV Business Solutions website.
                    </p>
                </div>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'itInfrastructure',
            'itinfrustructure@tmvbusinesssolutions.co.za',
            `New IT Infrastructure Consultation Request from ${firstName} ${lastName}`,
            emailHtml
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send consultation email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to submit consultation request. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ Consultation request email sent successfully');

        res.status(200).json({
            message: 'Consultation request submitted successfully',
            data: {
                firstName,
                lastName,
                email,
                cellNo,
                telNo,
                submittedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Consultation submission error:', error);
        res.status(500).json({ 
            message: 'Failed to submit consultation request',
            error: error.message 
        });
    }
});

// IT Infrastructure Consultation Endpoint
app.post('/api/consultation/it-infrastructure', async (req, res) => {
    try {
        const { firstName, lastName, email, cellNo, telNo, description, _testUserEmail } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !description) {
            return res.status(400).json({ 
                message: 'First name, last name, email, and description are required',
                errors: {
                    firstName: !firstName ? 'First name is required' : null,
                    lastName: !lastName ? 'Last name is required' : null,
                    email: !email ? 'Email is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Phone validation (if provided)
        if (cellNo || telNo) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
            if (cellNo && !phoneRegex.test(cellNo)) {
                return res.status(400).json({ 
                    message: 'Invalid cell phone number format',
                    errors: { cellNo: 'Please enter a valid cell phone number' }
                });
            }
            if (telNo && !phoneRegex.test(telNo)) {
                return res.status(400).json({ 
                    message: 'Invalid telephone number format',
                    errors: { telNo: 'Please enter a valid telephone number' }
                });
            }
        }

        // Send IT Infrastructure consultation email
        const userEmail = req.session.userEmail || _testUserEmail; // Get the logged-in user's email or test email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New IT Infrastructure Consultation Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Cell Phone:</strong> ${cellNo || 'Not provided'}</p>
                    <p><strong>Telephone:</strong> ${telNo || 'Not provided'}</p>
                    ${userEmail ? `<p><strong>Submitted by logged-in user:</strong> ${userEmail}</p>` : ''}
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">IT Infrastructure Requirements</h3>
                    <p style="line-height: 1.6;">${description}</p>
                </div>

                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString('en-ZA', { 
                            timeZone: 'Africa/Johannesburg',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} (South African Time)
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This IT Infrastructure consultation request was submitted through the TMV Business Solutions website.
                        ${userEmail ? `<br>Reply directly to this email to respond to the client (${userEmail}).` : ''}
                    </p>
                </div>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'itInfrastructure',
            'itinfrustructure@tmvbusinesssolutions.co.za',
            `New IT Infrastructure Consultation Request from ${firstName} ${lastName}`,
            emailHtml,
            userEmail || email // Use logged-in user's email or form email as fallback
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send IT Infrastructure consultation email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to submit IT Infrastructure consultation request. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ IT Infrastructure consultation request email sent successfully');
        console.log(`📧 Email appears to come from: ${userEmail || email}`);
        console.log(`📧 Email sent to: itinfrustructure@tmvbusinesssolutions.co.za`);

        res.status(200).json({
            message: 'IT Infrastructure consultation request submitted successfully',
            data: {
                firstName,
                lastName,
                email,
                cellNo,
                telNo,
                submittedAt: new Date().toISOString(),
                fromUserEmail: userEmail || email
            }
        });

    } catch (error) {
        console.error('IT Infrastructure consultation submission error:', error);
        res.status(500).json({ 
            message: 'Failed to submit IT Infrastructure consultation request',
            error: error.message 
        });
    }
});

// Architecture Consultation Endpoint
app.post('/api/consultation/architecture', async (req, res) => {
    try {
        const { firstName, lastName, email, cellNo, telNo, description, _testUserEmail } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !description) {
            return res.status(400).json({ 
                message: 'First name, last name, email, and description are required',
                errors: {
                    firstName: !firstName ? 'First name is required' : null,
                    lastName: !lastName ? 'Last name is required' : null,
                    email: !email ? 'Email is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Phone validation (if provided)
        if (cellNo || telNo) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
            if (cellNo && !phoneRegex.test(cellNo)) {
                return res.status(400).json({ 
                    message: 'Invalid cell phone number format',
                    errors: { cellNo: 'Please enter a valid cell phone number' }
                });
            }
            if (telNo && !phoneRegex.test(telNo)) {
                return res.status(400).json({ 
                    message: 'Invalid telephone number format',
                    errors: { telNo: 'Please enter a valid telephone number' }
                });
            }
        }

        // Send Architecture consultation email
        const userEmail = req.session.userEmail || _testUserEmail;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New Architecture Consultation Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Cell Phone:</strong> ${cellNo || 'Not provided'}</p>
                    <p><strong>Telephone:</strong> ${telNo || 'Not provided'}</p>
                    ${userEmail ? `<p><strong>Submitted by logged-in user:</strong> ${userEmail}</p>` : ''}
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Architecture Project Requirements</h3>
                    <p style="line-height: 1.6;">${description}</p>
                </div>

                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString('en-ZA', { 
                            timeZone: 'Africa/Johannesburg',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} (South African Time)
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This Architecture consultation request was submitted through the TMV Business Solutions website.
                        ${userEmail ? `<br>Reply directly to this email to respond to the client (${userEmail}).` : ''}
                    </p>
                </div>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'architecture',
            'architecture@tmvbusinesssolutions.co.za',
            `New Architecture Consultation Request from ${firstName} ${lastName}`,
            emailHtml,
            userEmail || email
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send Architecture consultation email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to submit Architecture consultation request. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ Architecture consultation request email sent successfully');
        console.log(`📧 Email appears to come from: ${userEmail || email}`);
        console.log(`📧 Email sent to: architecture@tmvbusinesssolutions.co.za`);

        res.status(200).json({
            message: 'Architecture consultation request submitted successfully',
            data: {
                firstName,
                lastName,
                email,
                cellNo,
                telNo,
                submittedAt: new Date().toISOString(),
                fromUserEmail: userEmail || email
            }
        });

    } catch (error) {
        console.error('Architecture consultation submission error:', error);
        res.status(500).json({ 
            message: 'Failed to submit Architecture consultation request',
            error: error.message 
        });
    }
});

// Careers Consultation Endpoint
app.post('/api/consultation/careers', async (req, res) => {
    try {
        const { firstName, lastName, email, cellNo, telNo, description, _testUserEmail } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !description) {
            return res.status(400).json({ 
                message: 'First name, last name, email, and description are required',
                errors: {
                    firstName: !firstName ? 'First name is required' : null,
                    lastName: !lastName ? 'Last name is required' : null,
                    email: !email ? 'Email is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Phone validation (if provided)
        if (cellNo || telNo) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
            if (cellNo && !phoneRegex.test(cellNo)) {
                return res.status(400).json({ 
                    message: 'Invalid cell phone number format',
                    errors: { cellNo: 'Please enter a valid cell phone number' }
                });
            }
            if (telNo && !phoneRegex.test(telNo)) {
                return res.status(400).json({ 
                    message: 'Invalid telephone number format',
                    errors: { telNo: 'Please enter a valid telephone number' }
                });
            }
        }

        // Send Careers consultation email
        const userEmail = req.session.userEmail || _testUserEmail;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New Careers Consultation Request</h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Cell Phone:</strong> ${cellNo || 'Not provided'}</p>
                    <p><strong>Telephone:</strong> ${telNo || 'Not provided'}</p>
                    ${userEmail ? `<p><strong>Submitted by logged-in user:</strong> ${userEmail}</p>` : ''}
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Career Services Requirements</h3>
                    <p style="line-height: 1.6;">${description}</p>
                </div>

                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString('en-ZA', { 
                            timeZone: 'Africa/Johannesburg',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })} (South African Time)
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This Careers consultation request was submitted through the TMV Business Solutions website.
                        ${userEmail ? `<br>Reply directly to this email to respond to the client (${userEmail}).` : ''}
                    </p>
                </div>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'careers',
            'careers@tmvbusinesssolutions.co.za',
            `New Careers Consultation Request from ${firstName} ${lastName}`,
            emailHtml,
            userEmail || email
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send Careers consultation email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to submit Careers consultation request. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ Careers consultation request email sent successfully');
        console.log(`📧 Email appears to come from: ${userEmail || email}`);
        console.log(`📧 Email sent to: careers@tmvbusinesssolutions.co.za`);

        res.status(200).json({
            message: 'Careers consultation request submitted successfully',
            data: {
                firstName,
                lastName,
                email,
                cellNo,
                telNo,
                submittedAt: new Date().toISOString(),
                fromUserEmail: userEmail || email
            }
        });

    } catch (error) {
        console.error('Careers consultation submission error:', error);
        res.status(500).json({ 
            message: 'Failed to submit Careers consultation request',
            error: error.message 
        });
    }
});

// Business Plan Quote Request Endpoint
app.post('/api/consultation/business-plan', async (req, res) => {
    try {
        console.log('📝 Received business plan quote request');
        console.log('Request body:', req.body);

        const { name, email, businessDescription } = req.body;

        // Validation
        if (!name || !email || !businessDescription) {
            return res.status(400).json({ 
                message: 'All fields are required',
                errors: {
                    name: !name ? 'Name is required' : null,
                    email: !email ? 'Email is required' : null,
                    businessDescription: !businessDescription ? 'Business description is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Get user email if authenticated
        const userEmail = req.session.userEmail;
        console.log('🔍 Session user email:', userEmail);
        console.log('📧 Form email:', email);
        console.log('👤 Authenticated user:', req.session.userId ? 'Yes' : 'No');

        // Create email content
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3498db;">New Business Plan Quote Request</h2>
                
                <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Client Information</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Business Description</h3>
                    <p style="white-space: pre-wrap; line-height: 1.6;">${businessDescription}</p>
                </div>

                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">Service Details</h3>
                    <p><strong>Service Type:</strong> Custom Business Plan</p>
                    <p><strong>Package:</strong> Premium Business Plan with comprehensive market analysis, financial projections, and strategic planning</p>
                    <p><strong>Includes:</strong></p>
                    <ul>
                        <li>Executive Summary</li>
                        <li>Market Analysis & Research</li>
                        <li>Business Model & Strategy</li>
                        <li>Financial Projections (3-5 years)</li>
                        <li>Competitive Analysis</li>
                        <li>Marketing Strategy</li>
                        <li>Operations Plan</li>
                        <li>Risk Assessment</li>
                        <li>Growth Strategy & Milestones</li>
                        <li>Investment Requirements</li>
                        <li>Break-even Analysis</li>
                    </ul>
                </div>

                <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                    This quote request was submitted through the TMV Business Solutions consulting portal.
                </p>
            </div>
        `;

        const emailResult = await sendDepartmentEmail(
            'businessplan',
            'businessplan@tmvbusinesssolutions.co.za',
            `New Business Plan Quote Request from ${name}`,
            emailHtml,
            userEmail || email
        );

        if (!emailResult.success) {
            console.error('❌ Failed to send Business Plan quote email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to submit business plan quote request. Please try again.',
                error: 'Email delivery failed'
            });
        }

        console.log('✅ Business Plan quote request email sent successfully');
        console.log(`📧 Email appears to come from: ${userEmail || email}`);
        console.log(`📧 Email sent to: businessplan@tmvbusinesssolutions.co.za`);

        res.status(200).json({
            message: 'Business plan quote request submitted successfully',
            data: {
                name,
                email,
                businessDescription,
                submittedAt: new Date().toISOString(),
                fromUserEmail: userEmail || email
            }
        });

    } catch (error) {
        console.error('Business plan quote submission error:', error);
        res.status(500).json({ 
            message: 'Failed to submit business plan quote request',
            error: error.message 
        });
    }
});

// ===============================
// JOBSEEKER API ENDPOINTS
// ===============================

// Jobseeker Registration Route
app.post('/api/jobseeker/register', async (req, res) => {
    try {
        const { 
            title, 
            firstName, 
            lastName, 
            email, 
            phone, 
            idNumber, 
            password, 
            confirmPassword,
            industry,
            agreeTerms,
            jobUpdates = false
        } = req.body;

        // Basic validation - only firstName, lastName, email, password are required
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            return res.status(400).json({ 
                message: 'All required fields must be filled',
                errors: {
                    firstName: !firstName ? 'First name is required' : null,
                    lastName: !lastName ? 'Last name is required' : null,
                    email: !email ? 'Email is required' : null,
                    password: !password ? 'Password is required' : null,
                    confirmPassword: !confirmPassword ? 'Confirm password is required' : null
                }
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format',
                errors: { email: 'Please enter a valid email address' }
            });
        }

        // Phone validation (South African format) - only if provided
        if (phone) {
            const phoneRegex = /^(\+27|0)[67][0-9]{8}$/;
            if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                return res.status(400).json({ 
                    message: 'Invalid phone number format',
                    errors: { phone: 'Please enter a valid South African phone number' }
                });
            }
        }

        // ID Number validation (South African format) - only if provided
        if (idNumber) {
            const idNumberRegex = /^[0-9]{13}$/;
            if (!idNumberRegex.test(idNumber)) {
                return res.status(400).json({ 
                    message: 'Invalid ID number format',
                    errors: { idNumber: 'ID number must be 13 digits' }
                });
            }
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters',
                errors: { password: 'Password must be at least 6 characters' }
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                message: 'Passwords do not match',
                errors: { confirmPassword: 'Passwords do not match' }
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Email already registered',
                errors: { email: 'This email is already registered' }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create jobseeker user
        const newJobseeker = await User.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password_hash: hashedPassword,
            role: 'jobseeker',
            phone,
            id_number: idNumber,
            title,
            industry,
            job_updates: jobUpdates
        });

        // Auto-login after registration
        req.session.userId = newJobseeker.id;
        req.session.userName = createDisplayName(newJobseeker.first_name, newJobseeker.last_name);
        req.session.userEmail = newJobseeker.email;
        req.session.userType = newJobseeker.role;

        // Send registration notification email to jobseeker@tmvbusinesssolutions.co.za
        try {
            console.log('📧 Preparing to send jobseeker registration notification email...');
            console.log('   New Jobseeker:', newJobseeker.first_name, newJobseeker.last_name);
            console.log('   Email:', newJobseeker.email);
            
            const registrationHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">New Jobseeker Registration</h2>
                    
                    <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Jobseeker Information</h3>
                        <p><strong>Name:</strong> ${newJobseeker.title || ''} ${newJobseeker.first_name} ${newJobseeker.last_name}</p>
                        <p><strong>Email:</strong> ${newJobseeker.email}</p>
                        <p><strong>Phone:</strong> ${newJobseeker.phone || 'Not provided'}</p>
                        <p><strong>ID Number:</strong> ${newJobseeker.id_number || 'Not provided'}</p>
                        <p><strong>Industry:</strong> ${newJobseeker.industry || 'Not specified'}</p>
                        <p><strong>Job Updates:</strong> ${newJobseeker.job_updates ? 'Yes' : 'No'}</p>
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Registration Details</h3>
                        <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Account Type:</strong> Jobseeker</p>
                        <p><strong>Status:</strong> Active</p>
                    </div>

                    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                        This notification was sent from the TMV Business Solutions career portal.
                    </p>
                </div>
            `;
            
            const emailResult = await sendDepartmentEmail(
                'careers',
                'careers@tmvbusinesssolutions.co.za',
                `New Jobseeker Registration: ${newJobseeker.first_name} ${newJobseeker.last_name}`,
                registrationHtml,
                newJobseeker.email  // Use new user's email as FROM address
            );
            
            if (emailResult && emailResult.success) {
                console.log('✅ Jobseeker registration notification email sent successfully to careers@tmvbusinesssolutions.co.za');
            } else {
                console.error('⚠️ Failed to send jobseeker registration notification email:', emailResult ? emailResult.error : 'Unknown error');
            }
        } catch (emailError) {
            console.error('❌ Failed to send jobseeker registration notification email:', emailError);
            console.error('   Error details:', emailError.message);
            // Don't fail the registration if email fails
        }

        res.status(201).json({
            message: 'Jobseeker registration successful',
            user: {
                id: newJobseeker.id,
                name: createDisplayName(newJobseeker.first_name, newJobseeker.last_name),
                firstName: newJobseeker.first_name,
                lastName: newJobseeker.last_name,
                email: newJobseeker.email,
                userType: newJobseeker.role,
                title: newJobseeker.title,
                phone: newJobseeker.phone,
                industry: newJobseeker.industry
            }
        });
    } catch (error) {
        console.error('Jobseeker registration error:', error);
        res.status(500).json({ 
            message: 'Registration failed',
            error: error.message 
        });
    }
});

// Jobseeker Login Route
app.post('/api/jobseeker/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required',
                errors: {
                    email: !email ? 'Email is required' : null,
                    password: !password ? 'Password is required' : null
                }
            });
        }

        // Find jobseeker user
        const jobseeker = await User.findOne({ 
            where: { 
                email,
                role: 'jobseeker'
            } 
        });
        
        if (!jobseeker) {
            return res.status(401).json({ 
                message: 'Invalid email or password, or not a jobseeker account',
                errors: { email: 'Invalid credentials' }
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, jobseeker.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Invalid email or password',
                errors: { password: 'Invalid credentials' }
            });
        }

        // Create session
        req.session.userId = jobseeker.id;
        req.session.userName = createDisplayName(jobseeker.first_name, jobseeker.last_name);
        req.session.userEmail = jobseeker.email;
        req.session.userType = jobseeker.role;

        res.json({
            message: 'Jobseeker login successful',
            user: {
                id: jobseeker.id,
                name: createDisplayName(jobseeker.first_name, jobseeker.last_name),
                firstName: jobseeker.first_name,
                lastName: jobseeker.last_name,
                email: jobseeker.email,
                userType: jobseeker.role,
                title: jobseeker.title,
                phone: jobseeker.phone,
                industry: jobseeker.industry
            }
        });
    } catch (error) {
        console.error('Jobseeker login error:', error);
        res.status(500).json({ 
            message: 'Login failed',
            error: error.message 
        });
    }
});

// Jobseeker Logout Route
app.post('/api/jobseeker/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        clearSessionCookie(res);
        res.json({ message: 'Logout successful' });
    });
});

// ❌ REMOVED DUPLICATE - This was preventing profile from loading correctly
// The correct endpoint is at line 2739 which checks jobseeker_profiles table
/* 
app.get('/api/jobseeker/profile', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const jobseeker = await User.findByPk(req.session.userId);
        if (!jobseeker) {
            return res.status(404).json({ 
                message: 'Jobseeker not found' 
            });
        }

        res.json({
            user: {
                id: jobseeker.id,
                name: createDisplayName(jobseeker.first_name, jobseeker.last_name),
                firstName: jobseeker.first_name,
                lastName: jobseeker.last_name,
                email: jobseeker.email,
                userType: jobseeker.role,
                title: jobseeker.title,
                phone: jobseeker.phone,
                idNumber: jobseeker.id_number,
                industry: jobseeker.industry,
                jobUpdates: jobseeker.job_updates
            }
        });
    } catch (error) {
        console.error('Jobseeker profile error:', error);
        res.status(500).json({ 
            message: 'Failed to fetch profile',
            error: error.message 
        });
    }
});
*/

// Create Job Applications and Wishlist tables
const JobApplication = sequelize.define('JobApplication', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    jobId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'jobs',
            key: 'id'
        }
    },
    employerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'shortlisted', 'invited', 'accepted', 'rejected'),
        defaultValue: 'pending'
    },
    coverLetter: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    invitationDetails: {
        type: DataTypes.JSON,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    appliedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    respondedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'job_applications',
    timestamps: true
});

// Task Model (for Management to assign tasks to HR)
const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    assignedToId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User ID of the HR staff assigned to this task'
    },
    assignedById: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User ID of the Manager who assigned this task'
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'returned', 'cancelled'),
        defaultValue: 'pending',
        comment: 'Task status: pending=not started, in_progress=being worked on, completed=finished, returned=sent back to manager, cancelled=cancelled by manager'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes and updates from the assigned user'
    },
    checklist: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Checklist items for task completion: [{id, text, completed, createdAt}]'
    },
    returnReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason why task was returned to manager'
    },
    relatedJobId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Optional: Link to a specific job if task is job-related'
    }
}, {
    tableName: 'tasks',
    timestamps: true
});

// Notification Model (for job approval workflow notifications)
const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User ID who receives this notification'
    },
    type: {
        type: DataTypes.ENUM('job_approved', 'job_rejected', 'job_pending', 'job_resubmitted', 'task_assigned', 'task_update'),
        allowNull: false,
        comment: 'Notification type: job_* for job approvals, task_assigned for new task, task_update for status changes'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    relatedJobId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Link to the job this notification is about'
    },
    relatedTaskId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Link to the task this notification is about'
    },
    relatedUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User who triggered this notification (e.g., manager who approved/rejected)'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

const JobWishlist = sequelize.define('JobWishlist', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    jobId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    savedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'job_wishlist',
    timestamps: false
});

// Jobseeker Profile Model
const JobseekerProfile = sequelize.define('JobseekerProfile', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: User,
            key: 'id'
        }
    },
    gender: {
        type: DataTypes.ENUM('Male', 'Female', 'Other'),
        allowNull: true
    },
    idNumber: {
        type: DataTypes.STRING(13),
        allowNull: true
    },
    cellNumber: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    fullPicture: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    halfPicture: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    province: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    town: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    suburb: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    qualifications: {
        type: DataTypes.JSON,
        allowNull: true
    },
    documents: {
        type: DataTypes.JSON,
        allowNull: true
    },
    // Skills and Competencies
    skills: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of skills/competencies'
    },
    race: {
        type: DataTypes.ENUM('African', 'Coloured', 'Indian', 'White', 'Other'),
        allowNull: true
    },
    // Language
    language: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'SA official language'
    },
    // Transport
    transport: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Yes/No - Do you have your own transport'
    },
    driversLicense: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'SA Driver License Code (A, A1, B, C, C1, EB, EC, EC1, None)'
    },
    // Experience (multiple)
    experiences: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of work experience objects'
    }
}, {
    tableName: 'jobseeker_profiles',
    timestamps: true
});

// Employer Profile Model
const EmployerProfile = sequelize.define('EmployerProfile', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: User,
            key: 'id'
        }
    },
    role: {
        type: DataTypes.ENUM('administrator', 'management', 'hr_recruitment'),
        defaultValue: 'hr_recruitment',
        allowNull: false,
        comment: 'User role: administrator, management, or hr_recruitment'
    },
    accessLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        comment: '1=Administrator, 2=Management, 3=HR & Recruitment'
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'HR department/team'
    },
    contactNumber: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    jobTitle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Job title within organization'
    },
    
    // ==================== JOB POSTING PERMISSIONS ====================
    canCreatePost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to create new job posts'
    },
    canWritePost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to write/draft job posts'
    },
    canEditPost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to edit existing job posts'
    },
    canDeletePost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to delete job posts'
    },
    canAssignPost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to assign job posts to other staff'
    },
    canTransferPost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to transfer job posts between departments'
    },
    canWithdrawPost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to withdraw/close job posts'
    },
    
    // ==================== APPLICATION MANAGEMENT PERMISSIONS ====================
    canViewApplications: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to view job applications'
    },
    canReviewApplications: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to review and assess applications'
    },
    canShortlistCandidates: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to shortlist candidates'
    },
    canRejectCandidates: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to reject candidates'
    },
    canScheduleInterviews: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to schedule interviews'
    },
    
    // ==================== REPORTING PERMISSIONS ====================
    canPullReportApplied: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to pull reports for applied candidates'
    },
    canPullReportShortlisted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to pull reports for shortlisted candidates'
    },
    canPullReportRejected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to pull reports for rejected candidates'
    },
    canPullReportFull: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to pull full comprehensive reports (all jobs, dates, stats)'
    },
    canExportReports: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to export reports to CSV/Excel'
    },
    
    // ==================== ADMINISTRATOR PERMISSIONS ====================
    canAddUsers: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to add new users (Admin only)'
    },
    canDeleteUsers: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to delete users (Admin only)'
    },
    canResetPasswords: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to reset passwords (Admin only)'
    },
    canManageSettings: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to manage system settings (Admin only)'
    },
    canManagePermissions: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to manage other users permissions (Admin only)'
    },
    
    // ==================== ANALYTICS & MONITORING PERMISSIONS ====================
    canViewAnalytics: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to view system analytics and dashboards'
    },
    canViewAllJobs: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to view all jobs (not just own posts)'
    },
    canMonitorPerformance: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to monitor team performance metrics'
    },
    
    // ==================== MANAGEMENT PERMISSIONS ====================
    canAssignTasks: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to assign tasks to HR staff (Management)'
    },
    canApproveJobs: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to approve/reject job posts before publishing'
    },
    canManageTeam: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Permission to manage team members'
    }
}, {
    tableName: 'employer_profiles',
    timestamps: true
});

// Helper function to get default permissions for a role
function getRolePermissions(role) {
    const permissions = {
        administrator: {
            role: 'administrator',
            accessLevel: 1,
            // Admin has full access to everything
            canCreatePost: true,
            canWritePost: true,
            canEditPost: true,
            canDeletePost: true,
            canAssignPost: true,
            canTransferPost: true,
            canWithdrawPost: true,
            canViewApplications: true,
            canReviewApplications: true,
            canShortlistCandidates: true,
            canRejectCandidates: true,
            canScheduleInterviews: true,
            canPullReportApplied: true,
            canPullReportShortlisted: true,
            canPullReportRejected: true,
            canPullReportFull: true,
            canExportReports: true,
            canAddUsers: true,
            canDeleteUsers: true,
            canResetPasswords: true,
            canManageSettings: true,
            canManagePermissions: true,
            canViewAnalytics: true,
            canViewAllJobs: true,
            canMonitorPerformance: true,
            canAssignTasks: true,
            canApproveJobs: true,
            canManageTeam: true
        },
        management: {
            role: 'management',
            accessLevel: 2,
            // Management has ALL HR capabilities PLUS oversight and approval
            // JOB POSTING - Full control (everything HR has + more)
            canCreatePost: true,
            canWritePost: true,
            canEditPost: true,      // Can edit ALL posts (not just own)
            canDeletePost: true,     // Can delete posts (managers need this)
            canAssignPost: true,     // Can assign to HR staff
            canTransferPost: true,   // Can transfer between departments
            canWithdrawPost: true,   // Can withdraw any post
            // APPLICATIONS - Full control (same as HR + more oversight)
            canViewApplications: true,
            canReviewApplications: true,
            canShortlistCandidates: true,
            canRejectCandidates: true,
            canScheduleInterviews: true,
            // REPORTING - Full access (everything including comprehensive reports)
            canPullReportApplied: true,
            canPullReportShortlisted: true,
            canPullReportRejected: true,
            canPullReportFull: true,        // Full reporting access
            canExportReports: true,
            // ADMIN - NO admin rights (only admins can manage users/settings)
            canAddUsers: false,
            canDeleteUsers: false,
            canResetPasswords: false,
            canManageSettings: false,
            canManagePermissions: false,
            // ANALYTICS - Full analytics and monitoring
            canViewAnalytics: true,
            canViewAllJobs: true,           // Can see ALL jobs (not just own)
            canMonitorPerformance: true,    // Can monitor team performance
            // MANAGEMENT - Full management capabilities
            canAssignTasks: true,           // Can assign tasks to HR
            canApproveJobs: true,           // Can approve job posts before publishing
            canManageTeam: true             // Can manage HR team members
        },
        hr_recruitment: {
            role: 'hr_recruitment',
            accessLevel: 3,
            // HR has basic recruitment capabilities
            canCreatePost: true,
            canWritePost: true,
            canEditPost: true,              // Can edit own posts
            canDeletePost: false,           // Cannot delete (manager/admin only)
            canAssignPost: false,           // Cannot assign (manager only)
            canTransferPost: false,         // Cannot transfer (manager only)
            canWithdrawPost: true,          // Can withdraw own posts
            canViewApplications: true,
            canReviewApplications: true,
            canShortlistCandidates: true,
            canRejectCandidates: true,
            canScheduleInterviews: true,
            canPullReportApplied: true,
            canPullReportShortlisted: true,
            canPullReportRejected: true,
            canPullReportFull: false,       // Limited reporting (no full reports)
            canExportReports: true,
            canAddUsers: false,
            canDeleteUsers: false,
            canResetPasswords: false,
            canManageSettings: false,
            canManagePermissions: false,
            canViewAnalytics: false,        // No analytics access
            canViewAllJobs: false,          // Only see own jobs
            canMonitorPerformance: false,   // Cannot monitor performance
            canAssignTasks: false,          // Cannot assign tasks
            canApproveJobs: false,          // Cannot approve jobs
            canManageTeam: false            // Cannot manage team
        }
    };
    
    return permissions[role] || permissions.hr_recruitment;
}

// Job Model
const Job = sequelize.define('Job', {
    employerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    requirements: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    responsibilities: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    jobType: {
        type: DataTypes.ENUM('Permanent', 'Part-Time', 'Freelancer', 'Contract', 'Internship'),
        allowNull: false,
        defaultValue: 'Permanent'
    },
    location: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    province: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    department: {
        type: DataTypes.ENUM(
            'Admin',
            'Architecture',
            'Consulting',
            'Finance & Accounts',
            'Information Technology (IT)',
            'Innovation & Design',
            'Marketing & Branding',
            'Security & Automation'
        ),
        allowNull: true,
        comment: 'Department: Admin, Architecture, Consulting, Finance & Accounts, Information Technology (IT), Innovation & Design, Marketing & Branding, Security & Automation'
    },
    salaryMin: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    salaryMax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    salaryPeriod: {
        type: DataTypes.ENUM('hour', 'month', 'year'),
        allowNull: true,
        defaultValue: 'month'
    },
    experience: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    education: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    closingDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Draft', 'Active', 'Closed', 'Filled', 'pending_approval', 'rejected'),
        allowNull: false,
        defaultValue: 'Active'
    },
    companyName: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    applicationCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // Approval workflow fields
    approvalStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        comment: 'Approval status: pending (awaiting approval), approved (by manager), rejected'
    },
    approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User ID of manager who approved this job'
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejectedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User ID of manager who rejected this job'
    },
    rejectedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'jobs',
    timestamps: true
});

// ============================================
// MODEL ASSOCIATIONS
// ============================================

// User associations
User.hasOne(JobseekerProfile, { foreignKey: 'userId' });
User.hasOne(EmployerProfile, { foreignKey: 'userId' });

// JobseekerProfile associations
JobseekerProfile.belongsTo(User, { foreignKey: 'userId' });

// EmployerProfile associations
EmployerProfile.belongsTo(User, { foreignKey: 'userId' });

// Job associations
Job.belongsTo(User, { as: 'employer_user', foreignKey: 'employerId' });
Job.belongsTo(EmployerProfile, { as: 'employer', foreignKey: 'employerId', targetKey: 'userId' });
Job.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });
Job.belongsTo(User, { as: 'rejector', foreignKey: 'rejectedBy' });

// JobApplication associations
JobApplication.belongsTo(User, { foreignKey: 'userId' });
JobApplication.belongsTo(Job, { foreignKey: 'jobId' });
User.hasMany(JobApplication, { foreignKey: 'userId' });
Job.hasMany(JobApplication, { foreignKey: 'jobId' });

// Task associations
Task.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });
Task.belongsTo(User, { as: 'assignedBy', foreignKey: 'assignedById' });
Task.belongsTo(Job, { as: 'relatedJob', foreignKey: 'relatedJobId' });
User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assignedToId' });
User.hasMany(Task, { as: 'createdTasks', foreignKey: 'assignedById' });

// Notification associations
Notification.belongsTo(User, { as: 'recipient', foreignKey: 'userId' });
Notification.belongsTo(Job, { as: 'relatedJob', foreignKey: 'relatedJobId' });
Notification.belongsTo(User, { as: 'triggeredBy', foreignKey: 'relatedUserId' });
User.hasMany(Notification, { foreignKey: 'userId' });

// ============================================
// STORE MODELS IN APP FOR MIDDLEWARE ACCESS
// ============================================
app.set('models', {
    User,
    Job,
    EmployerProfile,
    JobseekerProfile,
    JobApplication,
    Task,
    Cart,
    CompanyRegistration,
    JobWishlist,
    Notification
});

// ============================================
// API ROUTES
// ============================================

// Job Application Route
app.post('/api/jobseeker/apply', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const { jobId } = req.body;
        const userId = req.session.userId;

        if (!jobId) {
            return res.status(400).json({ 
                message: 'Job ID is required' 
            });
        }

        // Get user details
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        // Get jobseeker profile
        const profile = await JobseekerProfile.findOne({
            where: { userId }
        });

        // Check if already applied
        const existingApplication = await JobApplication.findOne({
            where: { userId, jobId }
        });

        if (existingApplication) {
            return res.status(400).json({ 
                message: 'You have already applied for this job' 
            });
        }

        // Get job details to get employerId
        const job = await Job.findByPk(jobId);
        if (!job) {
            return res.status(404).json({ 
                message: 'Job not found' 
            });
        }

        // Create application
        const application = await JobApplication.create({
            userId,
            jobId,
            employerId: job.employerId,
            status: 'pending'
        });

        // Increment job's application count
        await job.increment('applicationCount');

        // Send job application notification email to careers@tmvbusinesssolutions.co.za
        try {
            console.log('📧 Preparing to send job application notification email...');
            console.log('   Job:', job.title);
            console.log('   Applicant:', user.first_name, user.last_name);
            console.log('   Email:', user.email);
            
            const applicantDetails = {
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: profile?.cellNumber || user.phone || 'Not provided',
                idNumber: profile?.idNumber || user.id_number || 'Not provided'
            };

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">New Job Application Received</h2>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Job Details</h3>
                        <p><strong>Position:</strong> ${job.title}</p>
                        <p><strong>Job Type:</strong> ${job.jobType}</p>
                        <p><strong>Company:</strong> ${job.companyName || 'TMV Business Solutions'}</p>
                        <p><strong>Location:</strong> ${job.location || `${job.city}, ${job.province}`}</p>
                    </div>

                    <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Applicant Information</h3>
                        <p><strong>Name:</strong> ${applicantDetails.firstName} ${applicantDetails.lastName}</p>
                        <p><strong>Email:</strong> ${applicantDetails.email}</p>
                        <p><strong>Phone:</strong> ${applicantDetails.phone}</p>
                        <p><strong>ID Number:</strong> ${applicantDetails.idNumber}</p>
                    </div>

                    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Cover Letter:</strong></p>
                        <p style="font-style: italic;">${coverLetter || 'No cover letter provided'}</p>
                    </div>

                    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                        This notification was sent from the TMV Business Solutions career portal.
                    </p>
                </div>
            `;
            
            const emailResult = await sendDepartmentEmail(
                'careers',
                DEPARTMENT_EMAILS.careers,
                `New Job Application: ${job.title} - ${applicantDetails.firstName} ${applicantDetails.lastName}`,
                emailHtml,
                applicantDetails.email  // Use applicant's email as FROM address
            );
            
            if (emailResult && emailResult.success) {
                console.log('✅ Job application notification email sent successfully to careers@tmvbusinesssolutions.co.za');
            } else {
                console.error('⚠️ Failed to send job application notification email:', emailResult ? emailResult.error : 'Unknown error');
            }
        } catch (emailError) {
            console.error('❌ Failed to send job application notification email:', emailError);
            console.error('   Error details:', emailError.message);
            // Don't fail the application if email fails
        }

        res.json({
            message: 'Application submitted successfully'
        });
    } catch (error) {
        console.error('Job application error:', error);
        res.status(500).json({ 
            message: 'Application failed',
            error: error.message 
        });
    }
});

// Wishlist Routes
app.post('/api/jobseeker/wishlist', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const { jobId } = req.body;
        const userId = req.session.userId;

        if (!jobId) {
            return res.status(400).json({ 
                message: 'Job ID is required' 
            });
        }

        // Check if already in wishlist
        const existingItem = await JobWishlist.findOne({
            where: { userId, jobId }
        });

        if (existingItem) {
            return res.status(400).json({ 
                message: 'Job already in wishlist' 
            });
        }

        // Add to wishlist
        await JobWishlist.create({
            userId,
            jobId
        });

        res.json({
            message: 'Job added to wishlist'
        });
    } catch (error) {
        console.error('Wishlist add error:', error);
        res.status(500).json({ 
            message: 'Failed to add to wishlist',
            error: error.message 
        });
    }
});

app.delete('/api/jobseeker/wishlist', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const { jobId } = req.body;
        const userId = req.session.userId;

        if (!jobId) {
            return res.status(400).json({ 
                message: 'Job ID is required' 
            });
        }

        // Remove from wishlist
        await JobWishlist.destroy({
            where: { userId, jobId }
        });

        res.json({
            message: 'Job removed from wishlist'
        });
    } catch (error) {
        console.error('Wishlist remove error:', error);
        res.status(500).json({ 
            message: 'Failed to remove from wishlist',
            error: error.message 
        });
    }
});

app.get('/api/jobseeker/wishlist', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;

        const wishlistItems = await JobWishlist.findAll({
            where: { userId }
        });

        const wishlist = wishlistItems.map(item => item.jobId);

        res.json({
            wishlist
        });
    } catch (error) {
        console.error('Wishlist fetch error:', error);
        res.status(500).json({ 
            message: 'Failed to fetch wishlist',
            error: error.message 
        });
    }
});

// Get jobseeker applications
app.get('/api/jobseeker/applications', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;

        const applications = await JobApplication.findAll({
            where: { userId },
            include: [{
                model: Job,
                attributes: ['id', 'title', 'companyName', 'location', 'city', 'province', 'jobType', 'salaryMin', 'salaryMax', 'salaryPeriod', 'status', 'closingDate']
            }],
            order: [['createdAt', 'DESC']]
        });

        // Format response with full job details
        const formattedApplications = applications.map(app => ({
            applicationId: app.id,
            id: app.id,
            jobId: app.jobId,
            jobTitle: app.Job?.title || 'Job not found',
            company: app.Job?.companyName || 'TMV Business Solutions',
            location: app.Job?.location || `${app.Job?.city || ''}, ${app.Job?.province || ''}`.trim(),
            jobType: app.Job?.jobType || 'Not specified',
            salary: app.Job?.salaryMin && app.Job?.salaryMax ? 
                `R${app.Job.salaryMin.toLocaleString()} - R${app.Job.salaryMax.toLocaleString()} ${app.Job.salaryPeriod ? 'per ' + app.Job.salaryPeriod : ''}` 
                : 'Competitive',
            jobStatus: app.Job?.status || 'Unknown',
            closingDate: app.Job?.closingDate,
            applicationStatus: app.status,
            appliedAt: app.createdAt,
            appliedDate: new Date(app.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }));

        res.json({
            applications: formattedApplications
        });
    } catch (error) {
        console.error('Applications fetch error:', error);
        res.status(500).json({ 
            message: 'Failed to fetch applications',
            error: error.message 
        });
    }
});

// Get single application details
app.get('/api/jobseeker/applications/:id', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;
        const applicationId = req.params.id;

        console.log(`📄 Fetching application details - User: ${userId}, Application: ${applicationId}`);

        const application = await JobApplication.findOne({
            where: { 
                id: applicationId,
                userId: userId  // Ensure user can only view their own applications
            },
            include: [{
                model: Job,
                attributes: ['id', 'title', 'companyName', 'location', 'city', 'province', 'jobType', 'department', 'salaryMin', 'salaryMax', 'salaryPeriod', 'status', 'description', 'requirements', 'closingDate']
            }]
        });

        if (!application) {
            console.warn(`⚠️ Application not found or access denied - ID: ${applicationId}`);
            return res.status(404).json({ 
                message: 'Application not found or you do not have permission to view it' 
            });
        }

        // Format detailed response
        const formattedApplication = {
            applicationId: application.id,
            jobId: application.jobId,
            jobTitle: application.Job?.title || 'Job not found',
            company: application.Job?.companyName || 'TMV Business Solutions',
            location: application.Job?.location || `${application.Job?.city || ''}, ${application.Job?.province || ''}`.trim(),
            jobType: application.Job?.jobType || 'Not specified',
            department: application.Job?.department || 'Various',
            salary: application.Job?.salaryMin && application.Job?.salaryMax ? 
                `R${application.Job.salaryMin.toLocaleString()} - R${application.Job.salaryMax.toLocaleString()} ${application.Job.salaryPeriod ? 'per ' + application.Job.salaryPeriod : ''}` 
                : 'Competitive',
            description: application.Job?.description || 'No description available',
            requirements: application.Job?.requirements || '',
            jobStatus: application.Job?.status || 'Unknown',
            closingDate: application.Job?.closingDate,
            applicationStatus: application.status,
            coverLetter: application.coverLetter || '',
            resume: application.resume || '',
            appliedAt: application.createdAt,
            appliedDate: new Date(application.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            updatedAt: application.updatedAt
        };

        console.log(`✅ Application details loaded successfully - Status: ${application.status}`);
        res.json(formattedApplication);
    } catch (error) {
        console.error('❌ Application details fetch error:', error);
        res.status(500).json({ 
            message: 'Failed to fetch application details',
            error: error.message 
        });
    }
});

// Update jobseeker application (edit cover letter)
app.put('/api/jobseeker/applications/:id', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;
        const applicationId = req.params.id;
        const { coverLetter } = req.body;

        console.log(`✏️ Updating application - User: ${userId}, Application: ${applicationId}`);

        // Find application
        const application = await JobApplication.findOne({
            where: { 
                id: applicationId,
                userId: userId  // Ensure user can only edit their own applications
            }
        });

        if (!application) {
            console.warn(`⚠️ Application not found - ID: ${applicationId}`);
            return res.status(404).json({ 
                message: 'Application not found or you do not have permission to edit it' 
            });
        }

        // Only allow editing if status is pending or reviewed
        if (application.status !== 'pending' && application.status !== 'reviewed') {
            return res.status(400).json({ 
                message: `Cannot edit application with status: ${application.status}. Only pending or reviewed applications can be edited.` 
            });
        }

        // Update application
        await application.update({
            coverLetter: coverLetter,
            updatedAt: new Date()
        });

        console.log(`✅ Application updated successfully - ID: ${applicationId}`);
        res.json({ 
            message: 'Application updated successfully',
            application: {
                id: application.id,
                coverLetter: application.coverLetter,
                status: application.status,
                updatedAt: application.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Application update error:', error);
        res.status(500).json({ 
            message: 'Failed to update application',
            error: error.message 
        });
    }
});

// Delete jobseeker application (retract)
app.delete('/api/jobseeker/applications/:id', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;
        const applicationId = req.params.id;

        console.log(`🗑️ Retracting application - User: ${userId}, Application: ${applicationId}`);

        // Find application
        const application = await JobApplication.findOne({
            where: { 
                id: applicationId,
                userId: userId  // Ensure user can only delete their own applications
            },
            include: [{
                model: Job,
                attributes: ['id', 'applicationCount']
            }]
        });

        if (!application) {
            console.warn(`⚠️ Application not found - ID: ${applicationId}`);
            return res.status(404).json({ 
                message: 'Application not found or you do not have permission to retract it' 
            });
        }

        // Don't allow retracting if already accepted or rejected
        if (application.status === 'accepted') {
            return res.status(400).json({ 
                message: 'Cannot retract an accepted application. Please contact the employer.' 
            });
        }

        if (application.status === 'rejected') {
            return res.status(400).json({ 
                message: 'This application has already been rejected.' 
            });
        }

        // Get the job to update application count
        const job = application.Job;
        
        // Delete the application
        await application.destroy();

        // Decrement application count on the job
        if (job && job.applicationCount > 0) {
            await job.update({
                applicationCount: job.applicationCount - 1
            });
            console.log(`📊 Job application count updated: ${job.applicationCount - 1}`);
        }

        console.log(`✅ Application retracted successfully - ID: ${applicationId}`);
        res.json({ 
            message: 'Application retracted successfully'
        });
    } catch (error) {
        console.error('❌ Application deletion error:', error);
        res.status(500).json({ 
            message: 'Failed to retract application',
            error: error.message 
        });
    }
});

// Jobseeker Profile Management Routes

// Get profile
app.get('/api/jobseeker/profile', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;

        const profile = await JobseekerProfile.findOne({
            where: { userId }
        });

        const user = await User.findByPk(userId, {
            attributes: ['id', 'first_name', 'last_name', 'email']
        });

        res.json({
            user: {
                id: user.id,
                name: user.first_name,
                surname: user.last_name,
                email: user.email
            },
            profile: profile ? profile.toJSON() : null
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            message: 'Failed to fetch profile',
            error: error.message 
        });
    }
});

// Update profile
app.put('/api/jobseeker/profile', isAuthenticated, async (req, res) => {
    try {
        console.log('📝 Profile update request received');
        console.log('User ID:', req.session.userId);
        console.log('User Type:', req.session.userType);
        console.log('Session data:', JSON.stringify(req.session, null, 2));
        
        // Check if user is logged in
        if (!req.session.userId) {
            console.log('❌ No user ID in session');
            return res.status(401).json({ 
                message: 'Authentication required. Please log in.' 
            });
        }

        // Verify user exists and is a jobseeker by checking database
        const user = await User.findByPk(req.session.userId);
        if (!user) {
            console.log('❌ User not found in database');
            return res.status(404).json({ 
                message: 'User not found.' 
            });
        }

        // Check if user is actually a jobseeker
        if (user.role !== 'jobseeker') {
            console.log('❌ Access denied - user role is:', user.role);
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        // Update session with correct userType if it was missing or incorrect
        if (req.session.userType !== user.role) {
            console.log('⚠️ Updating session userType from', req.session.userType, 'to', user.role);
            req.session.userType = user.role;
        }

        console.log('✅ User verified as jobseeker, proceeding with profile update');

        const userId = req.session.userId;
        const { 
            gender, 
            idNumber, 
            cellNumber,
            fullPicture,
            halfPicture,
            province, 
            town, 
            suburb, 
            qualifications,
            documents,
            // New fields
            skills,
            race,
            language,
            transport,
            driversLicense,
            experiences
        } = req.body;

        console.log('Looking for existing profile for user:', userId);

        // Find or create profile
        let profile = await JobseekerProfile.findOne({ where: { userId } });

        if (profile) {
            console.log('✅ Found existing profile, updating...');
            // Update existing profile
            await profile.update({
                gender,
                idNumber,
                cellNumber,
                fullPicture,
                halfPicture,
                province,
                town,
                suburb,
                qualifications,
                documents,
                // New fields
                skills,
                race,
                language,
                transport,
                driversLicense,
                experiences
            });
            console.log('✅ Profile updated successfully');
        } else {
            console.log('Creating new profile...');
            // Create new profile
            profile = await JobseekerProfile.create({
                userId,
                gender,
                idNumber,
                cellNumber,
                fullPicture,
                halfPicture,
                province,
                town,
                suburb,
                qualifications,
                documents,
                // New fields
                skills,
                race,
                language,
                transport,
                driversLicense,
                experiences
            });
            console.log('✅ New profile created successfully');
        }

        res.json({
            message: 'Profile updated successfully',
            profile: profile.toJSON()
        });
    } catch (error) {
        console.error('❌ Update profile error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Failed to update profile',
            error: error.message 
        });
    }
});

// Delete profile
app.delete('/api/jobseeker/profile', isAuthenticated, async (req, res) => {
    try {
        if (req.session.userType !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied. Jobseeker account required.' 
            });
        }

        const userId = req.session.userId;

        // Delete profile data
        await JobseekerProfile.destroy({ where: { userId } });
        await JobApplication.destroy({ where: { userId } });
        await JobWishlist.destroy({ where: { userId } });
        
        // Delete user account
        await User.destroy({ where: { id: userId } });

        // Clear session
        req.session.destroy();

        res.json({
            message: 'Profile and account deleted successfully'
        });
    } catch (error) {
        console.error('Delete profile error:', error);
        res.status(500).json({ 
            message: 'Failed to delete profile',
            error: error.message 
        });
    }
});

// Jobs API - Fetch from employer-created jobs
app.get('/api/jobs', async (req, res) => {
    try {
        console.log('📋 Fetching active and approved jobs for jobseekers...');
        
        // IMPORTANT: Only show jobs that are BOTH Active AND Approved
        // This ensures HR-created jobs don't appear until manager approves them
        const jobs = await Job.findAll({
            where: { 
                status: 'Active',
                approvalStatus: 'approved'  // MUST be approved by manager
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`✅ Found ${jobs.length} active & approved jobs`);

        // Format jobs for jobseeker dashboard
        const formattedJobs = jobs.map(job => {
            // Increment view count (don't await to avoid blocking)
            job.increment('viewCount').catch(err => console.error('View count error:', err));

            const formatted = {
                id: job.id,
                title: job.title,
                company: job.companyName || 'Company',  // Use companyName field directly from job
                location: job.location || `${job.city || ''}, ${job.province || ''}`.trim().replace(/^,\s*/, ''),
                type: job.jobType,
                salary: job.salaryMin && job.salaryMax ? 
                    `R${job.salaryMin.toLocaleString()} - R${job.salaryMax.toLocaleString()} ${job.salaryPeriod ? 'per ' + job.salaryPeriod : ''}` 
                    : 'Competitive',
                description: job.description,
                department: job.department,
                requirements: job.requirements ? job.requirements.split('\n').filter(r => r.trim()) : [],
                responsibilities: job.responsibilities,
                experience: job.experience,
                education: job.education,
                closingDate: job.closingDate,
                posted: getTimeAgo(job.createdAt),
                employerId: job.employerId
            };
            
            console.log(`  - Job ${formatted.id}: ${formatted.title} (${formatted.company})`);
            return formatted;
        });

        console.log(`📤 Returning ${formattedJobs.length} formatted jobs to frontend`);
        res.json({ jobs: formattedJobs });
    } catch (error) {
        console.error('❌ Get jobs error:', error);
        console.error('Error stack:', error.stack);
        // Fallback to empty array if error
        res.json({ jobs: [] });
    }
});

// DEBUG ENDPOINT - Get ALL jobs regardless of status (for testing)
app.get('/api/jobs/debug/all', async (req, res) => {
    try {
        const jobs = await Job.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        console.log(`📊 DEBUG: Found ${jobs.length} total jobs in database`);
        
        const summary = jobs.map(job => ({
            id: job.id,
            title: job.title,
            status: job.status,
            employerId: job.employerId,
            companyName: job.companyName,
            createdAt: job.createdAt
        }));

        res.json({ 
            totalJobs: jobs.length,
            jobs: summary,
            statusBreakdown: {
                active: jobs.filter(j => j.status === 'Active').length,
                draft: jobs.filter(j => j.status === 'Draft').length,
                closed: jobs.filter(j => j.status === 'Closed').length,
                filled: jobs.filter(j => j.status === 'Filled').length,
                pending_approval: jobs.filter(j => j.status === 'pending_approval').length,
                rejected: jobs.filter(j => j.status === 'rejected').length
            }
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ message: 'Error retrieving jobs', error: error.message });
    }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " year" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " month" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " day" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hour" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minute" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
    
    return "Just now";
}

// DEBUG ENDPOINT - Get all jobseeker profiles
app.get('/api/debug/jobseeker-profiles', async (req, res) => {
    try {
        const profiles = await JobseekerProfile.findAll({
            include: [{
                model: User,
                attributes: ['id', 'first_name', 'last_name', 'email', 'role']
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json({
            totalProfiles: profiles.length,
            profiles: profiles.map(p => ({
                id: p.id,
                userId: p.userId,
                userEmail: p.User?.email,
                userName: `${p.User?.first_name} ${p.User?.last_name}`,
                hasIdNumber: !!p.idNumber,
                hasCellNumber: !!p.cellNumber,
                idNumber: p.idNumber,
                cellNumber: p.cellNumber,
                province: p.province,
                createdAt: p.createdAt
            }))
        });
    } catch (error) {
        console.error('Debug profiles error:', error);
        res.status(500).json({ message: 'Error retrieving profiles', error: error.message });
    }
});


// Debug endpoint to view all users
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'isActive']
        });
        const profiles = await EmployerProfile.findAll();
        res.json({ users, profiles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// ===============================
// EMPLOYER API ENDPOINTS
// ===============================

// Employer Check Session
app.get('/api/employer/check-session', (req, res) => {
    res.json({
        loggedIn: !!req.session.userId,
        userType: req.session.userType || null,
        userName: req.session.userName || null,
        userEmail: req.session.userEmail || null
    });
});

// Employer Registration Route
app.post('/api/employer/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            contactNumber,
            department,
            role  // NEW: role parameter (administrator, management, hr_recruitment)
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password || !contactNumber) {
            return res.status(400).json({
                message: 'All required fields must be filled'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Invalid email format'
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                message: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the first employer (becomes Administrator)
        const employerCount = await User.count({ where: { role: 'employer' } });
        const isFirstEmployer = employerCount === 0;

        // Determine the role for this user
        let employerRole = 'hr_recruitment'; // Default role
        let accessLevel = 3; // Default access level

        if (isFirstEmployer) {
            // First employer is always Administrator
            employerRole = 'administrator';
            accessLevel = 1;
        } else if (role) {
            // Use provided role if specified (must be set by an Administrator)
            const validRoles = ['administrator', 'management', 'hr_recruitment'];
            if (validRoles.includes(role)) {
                employerRole = role;
                accessLevel = role === 'administrator' ? 1 : role === 'management' ? 2 : 3;
            }
        }

        // Create employer user
        const newEmployer = await User.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password_hash: hashedPassword,
            role: 'employer',
            hrRole: employerRole === 'administrator' ? 'Admin' : employerRole === 'management' ? 'Manager' : 'Staff',
            isActive: true,
            phone: contactNumber
        });

        // Get default permissions for the role using our helper function
        const defaultPermissions = getRolePermissions(employerRole);

        // Create employer profile with role and permissions
        await EmployerProfile.create({
            userId: newEmployer.id,
            department: department || (employerRole === 'administrator' ? 'Administration' : employerRole === 'management' ? 'Management' : 'HR'),
            contactNumber,
            jobTitle: employerRole === 'administrator' ? 'Administrator' : employerRole === 'management' ? 'Manager' : 'HR Staff',
            role: employerRole,
            accessLevel: accessLevel,
            // Set permissions based on role
            canAddUsers: defaultPermissions.canAddUsers,
            canDeleteUsers: defaultPermissions.canDeleteUsers,
            canResetPasswords: defaultPermissions.canResetPasswords,
            canManageSettings: defaultPermissions.canManageSettings,
            canViewAnalytics: defaultPermissions.canViewAnalytics,
            canAssignTasks: defaultPermissions.canAssignTasks,
            canApproveJobs: defaultPermissions.canApproveJobs,
            canViewAllJobs: defaultPermissions.canViewAllJobs,
            canPostJobs: defaultPermissions.canPostJobs,
            canManageApplications: defaultPermissions.canManageApplications,
            // Keep legacy fields for backward compatibility
            canManageUsers: employerRole === 'administrator'
        });

        // Auto-login after registration
        req.session.userId = newEmployer.id;
        req.session.userName = createDisplayName(newEmployer.first_name, newEmployer.last_name);
        req.session.userEmail = newEmployer.email;
        req.session.userType = 'employer';
        req.session.employerRole = employerRole; // Store role in session
        req.session.user = {
            id: newEmployer.id,
            firstName: newEmployer.first_name,
            lastName: newEmployer.last_name,
            email: newEmployer.email,
            role: 'employer',
            hrRole: newEmployer.hrRole,
            employerRole: employerRole,
            accessLevel: accessLevel
        };

        // Send employer registration notification email (internal)
        try {
            const subject = 'New employer account - TMV Business Solutions';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color:#0082B0;">New Employer Account</h2>
                    <p><strong>Name:</strong> ${newEmployer.first_name} ${newEmployer.last_name}</p>
                    <p><strong>Email:</strong> ${newEmployer.email}</p>
                    <p><strong>Employer Role:</strong> ${employerRole}</p>
                    ${contactNumber ? `<p><strong>Contact:</strong> ${contactNumber}</p>` : ''}
                    <p style="color:#666; font-size:12px;">This is an automated notification.</p>
                </div>`;
            const emailResult = await sendDepartmentEmail('general', 'leads@tmvbusinesssolutions.co.za', subject, html);
            if (emailResult && emailResult.success) {
                console.log('✅ Employer registration notification email sent successfully');
            } else {
                console.error('❌ Failed to send employer registration notification email:', emailResult ? emailResult.error : 'Unknown error');
            }
        } catch (emailError) {
            console.error('❌ Failed to send employer registration notification email:', emailError);
        }

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newEmployer.id,
                name: createDisplayName(newEmployer.first_name, newEmployer.last_name),
                email: newEmployer.email,
                hrRole: newEmployer.hrRole,
                employerRole: employerRole,
                accessLevel: accessLevel,
                isFirstUser: isFirstEmployer,
                permissions: defaultPermissions
            }
        });
    } catch (error) {
        console.error('HR user registration error:', error);
        res.status(500).json({
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Employer Login Route
app.post('/api/employer/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Check if user is an employer
        if (user.role !== 'employer') {
            return res.status(403).json({
                message: 'Access denied. HR account required.'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                message: 'Your account has been deactivated. Please contact an administrator.'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Get employer profile with permissions
        const profile = await EmployerProfile.findOne({
            where: { userId: user.id }
        });

        if (!profile) {
            return res.status(404).json({
                message: 'Employer profile not found. Please contact administrator.'
            });
        }

        // Create session with role information
        req.session.userId = user.id;
        req.session.userName = createDisplayName(user.first_name, user.last_name);
        req.session.userEmail = user.email;
        req.session.userType = 'employer';
        req.session.employerRole = profile.role; // Store employer role in session
        req.session.user = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: 'employer',
            hrRole: user.hrRole,
            employerRole: profile.role,
            accessLevel: profile.accessLevel,
            EmployerProfile: profile
        };

        // Return comprehensive user info with all permissions
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: createDisplayName(user.first_name, user.last_name),
                email: user.email,
                hrRole: user.hrRole,
                employerRole: profile.role,
                accessLevel: profile.accessLevel,
                department: profile.department,
                jobTitle: profile.jobTitle,
                permissions: {
                    // Admin permissions
                    canAddUsers: profile.canAddUsers || false,
                    canDeleteUsers: profile.canDeleteUsers || false,
                    canResetPasswords: profile.canResetPasswords || false,
                    canManageSettings: profile.canManageSettings || false,
                    // Admin & Management permissions
                    canViewAnalytics: profile.canViewAnalytics || false,
                    canViewAllJobs: profile.canViewAllJobs || false,
                    // Management permissions
                    canAssignTasks: profile.canAssignTasks || false,
                    canApproveJobs: profile.canApproveJobs || false,
                    canManageApplications: profile.canManageApplications || false,
                    // HR permissions
                    canPostJobs: profile.canPostJobs || false,
                    // Legacy
                    canManageUsers: profile.canManageUsers || false
                }
            }
        });
    } catch (error) {
        console.error('Employer login error:', error);
        res.status(500).json({
            message: 'Login failed',
            error: error.message
        });
    }
});

// Employer Logout
app.post('/api/employer/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        clearSessionCookie(res);
        res.json({ message: 'Logout successful' });
    });
});

// ============================================
// EMPLOYER JOB MANAGEMENT ENDPOINTS
// ============================================

// Get all employer's jobs
app.get('/api/employer/jobs', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get all employer users (administrator, management, hr_recruitment)
        const employerUsers = await User.findAll({
            where: { role: 'employer' },
            attributes: ['id']
        });

        const employerIds = employerUsers.map(u => u.id);

        // Fetch all jobs created by ANY employer user in the company
        const jobs = await Job.findAll({
            where: { 
                employerId: employerIds 
            },
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'employer_user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
                include: [{
                    model: EmployerProfile,
                    attributes: ['role', 'jobTitle']
                }],
                required: false
            }]
        });

        // Categorize jobs by approval status
        const categorizedJobs = {
            active: jobs.filter(j => j.approvalStatus === 'approved' && j.status === 'Active'),
            pending: jobs.filter(j => j.approvalStatus === 'pending'),
            rejected: jobs.filter(j => j.approvalStatus === 'rejected'),
            draft: jobs.filter(j => j.status === 'Draft'),
            closed: jobs.filter(j => j.status === 'Closed' || j.status === 'Filled'),
            all: jobs
        };

        console.log(`📋 Fetched ${jobs.length} jobs for company: ${categorizedJobs.active.length} active, ${categorizedJobs.pending.length} pending, ${categorizedJobs.rejected.length} rejected`);
        
        res.json({
            jobs: categorizedJobs.all,
            categorized: categorizedJobs,
            summary: {
                total: jobs.length,
                active: categorizedJobs.active.length,
                pending: categorizedJobs.pending.length,
                rejected: categorizedJobs.rejected.length,
                draft: categorizedJobs.draft.length,
                closed: categorizedJobs.closed.length
            }
        });
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
});

// Create new job
app.post('/api/employer/jobs', async (req, res) => {
    try {
        if (!req.session || !req.session.userId || !req.session.userType) {
            return res.status(401).json({ message: 'Unauthorized - Please login first' });
        }

        if (req.session.userType !== 'employer') {
            return res.status(403).json({ message: 'Access denied - Employer account required' });
        }

        // Check if user has permission to create job posts
        const employerProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });

        if (!employerProfile) {
            return res.status(404).json({ message: 'Employer profile not found' });
        }

        if (!employerProfile.canCreatePost) {
            return res.status(403).json({ 
                message: 'You do not have permission to create job posts. Contact an administrator to grant you the "Create Post" permission.' 
            });
        }

        const {
            title, jobType, department, province, city, description,
            requirements, responsibilities, salaryMin, salaryMax, salaryPeriod,
            experience, education, closingDate, status
        } = req.body;

        // Get current user to check role and employer profile
        const currentUser = await User.findByPk(req.session.userId);
        const creatorProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });
        
        // Determine job status based on user role
        // Administrators and Managers can auto-approve their jobs
        // HR Personnel need approval from Management
        let jobStatus = 'Draft';
        let approvalStatus = 'pending';
        let approvedBy = null;
        let approvedAt = null;
        
        // Check the employer profile role (more accurate than user.role)
        const userRole = creatorProfile ? creatorProfile.role : null;
        
        if (userRole === 'administrator' || userRole === 'management') {
            // Administrators and Managers auto-approve their jobs
            jobStatus = status || 'Active';
            approvalStatus = 'approved';
            approvedBy = req.session.userId;
            approvedAt = new Date();
            console.log(`✅ ${userRole} job auto-approved: userId=${req.session.userId}`);
        } else if (userRole === 'hr_recruitment') {
            // HR Personnel need approval from Management
            jobStatus = 'pending_approval';
            approvalStatus = 'pending';
            console.log(`📋 HR job created - awaiting manager approval: userId=${req.session.userId}`);
        } else {
            // Default: requires approval
            jobStatus = 'pending_approval';
            approvalStatus = 'pending';
            console.log(`📋 Job created - awaiting approval: userId=${req.session.userId}, role=${userRole}`);
        }

        const job = await Job.create({
            employerId: req.session.userId,
            title,
            jobType,
            department,
            province,
            city,
            location: city && province ? `${city}, ${province}` : (city || province || ''),
            description,
            requirements,
            responsibilities,
            salaryMin,
            salaryMax,
            salaryPeriod: salaryPeriod || 'month',
            experience,
            education,
            closingDate,
            status: jobStatus,
            approvalStatus: approvalStatus,
            approvedBy: approvedBy,
            approvedAt: approvedAt,
            rejectedBy: null,
            rejectedAt: null,
            rejectionReason: null,
            companyName: 'TMV Business Solutions',
            viewCount: 0,
            applicationCount: 0
        });

        // If job needs approval, notify managers
        if (approvalStatus === 'pending') {
            const managers = await EmployerProfile.findAll({
                where: { 
                    role: 'management',
                    canApproveJobs: true
                },
                attributes: ['userId']
            });
            
            // Send notification to all managers
            for (const manager of managers) {
                await Notification.create({
                    userId: manager.userId,
                    type: 'job_pending',
                    title: 'New Job Post Awaiting Approval 📝',
                    message: `A new job post "${title}" has been created and requires your approval before it can be published.`,
                    relatedJobId: job.id,
                    relatedUserId: req.session.userId,
                    isRead: false
                });
            }
            
            console.log(`📬 Approval notifications sent to ${managers.length} managers`);
        }

        // Return different messages based on approval status
        if (approvalStatus === 'approved') {
            res.status(201).json({
                job,
                message: 'Job created and published successfully! (Manager auto-approval)',
                requiresApproval: false
            });
        } else {
            res.status(201).json({
                job,
                message: 'Job created successfully! Awaiting manager approval before it goes live.',
                requiresApproval: true
            });
        }
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ message: 'Failed to create job' });
    }
});

// Update job
app.put('/api/employer/jobs/:id', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        const job = await Job.findOne({
            where: { 
                id,
                employerId: req.session.userId
            }
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found or you do not have permission to edit this job' });
        }

        const {
            title, jobType, department, province, city, description,
            requirements, responsibilities, salaryMin, salaryMax, salaryPeriod,
            experience, education, closingDate, status, resubmit
        } = req.body;

        // Get user profile to check role
        const employerProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });
        const userRole = employerProfile ? employerProfile.role : null;

        // If resubmitting a rejected job, reset approval status
        if (resubmit && job.approvalStatus === 'rejected') {
            if (userRole === 'administrator' || userRole === 'management') {
                // Admins and Managers can auto-approve their edits
                job.status = 'Active';
                job.approvalStatus = 'approved';
                job.approvedBy = req.session.userId;
                job.approvedAt = new Date();
                job.rejectedBy = null;
                job.rejectedAt = null;
                job.rejectionReason = null;
                console.log(`✅ ${userRole} resubmitted and auto-approved job #${id}`);
            } else {
                // HR needs to resubmit for approval
                job.status = 'pending_approval';
                job.approvalStatus = 'pending';
                job.rejectedBy = null;
                job.rejectedAt = null;
                job.rejectionReason = null;
                console.log(`📋 HR resubmitted job #${id} for manager approval`);
                
                // Notify managers about resubmission
                const managers = await EmployerProfile.findAll({
                    where: { 
                        role: 'management',
                        canApproveJobs: true
                    },
                    attributes: ['userId']
                });
                
                // Send notification to all managers
                for (const manager of managers) {
                    await Notification.create({
                        userId: manager.userId,
                        type: 'job_resubmitted',
                        title: 'Job Resubmitted for Approval 🔄',
                        message: `A rejected job post "${job.title}" has been revised and resubmitted for your review.`,
                        relatedJobId: job.id,
                        relatedUserId: req.session.userId,
                        isRead: false
                    });
                }
                
                console.log(`📬 Resubmission notifications sent to ${managers.length} managers`);
            }
        }

        await job.update({
            title: title !== undefined ? title : job.title,
            jobType: jobType !== undefined ? jobType : job.jobType,
            department: department !== undefined ? department : job.department,
            province: province !== undefined ? province : job.province,
            city: city !== undefined ? city : job.city,
            location: (city || province) ? `${city || ''}, ${province || ''}`.trim().replace(/^,\s*/, '') : job.location,
            description: description !== undefined ? description : job.description,
            requirements: requirements !== undefined ? requirements : job.requirements,
            responsibilities: responsibilities !== undefined ? responsibilities : job.responsibilities,
            salaryMin: salaryMin !== undefined ? salaryMin : job.salaryMin,
            salaryMax: salaryMax !== undefined ? salaryMax : job.salaryMax,
            salaryPeriod: salaryPeriod !== undefined ? salaryPeriod : job.salaryPeriod,
            experience: experience !== undefined ? experience : job.experience,
            education: education !== undefined ? education : job.education,
            closingDate: closingDate !== undefined ? closingDate : job.closingDate,
            status: job.status, // Use the status we set above
            approvalStatus: job.approvalStatus
        });

        const message = resubmit && job.approvalStatus === 'pending' 
            ? 'Job updated and resubmitted for manager approval!'
            : resubmit && job.approvalStatus === 'approved'
            ? 'Job updated and published successfully!'
            : 'Job updated successfully';

        res.json({ 
            job,
            message,
            requiresApproval: job.approvalStatus === 'pending'
        });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ message: 'Failed to update job' });
    }
});

// Delete job
app.delete('/api/employer/jobs/:id', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        const job = await Job.findOne({
            where: { 
                id,
                employerId: req.session.userId
            }
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        await job.destroy();
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ message: 'Failed to delete job' });
    }
});

// ============================================
// EMPLOYER APPLICATIONS MANAGEMENT ENDPOINTS
// ============================================

// Get all applications for employer's jobs
app.get('/api/employer/applications', async (req, res) => {
    try {
        console.log('📋 Fetching applications for employer...');
        console.log('Session user:', req.session.userId);
        console.log('User type:', req.session.userType);
        console.log('Session data:', { hasUser: !!req.session.user, hasUserId: !!req.session.userId });
        
        // Check if user is logged in and is an employer
        if (!req.session.userId || req.session.userType !== 'employer') {
            console.log('❌ Unauthorized access attempt - Not logged in or not an employer');
            return res.status(401).json({ message: 'Unauthorized. Employer access required.' });
        }

        // Get all employer users (administrator, management, hr_recruitment)
        const employerUsers = await User.findAll({
            where: { role: 'employer' },
            attributes: ['id']
        });

        const employerIds = employerUsers.map(u => u.id);
        
        console.log('🔍 Querying applications WHERE employerId IN', employerIds);

        const applications = await JobApplication.findAll({
            where: { employerId: employerIds },
            include: [
                {
                    model: User,
                    attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
                    include: [{
                        model: JobseekerProfile,
                        attributes: ['cellNumber', 'town', 'province', 'gender', 'idNumber']
                    }]
                },
                {
                    model: Job,
                    attributes: ['id', 'title', 'jobType', 'companyName', 'location']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        console.log(`✅ Found ${applications.length} applications for company (${employerIds.length} employer users)`);
        
        if (applications.length > 0) {
            console.log('📄 Sample application:', {
                id: applications[0].id,
                userId: applications[0].userId,
                jobId: applications[0].jobId,
                employerId: applications[0].employerId,
                status: applications[0].status
            });
        } else {
            console.log('⚠️ No applications found. Checking all applications in database...');
            const allApps = await JobApplication.findAll({
                attributes: ['id', 'userId', 'jobId', 'employerId', 'status'],
                limit: 5,
                order: [['createdAt', 'DESC']]
            });
            console.log('📊 Recent applications in database:', allApps.map(a => ({
                id: a.id,
                employerId: a.employerId,
                status: a.status
            })));
        }

        // Format the response to match what the frontend expects
        const formattedApplications = applications.map(app => ({
            id: app.id,
            userId: app.userId,
            jobId: app.jobId,
            status: app.status,
            appliedAt: app.appliedAt || app.createdAt,
            createdAt: app.createdAt,
            User: {
                id: app.User?.id,
                firstName: app.User?.first_name,  // Map to camelCase
                lastName: app.User?.last_name,    // Map to camelCase
                email: app.User?.email,
                phone: app.User?.phone,
                JobseekerProfile: app.User?.JobseekerProfile
            },
            Job: app.Job
        }));

        res.json(formattedApplications);
    } catch (error) {
        console.error('❌ Get applications error:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
});

// Get single application with full candidate profile
app.get('/api/employer/applications/:id', async (req, res) => {
    try {
        console.log('🔍 GET /api/employer/applications/:id called');
        console.log('Session userId:', req.session.userId);
        console.log('Session userType:', req.session.userType);
        console.log('Application ID:', req.params.id);
        
        if (!req.session.userId || req.session.userType !== 'employer') {
            console.log('❌ Unauthorized access attempt');
            return res.status(401).json({ message: 'Unauthorized. Employer access required.' });
        }

        // Get all employer users (administrator, management, hr_recruitment)
        const employerUsers = await User.findAll({
            where: { role: 'employer' },
            attributes: ['id']
        });

        const employerIds = employerUsers.map(u => u.id);

        const { id } = req.params;
        const application = await JobApplication.findOne({
            where: { 
                id,
                employerId: employerIds  // Check against ALL company employer IDs
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
                    include: [{
                        model: JobseekerProfile,
                        attributes: [
                            'id', 'userId', 'idNumber', 'cellNumber', 'gender', 
                            'province', 'town', 'suburb',
                            'fullPicture', 'halfPicture',
                            'qualifications', 'documents', 'skills',
                            'race', 'language', 'transport', 'driversLicense', 'experiences'
                        ]
                    }]
                },
                {
                    model: Job,
                    attributes: ['id', 'title', 'jobType', 'companyName', 'location', 'description', 'requirements']
                }
            ]
        });

        if (!application) {
            console.log('❌ Application not found:', id);
            return res.status(404).json({ message: 'Application not found' });
        }

        console.log('✅ Found application:', {
            id: application.id,
            userId: application.userId,
            jobId: application.jobId,
            employerId: application.employerId,
            status: application.status,
            hasProfile: !!application.User?.JobseekerProfile
        });

        // Format the response to use camelCase for frontend
        const formattedApplication = {
            id: application.id,
            userId: application.userId,
            jobId: application.jobId,
            employerId: application.employerId,
            status: application.status,
            coverLetter: application.coverLetter,
            createdAt: application.createdAt,
            reviewedAt: application.reviewedAt,
            User: application.User ? {
                id: application.User.id,
                firstName: application.User.first_name,
                lastName: application.User.last_name,
                email: application.User.email,
                phone: application.User.phone,
                JobseekerProfile: application.User.JobseekerProfile
            } : null,
            Job: application.Job ? {
                id: application.Job.id,
                title: application.Job.title,
                jobType: application.Job.jobType,
                companyName: application.Job.companyName,
                location: application.Job.location,
                description: application.Job.description,
                requirements: application.Job.requirements
            } : null
        };

        res.json(formattedApplication);
    } catch (error) {
        console.error('❌ Get application error:', error);
        res.status(500).json({ message: 'Failed to fetch application', error: error.message });
    }
});

// Update application status
app.put('/api/employer/applications/:id/status', async (req, res) => {
    try {
        console.log('📝 PUT /api/employer/applications/:id/status called');
        console.log('Session userId:', req.session.userId);
        console.log('Application ID:', req.params.id);
        console.log('New status:', req.body.status);
        
        if (!req.session.userId || req.session.userType !== 'employer') {
            console.log('❌ Unauthorized access attempt');
            return res.status(401).json({ message: 'Unauthorized. Employer access required.' });
        }

        // Get all employer users (administrator, management, hr_recruitment)
        const employerUsers = await User.findAll({
            where: { role: 'employer' },
            attributes: ['id']
        });

        const employerIds = employerUsers.map(u => u.id);

        const { id } = req.params;
        const { status } = req.body;

        const application = await JobApplication.findOne({
            where: { 
                id,
                employerId: employerIds  // Check against ALL company employer IDs
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: Job,
                    attributes: ['id', 'title', 'companyName']
                }
            ]
        });

        if (!application) {
            console.log('❌ Application not found:', id);
            return res.status(404).json({ message: 'Application not found' });
        }

        await application.update({ 
            status,
            reviewedAt: new Date()
        });

        console.log('✅ Application status updated to:', status);

        // If shortlisted, send notification email to candidate
        if (status === 'shortlisted') {
            const candidateName = `${application.User.first_name} ${application.User.last_name}`;
            const candidateEmail = application.User.email;
            const jobTitle = application.Job.title;
            const companyName = application.Job.companyName;

            try {
                await sendEmail(
                    candidateEmail,
                    `Application Update - ${jobTitle}`,
                    `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #10b981;">Great News, ${candidateName}!</h2>
                            
                            <p>Your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been <strong style="color: #10b981;">shortlisted</strong>!</p>
                            
                            <p>This means your qualifications and experience have impressed our team. You are one step closer to joining our organization.</p>
                            
                            <p>Our HR team will contact you soon with the next steps in the recruitment process.</p>
                            
                            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                                Best regards,<br>
                                ${companyName}<br>
                                TMV Business Solutions
                            </p>
                        </div>
                    `
                );
                console.log('✅ Shortlist notification email sent to:', candidateEmail);
            } catch (emailError) {
                console.error('⚠️ Failed to send shortlist email:', emailError);
            }
        }

        res.json(application);
    } catch (error) {
        console.error('❌ Update status error:', error);
        res.status(500).json({ message: 'Failed to update status', error: error.message });
    }
});

// Invite candidate for interview
app.post('/api/employer/applications/:id/invite', async (req, res) => {
    try {
        console.log('📧 POST /api/employer/applications/:id/invite called');
        console.log('Session userId:', req.session.userId);
        console.log('Application ID:', req.params.id);
        
        if (!req.session.userId || req.session.userType !== 'employer') {
            console.log('❌ Unauthorized access attempt');
            return res.status(401).json({ message: 'Unauthorized. Employer access required.' });
        }

        const { id } = req.params;
        const { invitationDetails } = req.body;

        const application = await JobApplication.findOne({
            where: { 
                id,
                employerId: req.session.userId
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: Job,
                    attributes: ['id', 'title', 'companyName']
                }
            ]
        });

        if (!application) {
            console.log('❌ Application not found:', id);
            return res.status(404).json({ message: 'Application not found' });
        }

        // Update application status
        await application.update({
            status: 'invited',
            invitationDetails: { details: invitationDetails, sentAt: new Date() },
            reviewedAt: new Date()
        });

        // Send invitation email
        const candidateName = `${application.User.first_name} ${application.User.last_name}`;
        const candidateEmail = application.User.email;
        const jobTitle = application.Job.title;
        const companyName = application.Job.companyName;

        const emailResult = await sendEmail(
            candidateEmail,
            `Interview Invitation - ${jobTitle}`,
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e40af;">Congratulations ${candidateName}!</h2>
                    
                    <p>We are pleased to inform you that you have been selected for an interview for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
                    
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e40af; margin-top: 0;">Interview Details:</h3>
                        <p style="white-space: pre-wrap;">${invitationDetails}</p>
                    </div>
                    
                    <p>Please confirm your attendance by replying to this email.</p>
                    
                    <p>We look forward to meeting you!</p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Best regards,<br>
                        ${companyName}<br>
                        TMV Business Solutions
                    </p>
                </div>
            `,
            'careers'
        );

        if (emailResult && emailResult.success) {
            console.log('✅ Interview invitation sent to:', candidateEmail);
        } else {
            console.error('❌ Failed to send invitation email:', emailResult ? emailResult.error : 'Unknown error');
            return res.status(500).json({ message: 'Failed to send invitation email', error: emailResult ? emailResult.error : 'Unknown error' });
        }
        res.json({ message: 'Invitation sent successfully', application });
    } catch (error) {
        console.error('❌ Invite error:', error);
        res.status(500).json({ message: 'Failed to send invitation', error: error.message });
    }
});

// Reject candidate
app.post('/api/employer/applications/:id/reject', async (req, res) => {
    try {
        console.log('❌ POST /api/employer/applications/:id/reject called');
        console.log('Session userId:', req.session.userId);
        console.log('Application ID:', req.params.id);
        
        if (!req.session.userId || req.session.userType !== 'employer') {
            console.log('❌ Unauthorized access attempt');
            return res.status(401).json({ message: 'Unauthorized. Employer access required.' });
        }

        const { id } = req.params;
        const { rejectionReason } = req.body;

        const application = await JobApplication.findOne({
            where: { 
                id,
                employerId: req.session.userId
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: Job,
                    attributes: ['id', 'title', 'companyName']
                }
            ]
        });

        if (!application) {
            console.log('❌ Application not found:', id);
            return res.status(404).json({ message: 'Application not found' });
        }

        // Update application status
        await application.update({
            status: 'rejected',
            rejectionReason,
            reviewedAt: new Date(),
            respondedAt: new Date()
        });

        // Send rejection email
        const candidateName = `${application.User.first_name} ${application.User.last_name}`;
        const candidateEmail = application.User.email;
        const jobTitle = application.Job.title;
        const companyName = application.Job.companyName;

        const emailResult = await sendEmail(
            candidateEmail,
            `Application Update - ${jobTitle}`,
            `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e40af;">Dear ${candidateName},</h2>
                    
                    <p>Thank you for your interest in the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
                    
                    <p>After careful consideration of all applications, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.</p>
                    
                    ${rejectionReason ? `
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1e40af; margin-top: 0;">Feedback:</h3>
                            <p style="white-space: pre-wrap;">${rejectionReason}</p>
                        </div>
                    ` : ''}
                    
                    <p>We appreciate the time and effort you invested in your application and encourage you to apply for future positions that match your skills and experience.</p>
                    
                    <p>We wish you the best of luck in your job search.</p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Best regards,<br>
                        ${companyName}<br>
                        TMV Business Solutions
                    </p>
                </div>
            `,
            'careers'
        );

        if (emailResult && emailResult.success) {
            console.log('✅ Rejection email sent to:', candidateEmail);
        } else {
            console.error('❌ Failed to send rejection email:', emailResult ? emailResult.error : 'Unknown error');
            return res.status(500).json({ message: 'Failed to send rejection email', error: emailResult ? emailResult.error : 'Unknown error' });
        }
        res.json({ message: 'Rejection email sent successfully', application });
    } catch (error) {
        console.error('❌ Reject error:', error);
        res.status(500).json({ message: 'Failed to reject application', error: error.message });
    }
});

// ============================================
// EMPLOYER STATISTICS ENDPOINT
// ============================================

app.get('/api/employer/stats', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get active jobs count
        const activeJobs = await Job.count({
            where: { 
                employerId: req.session.userId,
                status: 'Active'
            }
        });

        // Get total applications
        const totalApplications = await JobApplication.count({
            where: { employerId: req.session.userId }
        });

        // Get pending applications
        const pendingApplications = await JobApplication.count({
            where: { 
                employerId: req.session.userId,
                status: 'pending'
            }
        });

        // Get total jobseekers (users with jobseeker role)
        const totalJobseekers = await User.count({
            where: { role: 'jobseeker' }
        });

        res.json({
            activeJobs,
            totalApplications,
            pendingApplications,
            totalJobseekers
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Failed to fetch statistics' });
    }
});

// Get all registered jobseekers
app.get('/api/employer/jobseekers', async (req, res) => {
    try {
        console.log('👨‍💼 Talent Pool: Fetching jobseekers...');
        console.log('Session userId:', req.session.userId);
        console.log('Session userType:', req.session.userType);
        
        if (!req.session.userId || req.session.userType !== 'employer') {
            console.log('❌ Unauthorized: userId=', !!req.session.userId, 'userType=', req.session.userType);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('✅ Authorized. Fetching jobseekers from database...');
        
        // Fetch all jobseekers with their profile data
        const jobseekers = await User.findAll({
            where: { role: 'jobseeker' },
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'title', 'industry', 'created_at'],
            order: [['created_at', 'DESC']]
        });

        console.log(`📊 Found ${jobseekers.length} jobseekers in database`);
        
        if (jobseekers.length > 0) {
            console.log('Sample jobseeker:', {
                id: jobseekers[0].id,
                name: `${jobseekers[0].first_name} ${jobseekers[0].last_name}`,
                email: jobseekers[0].email
            });
        }

        // Get profile completion status for each jobseeker
        const jobseekersWithProfiles = await Promise.all(jobseekers.map(async (jobseeker) => {
            const profile = await JobseekerProfile.findOne({
                where: { userId: jobseeker.id },
                attributes: ['id', 'cellNumber', 'idNumber', 'race', 'gender', 'province', 'town']
            });

            return {
                id: jobseeker.id,
                name: `${jobseeker.first_name} ${jobseeker.last_name}`,
                firstName: jobseeker.first_name,
                lastName: jobseeker.last_name,
                email: jobseeker.email,
                phone: jobseeker.phone || profile?.cellNumber || 'Not provided',
                title: jobseeker.title || 'Not specified',
                industry: jobseeker.industry || 'Not specified',
                registeredAt: jobseeker.created_at,
                hasProfile: !!profile,
                profileData: profile ? {
                    cellNumber: profile.cellNumber,
                    idNumber: profile.idNumber,
                    race: profile.race,
                    gender: profile.gender,
                    province: profile.province,
                    town: profile.town
                } : null
            };
        }));

        console.log(`✅ Returning ${jobseekersWithProfiles.length} jobseekers with profile data`);
        console.log('📦 Response payload:', JSON.stringify({
            total: jobseekersWithProfiles.length,
            firstJobseeker: jobseekersWithProfiles[0] || null
        }, null, 2));
        
        res.json({
            jobseekers: jobseekersWithProfiles,
            total: jobseekersWithProfiles.length
        });
    } catch (error) {
        console.error('❌ Get jobseekers error:', error);
        res.status(500).json({ message: 'Failed to fetch jobseekers' });
    }
});

// Get jobseeker profile details for employer view (including documents)
app.get('/api/employer/jobseekers/:userId', isAuthenticated, async (req, res) => {
    try {
        console.log('👤 Employer viewing jobseeker profile');
        console.log('Employer ID:', req.session.userId);
        console.log('Jobseeker User ID:', req.params.userId);
        
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const jobseeker = await User.findOne({
            where: { 
                id: req.params.userId,
                role: 'jobseeker'
            },
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'title', 'industry', 'created_at'],
            include: [{
                model: JobseekerProfile,
                attributes: [
                    'id', 'userId', 'gender', 'idNumber', 'cellNumber',
                    'province', 'town', 'suburb',
                    'fullPicture', 'halfPicture',
                    'qualifications', 'documents', 'skills',
                    'race', 'language', 'transport', 'driversLicense', 'experiences'
                ]
            }]
        });

        if (!jobseeker) {
            return res.status(404).json({ message: 'Jobseeker not found' });
        }

        // Format the response with document links
        const profile = {
            id: jobseeker.id,
            name: `${jobseeker.first_name} ${jobseeker.last_name}`,
            firstName: jobseeker.first_name,
            lastName: jobseeker.last_name,
            email: jobseeker.email,
            phone: jobseeker.phone,
            title: jobseeker.title || 'Not specified',
            industry: jobseeker.industry || 'Not specified',
            registeredAt: jobseeker.created_at,
            hasProfile: !!jobseeker.JobseekerProfile,
            profile: jobseeker.JobseekerProfile ? {
                gender: jobseeker.JobseekerProfile.gender,
                idNumber: jobseeker.JobseekerProfile.idNumber,
                cellNumber: jobseeker.JobseekerProfile.cellNumber,
                province: jobseeker.JobseekerProfile.province,
                town: jobseeker.JobseekerProfile.town,
                suburb: jobseeker.JobseekerProfile.suburb,
                race: jobseeker.JobseekerProfile.race,
                language: jobseeker.JobseekerProfile.language,
                transport: jobseeker.JobseekerProfile.transport,
                driversLicense: jobseeker.JobseekerProfile.driversLicense,
                fullPicture: jobseeker.JobseekerProfile.fullPicture,
                halfPicture: jobseeker.JobseekerProfile.halfPicture,
                skills: jobseeker.JobseekerProfile.skills,
                qualifications: jobseeker.JobseekerProfile.qualifications,
                experiences: jobseeker.JobseekerProfile.experiences,
                documents: jobseeker.JobseekerProfile.documents
            } : null
        };

        console.log('✅ Jobseeker profile retrieved successfully');
        res.json(profile);
    } catch (error) {
        console.error('❌ Get jobseeker profile error:', error);
        res.status(500).json({ message: 'Failed to fetch jobseeker profile', error: error.message });
    }
});

// ============================================
// EMPLOYER PROFILE MANAGEMENT
// ============================================

app.put('/api/employer/profile', async (req, res) => {
    try {
        if (!req.session.user || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {
            department, contactNumber, jobTitle
        } = req.body;

        let profile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });

        if (profile) {
            await profile.update({
                department,
                contactNumber,
                jobTitle
            });
        } else {
            profile = await EmployerProfile.create({
                userId: req.session.userId,
                department,
                contactNumber,
                jobTitle
            });
        }

        res.json(profile);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// ============================================
// DUPLICATE HR ENDPOINTS REMOVED - Using RBAC endpoints instead
// The correct /api/employer/users endpoint is defined earlier (line 882)
// with requireRole(['administrator', 'management']) middleware
// ============================================

// ============================================
// ADMINISTRATOR API ENDPOINTS (RBAC) - COMMENTED OUT (DUPLICATE)
// The correct /api/admin/users endpoint is at line 1092 with requireRole middleware
// ============================================

/* DUPLICATE SECTION - COMMENTED OUT
// Get all users (Administrators only)
app.get('/api/admin/users', requirePermission('canAddUsers'), async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'employer' },
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'hrRole', 'isActive', 'createdAt'],
            include: [{
                model: EmployerProfile,
                as: 'employerProfile',
                attributes: ['department', 'jobTitle', 'role', 'accessLevel', 'canPostJobs', 'canManageApplications', 
                           'canAddUsers', 'canDeleteUsers', 'canResetPasswords', 'canManageSettings', 
                           'canViewAnalytics', 'canAssignTasks', 'canApproveJobs', 'canViewAllJobs']
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedUsers = users.map(user => ({
            id: user.id,
            name: createDisplayName(user.first_name, user.last_name),
            email: user.email,
            phone: user.phone,
            hrRole: user.hrRole,
            isActive: user.isActive,
            employerRole: user.employerProfile?.role || 'hr_recruitment',
            accessLevel: user.employerProfile?.accessLevel || 3,
            department: user.employerProfile?.department || 'N/A',
            jobTitle: user.employerProfile?.jobTitle || 'N/A',
            createdAt: user.createdAt,
            permissions: {
                canPostJobs: user.employerProfile?.canPostJobs || false,
                canManageApplications: user.employerProfile?.canManageApplications || false,
                canAddUsers: user.employerProfile?.canAddUsers || false,
                canDeleteUsers: user.employerProfile?.canDeleteUsers || false,
                canResetPasswords: user.employerProfile?.canResetPasswords || false,
                canManageSettings: user.employerProfile?.canManageSettings || false,
                canViewAnalytics: user.employerProfile?.canViewAnalytics || false,
                canAssignTasks: user.employerProfile?.canAssignTasks || false,
                canApproveJobs: user.employerProfile?.canApproveJobs || false,
                canViewAllJobs: user.employerProfile?.canViewAllJobs || false
            }
        }));

        res.json({ users: formattedUsers });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to retrieve users' });
    }
});

// Add new user (Administrators only)
app.post('/api/admin/users', requirePermission('canAddUsers'), async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            phone,
            department,
            jobTitle,
            role  // administrator, management, hr_recruitment
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Validate role
        const validRoles = ['administrator', 'management', 'hr_recruitment'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password_hash: hashedPassword,
            role: 'employer',
            hrRole: role === 'administrator' ? 'Admin' : role === 'management' ? 'Manager' : 'Staff',
            isActive: true,
            phone: phone || null
        });

        // Get default permissions for role
        const permissions = getRolePermissions(role);

        // Create employer profile
        await EmployerProfile.create({
            userId: newUser.id,
            department: department || (role === 'administrator' ? 'Administration' : role === 'management' ? 'Management' : 'HR'),
            contactNumber: phone || '',
            jobTitle: jobTitle || (role === 'administrator' ? 'Administrator' : role === 'management' ? 'Manager' : 'HR Staff'),
            role: role,
            accessLevel: role === 'administrator' ? 1 : role === 'management' ? 2 : 3,
            ...permissions
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                name: createDisplayName(newUser.first_name, newUser.last_name),
                email: newUser.email,
                role: role
            }
        });
    } catch (error) {
        console.error('Add user error:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

// Update user (Administrators only)
app.put('/api/admin/users/:userId', requirePermission('canAddUsers'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { firstName, lastName, email, phone, department, jobTitle, role, isActive, permissions } = req.body;

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from modifying themselves
        if (user.id === req.session.userId) {
            return res.status(403).json({ message: 'Cannot modify your own account' });
        }

        // Update user
        if (firstName) user.first_name = firstName;
        if (lastName) user.last_name = lastName;
        if (email) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (isActive !== undefined) user.isActive = isActive;
        if (role) user.hrRole = role === 'administrator' ? 'Admin' : role === 'management' ? 'Manager' : 'Staff';
        
        await user.save();

        // Update employer profile
        const profile = await EmployerProfile.findOne({ where: { userId } });
        if (profile) {
            if (department) profile.department = department;
            if (jobTitle) profile.jobTitle = jobTitle;
            if (role) {
                profile.role = role;
                profile.accessLevel = role === 'administrator' ? 1 : role === 'management' ? 2 : 3;
                
                // Update permissions based on role if not manually specified
                if (!permissions) {
                    const defaultPerms = getRolePermissions(role);
                    Object.assign(profile, defaultPerms);
                }
            }
            if (permissions) {
                Object.assign(profile, permissions);
            }
            await profile.save();
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// Delete user (Administrators only)
app.delete('/api/admin/users/:userId', requirePermission('canDeleteUsers'), async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.session.userId) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete employer profile first
        await EmployerProfile.destroy({ where: { userId } });
        
        // Delete user
        await user.destroy();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// Reset user password (Administrators only)
app.post('/api/admin/reset-password', requirePermission('canResetPasswords'), async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'User ID and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password_hash = hashedPassword;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

// Get system analytics (Administrators and Management)
app.get('/api/admin/analytics', requirePermission('canViewAnalytics'), async (req, res) => {
    try {
        // Get counts
        const totalUsers = await User.count({ where: { role: 'employer' } });
        const activeUsers = await User.count({ where: { role: 'employer', isActive: true } });
        const totalJobs = await Job.count();
        const activeJobs = await Job.count({ where: { status: 'Active' } });
        const totalApplications = await Application.count();
        const totalJobseekers = await User.count({ where: { role: 'jobseeker' } });

        // Get user breakdown by role
        const adminCount = await EmployerProfile.count({ where: { role: 'administrator' } });
        const managementCount = await EmployerProfile.count({ where: { role: 'management' } });
        const hrCount = await EmployerProfile.count({ where: { role: 'hr_recruitment' } });

        // Get task statistics
        const totalTasks = await Task.count();
        const completedTasks = await Task.count({ where: { status: 'completed' } });
        const pendingTasks = await Task.count({ where: { status: 'pending' } });
        const inProgressTasks = await Task.count({ where: { status: 'in_progress' } });

        // Get job approval statistics
        const approvedJobs = await Job.count({ where: { approvalStatus: 'approved' } });
        const rejectedJobs = await Job.count({ where: { approvalStatus: 'rejected' } });
        const pendingApprovalJobs = await Job.count({ where: { approvalStatus: 'pending' } });

        // Get application statistics by status
        const shortlistedApplications = await Application.count({ where: { status: 'shortlisted' } });
        const rejectedApplications = await Application.count({ where: { status: 'rejected' } });
        const pendingApplications = await Application.count({ where: { status: 'pending' } });

        // Get this week's completed tasks
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const completedThisWeek = await Task.count({ 
            where: { 
                status: 'completed',
                completedAt: { [Op.gte]: oneWeekAgo }
            } 
        });

        // Get jobs posted this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        const jobsPostedThisMonth = await Job.count({
            where: {
                createdAt: { [Op.gte]: firstDayOfMonth }
            }
        });

        // Get applications received this month
        const applicationsThisMonth = await Application.count({
            where: {
                createdAt: { [Op.gte]: firstDayOfMonth }
            }
        });

        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers,
                byRole: {
                    administrators: adminCount,
                    management: managementCount,
                    hr: hrCount
                }
            },
            jobs: {
                total: totalJobs,
                active: activeJobs,
                inactive: totalJobs - activeJobs,
                approved: approvedJobs,
                rejected: rejectedJobs,
                pendingApproval: pendingApprovalJobs,
                postedThisMonth: jobsPostedThisMonth
            },
            tasks: {
                total: totalTasks,
                completed: completedTasks,
                pending: pendingTasks,
                inProgress: inProgressTasks,
                completedThisWeek: completedThisWeek,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
            },
            applications: {
                total: totalApplications,
                shortlisted: shortlistedApplications,
                rejected: rejectedApplications,
                pending: pendingApplications,
                receivedThisMonth: applicationsThisMonth
            },
            jobseekers: {
                total: totalJobseekers
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Failed to retrieve analytics' });
    }
});
END OF DUPLICATE SECTION */

// ============================================
// MANAGEMENT API ENDPOINTS (RBAC)
// ============================================

// Get all tasks (Management and assigned HR staff)
app.get('/api/management/tasks', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const employerProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });

        let tasks;
        
        // Management can see all tasks, HR staff can only see their assigned tasks
        if (employerProfile.canAssignTasks) {
            // Management view - all tasks
            tasks = await Task.findAll({
                include: [
                    {
                        model: User,
                        as: 'assignedTo',
                        attributes: ['id', 'first_name', 'last_name', 'email']
                    },
                    {
                        model: User,
                        as: 'assignedBy',
                        attributes: ['id', 'first_name', 'last_name']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
        } else {
            // HR staff view - only their tasks
            tasks = await Task.findAll({
                where: { assignedToId: req.session.userId },
                include: [
                    {
                        model: User,
                        as: 'assignedBy',
                        attributes: ['id', 'first_name', 'last_name']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
        }

        const formattedTasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            completedAt: task.completedAt,
            assignedTo: task.assignedTo ? {
                id: task.assignedTo.id,
                name: createDisplayName(task.assignedTo.first_name, task.assignedTo.last_name),
                email: task.assignedTo.email
            } : null,
            assignedBy: task.assignedBy ? {
                id: task.assignedBy.id,
                name: createDisplayName(task.assignedBy.first_name, task.assignedBy.last_name)
            } : null,
            relatedJobId: task.relatedJobId,
            createdAt: task.createdAt
        }));

        res.json({ tasks: formattedTasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ message: 'Failed to retrieve tasks' });
    }
});

// Assign task to HR staff (Management only)
app.post('/api/management/tasks', requirePermission('canAssignTasks'), async (req, res) => {
    console.log('🔵 POST /api/management/tasks endpoint hit');
    console.log('📋 Session user:', req.session.userId);
    console.log('📦 Request body:', req.body);
    
    try {
        const { title, description, assignedToId, priority, dueDate, relatedJobId } = req.body;

        console.log('📋 Task assignment request:', { title, assignedToId, priority });

        if (!title || !assignedToId) {
            console.error('❌ Missing required fields:', { title, assignedToId });
            return res.status(400).json({ message: 'Title and assignedToId are required' });
        }

        // Verify the user being assigned to exists and has appropriate role
        const assignedUser = await User.findByPk(assignedToId);
        if (!assignedUser) {
            console.error('❌ User not found with ID:', assignedToId);
            return res.status(400).json({ message: 'User not found' });
        }
        
        // Allow tasks to be assigned to management, hr_recruitment, administrator, and employer roles
        const validRoles = ['employer', 'management', 'hr_recruitment', 'administrator'];
        if (!validRoles.includes(assignedUser.role)) {
            console.error('❌ User has invalid role for task assignment:', { userId: assignedToId, role: assignedUser.role });
            return res.status(400).json({ message: 'Can only assign tasks to management, HR, or administrator users' });
        }

        console.log(`✅ Assigning task to: ${assignedUser.first_name} ${assignedUser.last_name} (${assignedUser.email}) [${assignedUser.role}]`);

        // Create task
        const task = await Task.create({
            title,
            description: description || '',
            assignedToId,
            assignedById: req.session.userId,
            status: 'pending',
            priority: priority || 'medium',
            dueDate: dueDate || null,
            relatedJobId: relatedJobId || null
        });

        console.log(`✅ Task created: ID ${task.id}`);

        // Get manager info for notification
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Send in-app notification to assigned user
        await Notification.create({
            userId: assignedToId,
            type: 'task_assigned',
            title: '📋 New Task Assigned',
            message: `${managerName} assigned you a task: "${title}"\n\n${description || 'No description provided'}\n\nPriority: ${priority || 'medium'}\nDue: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date'}`,
            relatedTaskId: task.id,
            relatedUserId: req.session.userId,
            isRead: false
        });

        console.log(`✅ In-app notification created for user ${assignedToId}`);

        // Send email notification
        const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .task-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .priority { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white; }
                    .priority-high { background: #f44336; }
                    .priority-urgent { background: #d32f2f; }
                    .priority-medium { background: #ff9800; }
                    .priority-low { background: #4caf50; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📋 New Task Assigned</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${assignedUser.first_name},</p>
                        <p><strong>${managerName}</strong> has assigned you a new task:</p>
                        
                        <div class="task-box">
                            <h2 style="margin-top: 0;">${title}</h2>
                            ${description ? `<p>${description}</p>` : ''}
                            <p><span class="priority priority-${priority || 'medium'}">${(priority || 'medium').toUpperCase()}</span></p>
                            ${dueDate ? `<p><strong>📅 Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
                        </div>
                        
                        <p>Please log in to your dashboard to view and manage this task.</p>
                        <a href="${process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za'}/pages/employer_dashboard.html" class="button">View My Tasks</a>
                        
                        <div class="footer">
                            <p>This is an automated message from TMV Business Solutions</p>
                            <p>Please do not reply to this email</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email
        const emailResult = await sendEmail(
            assignedUser.email,
            `📋 New Task Assigned: ${title}`,
            emailHTML,
            'general'
        );

        const emailSent = emailResult && emailResult.success;
        if (emailSent) {
            console.log(`✅ Email sent successfully to ${assignedUser.email}`);
        } else {
            console.warn(`⚠️ Email failed to send to ${assignedUser.email}, but task was created`);
        }

        res.status(201).json({
            message: 'Task assigned successfully',
            task: {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority
            },
            emailSent
        });
    } catch (error) {
        console.error('❌ Assign task error:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Failed to assign task', error: error.message });
    }
});

// Update task status (HR staff can update their own tasks)
app.put('/api/management/tasks/:taskId', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userType !== 'employer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { taskId } = req.params;
        const { status, notes, checklist } = req.body;

        const task = await Task.findByPk(taskId, {
            include: [
                {
                    model: User,
                    as: 'assignedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: User,
                    as: 'assignedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check permission: either assigned to this user or user is management
        const employerProfile = await EmployerProfile.findOne({
            where: { userId: req.session.userId }
        });

        const canUpdate = task.assignedToId === req.session.userId || employerProfile.canAssignTasks;

        if (!canUpdate) {
            return res.status(403).json({ message: 'You do not have permission to update this task' });
        }

        const oldStatus = task.status;
        const currentUser = await User.findByPk(req.session.userId);
        const currentUserName = `${currentUser.first_name} ${currentUser.last_name}`;

        // Update task
        if (status) task.status = status;
        if (notes !== undefined) task.notes = notes;
        if (checklist !== undefined) task.checklist = JSON.stringify(checklist);
        if (status === 'completed' && !task.completedAt) {
            task.completedAt = new Date();
        }

        await task.save();

        // Send notifications if status changed
        if (status && status !== oldStatus) {
            let notificationTitle = '';
            let notificationMessage = '';
            let emailRecipient = null;
            let emailSubject = '';
            let emailBody = '';

            if (status === 'completed') {
                // Notify the assigner that task is completed
                notificationTitle = '✅ Task Completed';
                notificationMessage = `${currentUserName} completed the task: "${task.title}"`;
                emailRecipient = task.assignedBy;
                emailSubject = `✅ Task Completed: ${task.title}`;
                emailBody = `
                    <h2>✅ Task Completed</h2>
                    <p><strong>${currentUserName}</strong> has completed the task you assigned:</p>
                    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
                        <h3>${task.title}</h3>
                        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                    </div>
                    <a href="${process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za'}/pages/employer_management_dashboard.html" style="display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                `;
                
                await Notification.create({
                    userId: task.assignedById,
                    type: 'task_completed',
                    title: notificationTitle,
                    message: notificationMessage,
                    relatedTaskId: task.id,
                    relatedUserId: req.session.userId,
                    isRead: false
                });
            } else if (status === 'in_progress') {
                // Notify the assigner that task is in progress
                notificationTitle = '🔄 Task In Progress';
                notificationMessage = `${currentUserName} started working on: "${task.title}"`;
                emailRecipient = task.assignedBy;
                emailSubject = `🔄 Task In Progress: ${task.title}`;
                emailBody = `
                    <h2>🔄 Task In Progress</h2>
                    <p><strong>${currentUserName}</strong> has started working on the task:</p>
                    <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0;">
                        <h3>${task.title}</h3>
                    </div>
                `;
                
                await Notification.create({
                    userId: task.assignedById,
                    type: 'task_updated',
                    title: notificationTitle,
                    message: notificationMessage,
                    relatedTaskId: task.id,
                    relatedUserId: req.session.userId,
                    isRead: false
                });
            } else if (status === 'returned') {
                // Task returned to assigner
                notificationTitle = '↩️ Task Returned';
                notificationMessage = `${currentUserName} returned the task: "${task.title}"\n\n${notes || 'No additional notes'}`;
                emailRecipient = task.assignedBy;
                emailSubject = `↩️ Task Returned: ${task.title}`;
                emailBody = `
                    <h2>↩️ Task Returned</h2>
                    <p><strong>${currentUserName}</strong> has returned the task:</p>
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                        <h3>${task.title}</h3>
                        ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
                    </div>
                    <a href="${process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za'}/pages/employer_management_dashboard.html" style="display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
                `;
                
                await Notification.create({
                    userId: task.assignedById,
                    type: 'task_returned',
                    title: notificationTitle,
                    message: notificationMessage,
                    relatedTaskId: task.id,
                    relatedUserId: req.session.userId,
                    isRead: false
                });
            }

            // Send email if there's a recipient
            if (emailRecipient && emailRecipient.email) {
                const emailHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        </style>
                    </head>
                    <body>
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1>Task Update</h1>
                        </div>
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                            <p>Hello ${emailRecipient.first_name},</p>
                            ${emailBody}
                            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                                <p>This is an automated message from TMV Business Solutions</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                const emailResult = await sendEmail(emailRecipient.email, emailSubject, emailHTML, 'general');
                if (emailResult && emailResult.success) {
                    console.log(`✅ Task update email sent to ${emailRecipient.email}`);
                } else {
                    console.warn(`⚠️ Failed to send task update email:`, emailResult ? emailResult.error : 'Unknown error');
                }
            }
        }

        res.json({ 
            message: 'Task updated successfully',
            task: {
                id: task.id,
                status: task.status,
                notes: task.notes
            }
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ message: 'Failed to update task' });
    }
});

// Delete task (Management only)
app.delete('/api/management/tasks/:taskId', requirePermission('canAssignTasks'), async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        await task.destroy();
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ message: 'Failed to delete task' });
    }
});

// ==================== MANAGEMENT MESSAGING ENDPOINT ====================

// Send message/instruction to team members (Management only)
app.post('/api/management/messages', requirePermission('canAssignTasks'), async (req, res) => {
    try {
        const { type, priority, recipientId, sendToAll, subject, content, dueDate } = req.body;

        if (!type || !subject || !content) {
            return res.status(400).json({ message: 'Type, subject, and content are required' });
        }

        // Get manager info
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Determine recipients
        let recipients = [];
        if (sendToAll) {
            // Send to all team members
            const allUsers = await User.findAll({
                where: { 
                    role: ['employer', 'management', 'hr_recruitment', 'administrator']
                },
                attributes: ['id', 'first_name', 'last_name', 'email']
            });
            recipients = allUsers.filter(u => u.id !== req.session.userId); // Exclude sender
        } else if (recipientId) {
            // Send to specific user
            const recipient = await User.findByPk(recipientId);
            if (!recipient) {
                return res.status(400).json({ message: 'Recipient not found' });
            }
            recipients = [recipient];
        } else {
            return res.status(400).json({ message: 'No recipients specified' });
        }

        // Create notifications for each recipient
        const notificationPromises = recipients.map(recipient => 
            Notification.create({
                userId: recipient.id,
                type: 'message_from_management',
                title: `${getPriorityIcon(priority)} ${getTypeLabel(type)}: ${subject}`,
                message: `From ${managerName}:\n\n${content}${dueDate ? `\n\nDue: ${new Date(dueDate).toLocaleDateString()}` : ''}`,
                relatedUserId: req.session.userId,
                isRead: false
            })
        );

        // Send emails to each recipient
        const emailPromises = recipients.map(recipient => {
            const emailHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .message-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        .priority { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white; }
                        .priority-high { background: #f44336; }
                        .priority-urgent { background: #d32f2f; }
                        .priority-normal { background: #4caf50; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${getTypeLabel(type)}</h1>
                        </div>
                        <div class="content">
                            <p>Hello ${recipient.first_name},</p>
                            <p><strong>${managerName}</strong> has sent you a ${getTypeLabel(type).toLowerCase()}:</p>
                            
                            <div class="message-box">
                                <h2 style="margin-top: 0;">${subject}</h2>
                                <p><span class="priority priority-${priority || 'normal'}">${(priority || 'normal').toUpperCase()}</span></p>
                                ${dueDate ? `<p><strong>📅 Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
                                <div style="margin-top: 20px; white-space: pre-line;">
                                    ${content}
                                </div>
                            </div>
                            
                            <p>Please log in to your dashboard to respond.</p>
                            <a href="${process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za'}/pages/employer_dashboard.html" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Dashboard</a>
                        </div>
                    </div>
                </body>
                </html>
            `;

            return sendEmail(
                recipient.email,
                `${getTypeLabel(type)}: ${subject}`,
                emailHTML
            );
        });

        await Promise.all([...notificationPromises, ...emailPromises]);

        res.json({
            message: 'Message sent successfully',
            recipientsCount: recipients.length
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
});

// Helper functions for messaging
function getPriorityIcon(priority) {
    switch(priority) {
        case 'urgent': return '🔴';
        case 'high': return '🟠';
        default: return '📋';
    }
}

function getTypeLabel(type) {
    switch(type) {
        case 'job_spec': return 'Job Specification';
        case 'instruction': return 'Instruction';
        case 'task': return 'Task';
        case 'announcement': return 'Team Announcement';
        default: return 'Message';
    }
}

// ==================== JOB APPROVAL/REJECTION ENDPOINTS ====================

// Approve job (Management only)
app.post('/api/management/jobs/:jobId/approve', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await Job.findByPk(jobId, {
            include: [{
                model: User,
                as: 'employer',
                attributes: ['id', 'first_name', 'last_name', 'email']
            }]
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update job approval status
        job.approvalStatus = 'approved';
        job.status = 'Active'; // Set to Active when approved
        job.approvedById = req.session.userId;
        job.approvedAt = new Date();
        await job.save();

        // Get manager info
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Create notification for job poster
        await Notification.create({
            userId: job.employerId,
            type: 'job_approved',
            title: '✅ Job Posting Approved',
            message: `Your job posting "${job.title}" has been approved by ${managerName} and is now Active.`,
            relatedJobId: job.id,
            relatedUserId: req.session.userId,
            isRead: false
        });

        // Send email notification to job poster
        const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .job-box { background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Job Posting Approved</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${job.employer?.first_name || 'Team Member'},</p>
                        <p><strong>${managerName}</strong> has approved your job posting:</p>
                        
                        <div class="job-box">
                            <h2 style="margin-top: 0;">${job.title}</h2>
                            <p><strong>Location:</strong> ${job.location || 'Not specified'}</p>
                            <p><strong>Job Type:</strong> ${job.jobType || 'Not specified'}</p>
                            <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">ACTIVE</span></p>
                        </div>
                        
                        <p>Your job posting is now live and accepting applications!</p>
                        <a href="${process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za'}/pages/employer_dashboard.html" class="button">View Job Posting</a>
                    </div>
                </div>
            </body>
            </html>
        `;

        if (job.employer?.email) {
            const emailResult = await sendEmail(
                job.employer.email,
                `✅ Job Approved: ${job.title}`,
                emailHTML,
                'careers'
            );
            if (emailResult && emailResult.success) {
                console.log(`✅ Job approval email sent to ${job.employer.email}`);
            } else {
                console.warn(`⚠️ Failed to send job approval email:`, emailResult ? emailResult.error : 'Unknown error');
            }
        }

        res.json({
            message: 'Job approved successfully',
            job: {
                id: job.id,
                title: job.title,
                status: job.status,
                approvalStatus: job.approvalStatus
            }
        });
    } catch (error) {
        console.error('Approve job error:', error);
        res.status(500).json({ message: 'Failed to approve job', error: error.message });
    }
});

// Reject job (Management only)
app.post('/api/management/jobs/:jobId/reject', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        const { jobId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const job = await Job.findByPk(jobId, {
            include: [{
                model: User,
                as: 'employer',
                attributes: ['id', 'first_name', 'last_name', 'email']
            }]
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update job approval status
        job.approvalStatus = 'rejected';
        job.status = 'Draft'; // Return to Draft status
        job.rejectionReason = reason;
        job.reviewedById = req.session.userId;
        job.reviewedAt = new Date();
        await job.save();

        // Get manager info
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Create notification for job poster
        await Notification.create({
            userId: job.employerId,
            type: 'job_rejected',
            title: '❌ Job Posting Rejected',
            message: `Your job posting "${job.title}" was rejected by ${managerName}.\n\nReason: ${reason}`,
            relatedJobId: job.id,
            relatedUserId: req.session.userId,
            isRead: false
        });

        // Send email notification to job poster
        const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .job-box { background: white; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .reason-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Job Posting Rejected</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${job.employer?.first_name || 'Team Member'},</p>
                        <p><strong>${managerName}</strong> has reviewed your job posting and requested changes:</p>
                        
                        <div class="job-box">
                            <h2 style="margin-top: 0;">${job.title}</h2>
                            <p><strong>Location:</strong> ${job.location || 'Not specified'}</p>
                            <p><strong>Job Type:</strong> ${job.jobType || 'Not specified'}</p>
                        </div>
                        
                        <div class="reason-box">
                            <strong>Reason for Rejection:</strong>
                            <p style="margin-top: 10px;">${reason}</p>
                        </div>
                        
                        <p>Please review the feedback and update your job posting accordingly.</p>
                        <a href="${process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za'}/pages/employer_dashboard.html" class="button">Edit Job Posting</a>
                    </div>
                </div>
            </body>
            </html>
        `;

        if (job.employer?.email) {
            const emailResult = await sendEmail(
                job.employer.email,
                `❌ Job Requires Changes: ${job.title}`,
                emailHTML,
                'careers'
            );
            if (emailResult && emailResult.success) {
                console.log(`✅ Job rejection email sent to ${job.employer.email}`);
            } else {
                console.warn(`⚠️ Failed to send job rejection email:`, emailResult ? emailResult.error : 'Unknown error');
            }
        }

        res.json({
            message: 'Job rejected successfully',
            job: {
                id: job.id,
                title: job.title,
                status: job.status,
                approvalStatus: job.approvalStatus
            }
        });
    } catch (error) {
        console.error('Reject job error:', error);
        res.status(500).json({ message: 'Failed to reject job', error: error.message });
    }
});

// Get pending jobs for approval (Management only)
app.get('/api/management/jobs/pending', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        const jobs = await Job.findAll({
            where: { approvalStatus: 'pending' },
            include: [{
                model: User,
                as: 'employer',
                attributes: ['id', 'first_name', 'last_name', 'email'],
                include: [{
                    model: EmployerProfile,
                    attributes: ['department', 'jobTitle']
                }]
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedJobs = jobs.map(job => ({
            id: job.id,
            title: job.title,
            description: job.description,
            location: job.location,
            jobType: job.jobType,
            department: job.department,
            companyName: job.companyName,
            status: job.status,
            approvalStatus: job.approvalStatus,
            createdAt: job.createdAt,
            createdBy: job.employer ? {
                name: `${job.employer.first_name} ${job.employer.last_name}`,
                department: job.employer.EmployerProfile?.department,
                jobTitle: job.employer.EmployerProfile?.jobTitle
            } : null
        }));

        res.json({ jobs: formattedJobs });
    } catch (error) {
        console.error('Get pending jobs error:', error);
        res.status(500).json({ message: 'Failed to load pending jobs', error: error.message });
    }
});

// Withdraw job to Draft status (Management only)
app.put('/api/management/jobs/:jobId/withdraw', requirePermission('canWithdrawPost'), async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await Job.findByPk(jobId, {
            include: [{
                model: User,
                as: 'employer',
                attributes: ['id', 'first_name', 'last_name', 'email']
            }]
        });
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update job status to Draft
        job.status = 'Draft';
        job.approvalStatus = 'pending'; // Will need re-approval if re-posted
        await job.save();

        // Get manager info for notification
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Notify job creator if different from current user
        if (job.employerId !== req.session.userId) {
            await Notification.create({
                userId: job.employerId,
                type: 'job_withdrawn',
                title: '📋 Job Withdrawn to Drafts',
                message: `${managerName} has withdrawn your job posting "${job.title}" to Draft status. You can edit and re-submit it for approval.`,
                relatedJobId: job.id,
                relatedUserId: req.session.userId,
                isRead: false
            });
        }

        res.json({
            message: 'Job withdrawn to drafts successfully',
            job: {
                id: job.id,
                title: job.title,
                status: job.status,
                approvalStatus: job.approvalStatus
            }
        });
    } catch (error) {
        console.error('Withdraw job error:', error);
        res.status(500).json({ message: 'Failed to withdraw job', error: error.message });
    }
});

// ==================== HR/EMPLOYEE TASK ENDPOINTS ====================

// Get tasks assigned to current user (for HR dashboard)
app.get('/api/tasks/my-tasks', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        console.log('📋 Fetching tasks for user:', req.session.userId);

        const tasks = await Task.findAll({
            where: { assignedToId: req.session.userId },
            include: [
                {
                    model: User,
                    as: 'assignedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ],
            order: [
                ['status', 'ASC'], // pending first, then in_progress, completed, returned
                ['priority', 'DESC'], // urgent first
                ['dueDate', 'ASC']
            ]
        });

        console.log(`✅ Found ${tasks.length} tasks for user ${req.session.userId}`);

        res.json({ tasks });
    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({ message: 'Failed to load tasks' });
    }
});

// Update task status (for assigned user)
app.put('/api/tasks/:taskId/status', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status, notes, returnReason } = req.body;

        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const task = await Task.findByPk(taskId, {
            include: [
                {
                    model: User,
                    as: 'assignedBy',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: User,
                    as: 'assignedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Only assigned user can update their task
        if (task.assignedToId !== req.session.userId) {
            return res.status(403).json({ message: 'You can only update tasks assigned to you' });
        }

        const oldStatus = task.status;
        task.status = status;

        if (status === 'completed') {
            task.completedAt = new Date();
        }

        if (status === 'returned' && returnReason) {
            task.returnReason = returnReason;
        }

        if (notes) {
            task.notes = notes;
        }

        await task.save();

        // Send notification to the manager who assigned the task
        let notificationTitle = '';
        let notificationMessage = '';

        switch (status) {
            case 'in_progress':
                notificationTitle = '🔄 Task Started';
                notificationMessage = `${task.assignedTo.first_name} ${task.assignedTo.last_name} started working on task: "${task.title}"`;
                break;
            case 'completed':
                notificationTitle = '✅ Task Completed';
                notificationMessage = `${task.assignedTo.first_name} ${task.assignedTo.last_name} completed task: "${task.title}"`;
                break;
            case 'returned':
                notificationTitle = '↩️ Task Returned';
                notificationMessage = `${task.assignedTo.first_name} ${task.assignedTo.last_name} returned task: "${task.title}"\n\nReason: ${returnReason || 'No reason provided'}`;
                break;
        }

        if (notificationTitle) {
            await Notification.create({
                userId: task.assignedById,
                type: 'task_update',
                title: notificationTitle,
                message: notificationMessage,
                relatedTaskId: task.id,
                relatedUserId: req.session.userId,
                isRead: false
            });
        }

        console.log(`✅ Task ${taskId} status updated: ${oldStatus} → ${status}`);

        res.json({ 
            message: 'Task status updated successfully',
            task: {
                id: task.id,
                status: task.status,
                notes: task.notes
            }
        });
    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({ message: 'Failed to update task status' });
    }
});

// Update task notes (for assigned user)
app.put('/api/tasks/:taskId/notes', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { notes } = req.body;

        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const task = await Task.findByPk(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Only assigned user can update their task notes
        if (task.assignedToId !== req.session.userId) {
            return res.status(403).json({ message: 'You can only update tasks assigned to you' });
        }

        task.notes = notes;
        await task.save();

        console.log(`📝 Task ${taskId} notes updated`);

        res.json({ 
            message: 'Task notes updated successfully',
            notes: task.notes
        });
    } catch (error) {
        console.error('Update task notes error:', error);
        res.status(500).json({ message: 'Failed to update task notes' });
    }
});

// Update task checklist (for assigned user)
app.put('/api/tasks/:taskId/checklist', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { checklist } = req.body;

        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const task = await Task.findByPk(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Only assigned user can update their task checklist
        if (task.assignedToId !== req.session.userId) {
            return res.status(403).json({ message: 'You can only update tasks assigned to you' });
        }

        task.checklist = checklist;
        await task.save();

        console.log(`✅ Task ${taskId} checklist updated`);

        res.json({ 
            message: 'Task checklist updated successfully',
            checklist: task.checklist
        });
    } catch (error) {
        console.error('Update task checklist error:', error);
        res.status(500).json({ message: 'Failed to update task checklist' });
    }
});

// Get all jobs for approval (Management only)
app.get('/api/management/jobs/pending', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        console.log('📋 Fetching pending approval jobs for manager:', req.session.userId);
        
        // Get all employer users from the same company
        const employerUsers = await User.findAll({
            where: { role: 'employer' }
        });
        const employerIds = employerUsers.map(u => u.id);
        
        // Find jobs with approvalStatus = 'pending' (not status)
        const pendingJobs = await Job.findAll({
            where: { 
                approvalStatus: 'pending',
                isDeleted: false,
                employerId: employerIds
            },
            include: [{
                model: User,
                as: 'employer_user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
                include: [{
                    model: EmployerProfile,
                    attributes: ['role', 'jobTitle', 'companyName']
                }]
            }],
            order: [['createdAt', 'DESC']]
        });

        console.log(`✅ Found ${pendingJobs.length} pending jobs`);

        res.json({ 
            jobs: pendingJobs,
            count: pendingJobs.length 
        });
    } catch (error) {
        console.error('Get pending jobs error:', error);
        res.status(500).json({ message: 'Failed to retrieve pending jobs' });
    }
});

// Approve job (Management only)
app.put('/api/management/jobs/:jobId/approve', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        const { jobId } = req.params;
        console.log(`🔄 Approve job request for job #${jobId} by user ${req.session.userId}`);
        console.log('👤 User profile:', req.employerProfile ? `${req.employerProfile.role} - canApproveJobs: ${req.employerProfile.canApproveJobs}` : 'No profile');

        const job = await Job.findByPk(jobId, {
            include: [{
                model: User,
                as: 'employer_user',
                attributes: ['id', 'first_name', 'last_name', 'email']
            }]
        });
        
        if (!job) {
            console.log(`❌ Job #${jobId} not found`);
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update job to approved status
        job.status = 'Active';
        job.approvalStatus = 'approved';
        job.approvedBy = req.session.userId;
        job.approvedAt = new Date();
        job.rejectedBy = null;
        job.rejectedAt = null;
        job.rejectionReason = null;
        await job.save();

        console.log(`✅ Job #${jobId} approved by manager ${req.session.userId}`);

        // Get manager info for notification
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Send approval notification to job creator
        await Notification.create({
            userId: job.employerId,
            type: 'job_approved',
            title: 'Job Post Approved! 🎉',
            message: `Your job post "${job.title}" has been approved by ${managerName} and is now live. Job seekers can now apply.`,
            relatedJobId: job.id,
            relatedUserId: req.session.userId,
            isRead: false
        });

        console.log(`📬 Approval notification sent to user ${job.employerId}`);

        res.json({ 
            message: 'Job approved successfully! The job is now live and visible to job seekers.',
            job: {
                id: job.id,
                title: job.title,
                status: job.status,
                approvalStatus: job.approvalStatus
            }
        });
    } catch (error) {
        console.error('Approve job error:', error);
        res.status(500).json({ message: 'Failed to approve job' });
    }
});

// Reject job (Management only)
app.put('/api/management/jobs/:jobId/reject', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        const { jobId } = req.params;
        const { reason } = req.body;
        console.log(`🔄 Reject job request for job #${jobId} by user ${req.session.userId}`);
        console.log('👤 User profile:', req.employerProfile ? `${req.employerProfile.role} - canApproveJobs: ${req.employerProfile.canApproveJobs}` : 'No profile');
        console.log('📝 Rejection reason:', reason);

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const job = await Job.findByPk(jobId, {
            include: [{
                model: User,
                as: 'employer_user',
                attributes: ['id', 'first_name', 'last_name', 'email']
            }]
        });
        
        if (!job) {
            console.log(`❌ Job #${jobId} not found`);
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update job to rejected status
        job.status = 'rejected';
        job.approvalStatus = 'rejected';
        job.rejectedBy = req.session.userId;
        job.rejectedAt = new Date();
        job.rejectionReason = reason;
        job.approvedBy = null;
        job.approvedAt = null;
        await job.save();

        console.log(`❌ Job #${jobId} rejected by manager ${req.session.userId}`);

        // Get manager info for notification
        const manager = await User.findByPk(req.session.userId);
        const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Manager';

        // Send rejection notification to job creator
        await Notification.create({
            userId: job.employerId,
            type: 'job_rejected',
            title: 'Job Post Needs Revisions ⚠️',
            message: `Your job post "${job.title}" was reviewed by ${managerName} and requires changes before it can be published.\n\nReason: ${reason}\n\nPlease edit the job post and resubmit for approval.`,
            relatedJobId: job.id,
            relatedUserId: req.session.userId,
            isRead: false
        });

        console.log(`📬 Rejection notification sent to user ${job.employerId}`);

        res.json({ 
            message: 'Job rejected. The creator has been notified to make necessary changes.',
            job: {
                id: job.id,
                title: job.title,
                status: job.status,
                approvalStatus: job.approvalStatus,
                rejectionReason: job.rejectionReason
            }
        });
    } catch (error) {
        console.error('Reject job error:', error);
        res.status(500).json({ message: 'Failed to reject job' });
    }
});

// Get job review history (all jobs with approval status)
app.get('/api/management/jobs/review-history', requirePermission('canApproveJobs'), async (req, res) => {
    try {
        console.log('📋 Fetching job review history for manager:', req.session.userId);
        
        // Get all employer users from the same company
        const employerUsers = await User.findAll({
            where: { role: 'employer' }
        });
        const employerIds = employerUsers.map(u => u.id);
        
        // Find all jobs with approval status (approved or rejected)
        const reviewedJobs = await Job.findAll({
            where: { 
                employerId: employerIds,
                isDeleted: false,
                approvalStatus: ['approved', 'rejected']
            },
            include: [
                {
                    model: User,
                    as: 'employer_user',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
                    include: [{
                        model: EmployerProfile,
                        attributes: ['role', 'jobTitle', 'companyName']
                    }]
                },
                {
                    model: User,
                    as: 'approver',
                    attributes: ['id', 'first_name', 'last_name'],
                    required: false
                },
                {
                    model: User,
                    as: 'rejector',
                    attributes: ['id', 'first_name', 'last_name'],
                    required: false
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        console.log(`✅ Found ${reviewedJobs.length} reviewed jobs`);

        res.json({ 
            jobs: reviewedJobs,
            count: reviewedJobs.length 
        });
    } catch (error) {
        console.error('Get review history error:', error);
        res.status(500).json({ message: 'Failed to retrieve review history' });
    }
});

// ==========================================
// NOTIFICATION API ENDPOINTS
// ==========================================

// Get all notifications for current user
app.get('/api/notifications', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const notifications = await Notification.findAll({
            where: { userId: req.session.userId },
            include: [
                {
                    model: Job,
                    as: 'relatedJob',
                    attributes: ['id', 'title', 'status', 'approvalStatus']
                },
                {
                    model: User,
                    as: 'triggeredBy',
                    attributes: ['id', 'first_name', 'last_name']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.json({ 
            notifications,
            unreadCount,
            total: notifications.length
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const notification = await Notification.findOne({
            where: { 
                id: req.params.id,
                userId: req.session.userId 
            }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await Notification.update(
            { 
                isRead: true, 
                readAt: new Date() 
            },
            { 
                where: { 
                    userId: req.session.userId,
                    isRead: false
                } 
            }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
});

// Delete notification
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const notification = await Notification.findOne({
            where: { 
                id: req.params.id,
                userId: req.session.userId 
            }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await notification.destroy();
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
});

// ==========================================
// CHECK ALL ROLES ENDPOINT
// ==========================================
app.get('/api/check-all-roles', async (req, res) => {
    try {
        console.log('🔍 Checking all user roles...');

        // Get all users with employer profiles
        const users = await User.findAll({
            attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'isActive'],
            include: [{
                model: EmployerProfile,
                attributes: ['role', 'accessLevel', 'department', 'jobTitle'],
                required: true
            }],
            order: [['id', 'ASC']]
        });

        const results = users.map(user => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            user_role: user.role,
            profile_role: user.EmployerProfile?.role,
            isActive: user.isActive,
            department: user.EmployerProfile?.department,
            jobTitle: user.EmployerProfile?.jobTitle,
            mismatch: user.role !== user.EmployerProfile?.role
        }));

        const mismatchCount = results.filter(r => r.mismatch).length;

        console.log(`📊 Found ${users.length} users, ${mismatchCount} with role mismatches`);

        res.json({
            total: users.length,
            mismatchCount,
            users: results
        });
    } catch (error) {
        console.error('❌ Error checking roles:', error);
        res.status(500).json({ 
            message: 'Failed to check roles',
            error: error.message 
        });
    }
});

// ==========================================
// FIX ALL ROLES ENDPOINT
// ==========================================
app.post('/api/fix-all-roles', async (req, res) => {
    try {
        console.log('🔧 Fixing all mismatched roles...');

        // Get all users with employer profiles
        const users = await User.findAll({
            include: [{
                model: EmployerProfile,
                required: true
            }]
        });

        const fixed = [];

        for (const user of users) {
            const profileRole = user.EmployerProfile?.role;
            
            if (user.role !== profileRole && profileRole) {
                const oldRole = user.role;
                
                // Update user role to match profile role
                await user.update({ role: profileRole });
                
                console.log(`✅ Fixed ${user.email}: ${oldRole} → ${profileRole}`);
                
                fixed.push({
                    email: user.email,
                    old_role: oldRole,
                    new_role: profileRole
                });
            }
        }

        console.log(`🎉 Fixed ${fixed.length} accounts`);

        res.json({
            message: `Successfully fixed ${fixed.length} account(s)`,
            fixed
        });
    } catch (error) {
        console.error('❌ Error fixing roles:', error);
        res.status(500).json({ 
            message: 'Failed to fix roles',
            error: error.message 
        });
    }
});

// ==========================================
// FIX ACCOUNT ROLE ENDPOINT
// ==========================================
app.post('/api/fix-account-role', async (req, res) => {
    const { email } = req.body;

    try {
        console.log(`🔧 Fixing account role for: ${email}`);

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`📋 Current user role: ${user.role}`);

        // Update user role to management
        await user.update({
            role: 'management',
            isActive: true
        });

        console.log(`✅ Updated users.role to: management`);

        // Find employer profile
        let profile = await EmployerProfile.findOne({ where: { userId: user.id } });
        
        if (!profile) {
            // Create profile if doesn't exist
            profile = await EmployerProfile.create({
                userId: user.id,
                role: 'management',
                accessLevel: 2,
                department: 'Management',
                jobTitle: 'Manager',
                canCreatePost: 1,
                canWritePost: 1,
                canEditPost: 1,
                canDeletePost: 1,
                canAssignPost: 1,
                canTransferPost: 1,
                canWithdrawPost: 1,
                canViewApplications: 1,
                canReviewApplications: 1,
                canShortlistCandidates: 1,
                canRejectCandidates: 1,
                canScheduleInterviews: 1,
                canPullReportApplied: 1,
                canPullReportShortlisted: 1,
                canPullReportRejected: 1,
                canPullReportFull: 1,
                canExportReports: 1,
                canViewAnalytics: 1,
                canViewAllJobs: 1,
                canMonitorPerformance: 1,
                canAssignTasks: 1,
                canApproveJobs: 1,
                canManageTeam: 1
            });
            console.log(`✅ Created new employer profile with management role`);
        } else {
            // Update existing profile
            await profile.update({
                role: 'management',
                accessLevel: 2,
                department: 'Management',
                jobTitle: 'Manager',
                canCreatePost: 1,
                canWritePost: 1,
                canEditPost: 1,
                canDeletePost: 1,
                canAssignPost: 1,
                canTransferPost: 1,
                canWithdrawPost: 1,
                canViewApplications: 1,
                canReviewApplications: 1,
                canShortlistCandidates: 1,
                canRejectCandidates: 1,
                canScheduleInterviews: 1,
                canPullReportApplied: 1,
                canPullReportShortlisted: 1,
                canPullReportRejected: 1,
                canPullReportFull: 1,
                canExportReports: 1,
                canViewAnalytics: 1,
                canViewAllJobs: 1,
                canMonitorPerformance: 1,
                canAssignTasks: 1,
                canApproveJobs: 1,
                canManageTeam: 1
            });
            console.log(`✅ Updated employer profile to management role`);
        }

        // Fetch updated data
        const updatedUser = await User.findByPk(user.id);
        const updatedProfile = await EmployerProfile.findOne({ where: { userId: user.id } });

        res.json({
            message: 'Account upgraded to Manager role successfully!',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                user_role: updatedUser.role,
                profile_role: updatedProfile.role,
                accessLevel: updatedProfile.accessLevel,
                department: updatedProfile.department,
                jobTitle: updatedProfile.jobTitle
            }
        });

        console.log(`🎉 Account upgrade complete for ${email}`);
    } catch (error) {
        console.error('❌ Error fixing account role:', error);
        res.status(500).json({ 
            message: 'Failed to upgrade account',
            error: error.message 
        });
    }
});

// ==========================================
// MANAGEMENT DASHBOARD API ROUTES
// Import and initialize management endpoints
// ⚠️ IMPORTANT: Must be loaded BEFORE 404 handler!
// ==========================================

try {
    const managementAPI = require('./backend/routes/management_api');
    managementAPI(app, sequelize);
    console.log('✅ Management Dashboard API routes loaded');
} catch (error) {
    console.error('⚠ Failed to load management API routes:', error.message);
    console.error('Error details:', error.stack);
    // Continue without management routes - server still starts
}

// ⚠️ 404 Handler moved to END of file (after all routes including payment routes)
// DO NOT place 404 handler here - routes defined after this will not work!

// Migration function to update users.role ENUM
async function migrateRoleEnum() {
    try {
        console.log('🔄 Migrating users.role ENUM to include new roles...');
        
        // Update the role column to include administrator, management, hr_recruitment
        await sequelize.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM(
                'client', 
                'employer', 
                'job_seeker', 
                'jobseeker', 
                'admin', 
                'administrator', 
                'management', 
                'hr_recruitment'
            ) DEFAULT 'client' 
            COMMENT 'User role: client, employer, jobseeker, admin, administrator, management, hr_recruitment'
        `);
        
        console.log('  ✓ users.role ENUM updated with new values');
    } catch (error) {
        if (error.message && error.message.includes('Duplicate entry')) {
            console.log('  - users.role ENUM already includes new values');
        } else {
            console.error('  ⚠ Role ENUM migration error:', error.message.substring(0, 100));
        }
    }
}

// Migration function to add new permission columns
async function migratePermissionColumns() {
    try {
        const tableName = 'employer_profiles';
        
        // List of all new permission columns
        const permissionColumns = [
            'canCreatePost', 'canWritePost', 'canEditPost', 'canDeletePost',
            'canAssignPost', 'canTransferPost', 'canWithdrawPost',
            'canViewApplications', 'canReviewApplications', 'canShortlistCandidates',
            'canRejectCandidates', 'canScheduleInterviews',
            'canPullReportApplied', 'canPullReportShortlisted', 'canPullReportRejected',
            'canPullReportFull', 'canExportReports',
            'canManagePermissions', 'canMonitorPerformance', 'canManageTeam'
        ];
        
        // Check and add each column if it doesn't exist
        for (const column of permissionColumns) {
            try {
                // Try to add the column - will fail silently if it already exists
                await sequelize.query(`
                    ALTER TABLE ${tableName} 
                    ADD COLUMN ${column} TINYINT(1) DEFAULT 0
                `);
                console.log(`  ✓ Column ${column} added`);
            } catch (error) {
                // Column already exists or other error - just log it
                if (error.message && error.message.includes('Duplicate column')) {
                    console.log(`  - Column ${column} already exists`);
                } else if (!error.message.includes('duplicate')) {
                    console.log(`  ⚠ ${column}:`, error.message.substring(0, 50));
                }
            }
        }
        
        // Update existing admin users with full permissions
        await sequelize.query(`
            UPDATE ${tableName} 
            SET 
                canCreatePost = 1, canWritePost = 1, canEditPost = 1, canDeletePost = 1,
                canAssignPost = 1, canTransferPost = 1, canWithdrawPost = 1,
                canViewApplications = 1, canReviewApplications = 1, canShortlistCandidates = 1,
                canRejectCandidates = 1, canScheduleInterviews = 1,
                canPullReportApplied = 1, canPullReportShortlisted = 1, canPullReportRejected = 1,
                canPullReportFull = 1, canExportReports = 1,
                canManagePermissions = 1, canMonitorPerformance = 1, canManageTeam = 1
            WHERE role = 'administrator'
        `);
        console.log('  ✓ Administrator permissions updated');
        
        // Update management users - EVERYTHING HR has PLUS delete, assign, transfer, full reports, analytics, management tasks
        await sequelize.query(`
            UPDATE ${tableName} 
            SET 
                canCreatePost = 1, canWritePost = 1, canEditPost = 1, canDeletePost = 1,
                canAssignPost = 1, canTransferPost = 1, canWithdrawPost = 1,
                canViewApplications = 1, canReviewApplications = 1, canShortlistCandidates = 1,
                canRejectCandidates = 1, canScheduleInterviews = 1,
                canPullReportApplied = 1, canPullReportShortlisted = 1, canPullReportRejected = 1,
                canPullReportFull = 1, canExportReports = 1,
                canViewAnalytics = 1, canViewAllJobs = 1, canMonitorPerformance = 1,
                canAssignTasks = 1, canApproveJobs = 1, canManageTeam = 1
            WHERE role = 'management'
        `);
        console.log('  ✓ Management permissions updated (FULL ACCESS - everything except Admin rights)');
        
        // Update HR users
        await sequelize.query(`
            UPDATE ${tableName} 
            SET 
                canCreatePost = 1, canWritePost = 1, canEditPost = 1, canWithdrawPost = 1,
                canViewApplications = 1, canReviewApplications = 1, canShortlistCandidates = 1,
                canRejectCandidates = 1, canScheduleInterviews = 1,
                canPullReportApplied = 1, canPullReportShortlisted = 1, canPullReportRejected = 1,
                canExportReports = 1
            WHERE role = 'hr_recruitment'
        `);
        console.log('  ✓ HR & Recruitment permissions updated');
        
    } catch (error) {
        console.error('⚠ Migration error:', error.message);
        // Don't throw - let the server start anyway
    }
}

// ==========================================
// Industry to Department Migration
// ==========================================
async function migrateDepartmentColumn() {
    try {
        // Step 1: Add department column if it doesn't exist
        try {
            await sequelize.query(`
                ALTER TABLE jobs 
                ADD COLUMN department ENUM(
                    'Admin',
                    'Architecture',
                    'Consulting',
                    'Finance & Accounts',
                    'Information Technology (IT)',
                    'Innovation & Design',
                    'Marketing & Branding',
                    'Security & Automation'
                ) NULL AFTER city
            `);
            console.log('  ✓ Department column added');
        } catch (error) {
            if (error.message && error.message.includes('Duplicate column')) {
                console.log('  - Department column already exists');
            } else {
                throw error;
            }
        }

        // Step 2: Migrate industry data to department (if industry column exists)
        const [[industryColumn]] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tmvbusinesssolutions' 
            AND TABLE_NAME = 'jobs' 
            AND COLUMN_NAME = 'industry'
        `);

        if (industryColumn) {
            console.log('  📋 Migrating existing industry data...');
            
            // Map old values to new departments
            const migrations = [
                { old: 'IT', new: 'Information Technology (IT)' },
                { old: 'Information Technology', new: 'Information Technology (IT)' },
                { old: 'Technology', new: 'Information Technology (IT)' },
                { old: 'Finance', new: 'Finance & Accounts' },
                { old: 'Finance & Banking', new: 'Finance & Accounts' },
                { old: 'Banking', new: 'Finance & Accounts' },
                { old: 'Accounts', new: 'Finance & Accounts' },
                { old: 'Consulting', new: 'Consulting' },
                { old: 'Admin', new: 'Admin' },
                { old: 'Architecture', new: 'Architecture' },
                { old: 'Marketing', new: 'Marketing & Branding' },
                { old: 'Branding', new: 'Marketing & Branding' },
                { old: 'Security', new: 'Security & Automation' },
                { old: 'Automation', new: 'Security & Automation' },
                { old: 'Design', new: 'Innovation & Design' },
                { old: 'Innovation', new: 'Innovation & Design' }
            ];

            for (const map of migrations) {
                const [results] = await sequelize.query(`
                    UPDATE jobs 
                    SET department = '${map.new}' 
                    WHERE industry = '${map.old}' AND department IS NULL
                `);
                if (results.affectedRows > 0) {
                    console.log(`    ✓ Migrated ${results.affectedRows} job(s): "${map.old}" → "${map.new}"`);
                }
            }

            // Set any remaining NULL departments to a default
            const [defaultResults] = await sequelize.query(`
                UPDATE jobs 
                SET department = 'Admin' 
                WHERE department IS NULL AND industry IS NOT NULL
            `);
            if (defaultResults.affectedRows > 0) {
                console.log(`    ✓ Set ${defaultResults.affectedRows} unmapped job(s) to default "Admin"`);
            }

            console.log('  ✓ Industry data migrated to department');
        }

    } catch (error) {
        console.error('⚠ Department migration error:', error.message);
        // Don't throw - let the server start anyway
    }
}

// Migration function to add approvalStatus column and backfill existing jobs
async function migrateApprovalStatus() {
    try {
        console.log('\n🔄 Starting approvalStatus column migration...');
        
        // Check if approvalStatus column exists
        const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tmvbusinesssolutions' 
            AND TABLE_NAME = 'jobs'
            AND COLUMN_NAME = 'approvalStatus'
        `);
        
        const hasApprovalStatus = columns.length > 0;
        console.log(`📊 approvalStatus column exists: ${hasApprovalStatus}`);
        
        if (!hasApprovalStatus) {
            // Add approvalStatus column
            console.log('➕ Adding approvalStatus column...');
            await sequelize.query(`
                ALTER TABLE jobs 
                ADD COLUMN approvalStatus ENUM('pending', 'approved', 'rejected') 
                NOT NULL DEFAULT 'pending' 
                AFTER status
            `);
            console.log('✅ approvalStatus column added');
            
            // Set all existing Active jobs to approved status
            console.log('🔄 Setting existing Active jobs to approved...');
            const [result] = await sequelize.query(`
                UPDATE jobs 
                SET approvalStatus = 'approved' 
                WHERE status = 'Active'
            `);
            
            const affectedRows = result.affectedRows || 0;
            console.log(`✅ Set ${affectedRows} Active jobs to approved status`);
            
            // Also set Draft jobs to pending (they should already be pending by default)
            console.log('🔄 Ensuring Draft jobs are set to pending...');
            await sequelize.query(`
                UPDATE jobs 
                SET approvalStatus = 'pending' 
                WHERE status = 'Draft' OR status = 'draft'
            `);
            console.log('✅ Draft jobs set to pending status');
        } else {
            console.log('✅ approvalStatus column already exists');
            
            // Check if any Active jobs don't have approved status
            const [jobsToFix] = await sequelize.query(`
                SELECT COUNT(*) as count 
                FROM jobs 
                WHERE status = 'Active' 
                AND (approvalStatus IS NULL OR approvalStatus != 'approved')
            `);
            
            if (jobsToFix[0].count > 0) {
                console.log(`🔄 Found ${jobsToFix[0].count} Active jobs without approved status, fixing...`);
                await sequelize.query(`
                    UPDATE jobs 
                    SET approvalStatus = 'approved' 
                    WHERE status = 'Active' 
                    AND (approvalStatus IS NULL OR approvalStatus != 'approved')
                `);
                console.log(`✅ Fixed ${jobsToFix[0].count} Active jobs`);
            } else {
                console.log('✅ All Active jobs already have approved status');
            }
        }
        
        console.log('✅ approvalStatus migration complete!\n');
        
    } catch (error) {
        console.error('❌ Error during approvalStatus migration:', error.message);
        // Don't throw - allow server to continue even if migration fails
    }
}

// Migration function for referenceNumber column in payments table
async function migrateReferenceNumberColumn() {
    try {
        console.log('\n🔄 Starting referenceNumber column migration...');
        
        // Check if referenceNumber column exists in payments table
        const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tmvbusinesssolutions' 
            AND TABLE_NAME = 'payments'
            AND COLUMN_NAME = 'referenceNumber'
        `);
        
        const hasReferenceNumber = columns.length > 0;
        console.log(`📊 referenceNumber column exists: ${hasReferenceNumber}`);
        
        if (!hasReferenceNumber) {
            // Add referenceNumber column
            console.log('➕ Adding referenceNumber column...');
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN referenceNumber VARCHAR(255) NULL 
                COMMENT 'Payment reference number (TMVB/DD/MM/YYYY/NNN format)'
                AFTER metadata
            `);
            console.log('✅ referenceNumber column added');
        } else {
            console.log('✅ referenceNumber column already exists');
        }
        
        console.log('✅ referenceNumber migration complete!\n');
        
    } catch (error) {
        console.error('❌ Error during referenceNumber migration:', error.message);
        // Don't throw - allow server to continue even if migration fails
    }
}

// ==========================================
// YOCO PAYMENT GATEWAY INTEGRATION
// ==========================================

const axios = require('axios');

// Yoco configuration
// Choose environment via YOCO_MODE ("live" or "test") or fall back to NODE_ENV === 'production'
const YOCO_MODE = (process.env.YOCO_MODE || '').toLowerCase();
const USE_LIVE = YOCO_MODE === 'live' || process.env.NODE_ENV === 'production';

const YOCO_CONFIG = {
    baseURL: 'https://payments.yoco.com',
    secretKey: USE_LIVE ? process.env.YOCO_LIVE_SECRET_KEY : process.env.YOCO_TEST_SECRET_KEY,
    publicKey: USE_LIVE ? process.env.YOCO_LIVE_PUBLIC_KEY : process.env.YOCO_TEST_PUBLIC_KEY,
    mode: USE_LIVE ? 'live' : 'test'
};

// Validate Yoco configuration
if (!YOCO_CONFIG.secretKey || !YOCO_CONFIG.publicKey) {
    console.error('❌ YOCO CONFIGURATION ERROR: Missing keys!');
    console.error('   - Secret Key:', !!YOCO_CONFIG.secretKey ? 'Set' : 'MISSING');
    console.error('   - Public Key:', !!YOCO_CONFIG.publicKey ? 'Set' : 'MISSING');
    console.error('   - Mode:', YOCO_CONFIG.mode);
    if (USE_LIVE) {
        console.error('   ⚠️ PRODUCTION MODE: Ensure YOCO_LIVE_SECRET_KEY and YOCO_LIVE_PUBLIC_KEY are set!');
    }
} else {
    console.log('✅ Yoco Payment Gateway initialized successfully:', {
        environment: process.env.NODE_ENV || 'development',
        mode: YOCO_CONFIG.mode.toUpperCase(),
        publicKey: YOCO_CONFIG.publicKey.substring(0, 20) + '...',
        secretKeySet: '✅ Set',
        baseURL: YOCO_CONFIG.baseURL
    });
}

// Payment Model - Stores payment transactions
const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    checkoutId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Yoco checkout ID'
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Amount in cents'
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'ZAR'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional payment metadata'
    },
    yocoPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Yoco payment/charge ID'
    },
    referenceNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: 'TMV reference number in format TMVB/DD/MM/YYYY/NNN'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    refundedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'payments',
    timestamps: true
});

// Define associations
Payment.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Helper function to generate TMV reference number
async function generateReferenceNumber() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    // Get today's payment count to generate sequence number
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const dailyCount = await Payment.count({
        where: {
            createdAt: {
                [Op.gte]: startOfDay,
                [Op.lt]: endOfDay
            }
        }
    });
    
    const sequenceNumber = String(dailyCount + 1).padStart(3, '0');
    
    return `TMVB/${day}/${month}/${year}/${sequenceNumber}`;
}

// API: Get Yoco public key (for frontend)
app.get('/api/payments/public-key', (req, res) => {
    res.json({ publicKey: YOCO_CONFIG.publicKey });
});

// API: Create checkout session
app.post('/api/payments/create-checkout', async (req, res) => {
    try {
        const { amount, currency = 'ZAR', description = 'Payment', metadata = {} } = req.body;

        // Validate amount
        if (!amount || amount < 100) {
            return res.status(400).json({ 
                message: 'Invalid amount. Minimum is R1.00 (100 cents)' 
            });
        }

        // Validate secret key
        if (!YOCO_CONFIG.secretKey) {
            console.error('❌ Yoco secret key not configured');
            return res.status(500).json({ 
                message: 'Payment gateway not configured' 
            });
        }

        console.log('💳 Creating Yoco checkout:', { amount, currency, description });

        // Generate reference number first
        const referenceNumber = await generateReferenceNumber();

        // Get base URL and ensure HTTPS for live mode
        let baseUrl = process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za';
        
        // For live mode, ensure HTTPS is used
        if (USE_LIVE && baseUrl.startsWith('http://') && !baseUrl.includes('https://tmvbusinesssolutions.co.za')) {
            baseUrl = baseUrl.replace('http://', 'https://');
            console.log('🔒 Switched to HTTPS for live mode:', baseUrl);
        }

        // For localhost in test mode, allow HTTP
        if (baseUrl.includes('localhost') && YOCO_MODE !== 'live') {
            console.log('🔧 Using HTTP for localhost development');
        }

        // Prepare checkout payload with webhook URLs
        const checkoutPayload = {
            amount: parseInt(amount),
            currency: currency.toUpperCase(),
            cancelUrl: `${baseUrl}/pages/payment-cancelled.html`,
            successUrl: `${baseUrl}/pages/payment-success.html?reference=${referenceNumber}`,
            failureUrl: `${baseUrl}/pages/payment-failed.html`,
            webhookUrl: `${baseUrl}/api/payments/webhook`,
            metadata: {
                ...metadata,
                userId: req.session.userId || null,
                createdAt: new Date().toISOString(),
                origin: 'tmv_website',
                referenceNumber: referenceNumber
            }
        };

        console.log('📤 Sending to Yoco:', checkoutPayload);

        // Create checkout via Yoco API (using official endpoint)
        const response = await axios.post(
            `${YOCO_CONFIG.baseURL}/api/checkouts`,
            checkoutPayload,
            {
                headers: {
                    'Authorization': `Bearer ${YOCO_CONFIG.secretKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'https://tmvbusinesssolutions.co.za/1.0'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        const checkout = response.data;
        console.log('✅ Yoco checkout created:', checkout.id);

        // Save payment record to database
        const payment = await Payment.create({
            userId: req.session.userId || null,
            checkoutId: checkout.id,
            amount,
            currency,
            description,
            metadata,
            referenceNumber,
            status: 'pending'
        });

        res.json({ 
            success: true,
            checkout,
            payment: {
                id: payment.id,
                status: payment.status,
                referenceNumber: payment.referenceNumber
            }
        });

    } catch (error) {
        // Enhanced error logging for Yoco checkout creation
        console.error('❌ Create checkout error:', {
            message: error.message,
            name: error.name,
            isAxiosError: error.isAxiosError,
            requestPayload: {
                amount: req.body.amount,
                currency: req.body.currency,
                description: req.body.description,
                metadata: req.body.metadata
            },
            yocoError: error.response?.data,
            httpStatus: error.response?.status,
            errorDetails: error.response?.statusText
        });

        // Determine error message for user based on specific Yoco errors
        let userMessage = 'Failed to create checkout';
        let statusCode = 500;

        // Check for specific Yoco error messages
        const yocoErrorMsg = error.response?.data?.description || error.response?.data?.message || '';
        
        if (error.response?.status === 401) {
            userMessage = 'Payment gateway authentication failed';
            console.error('❌ Yoco authentication failed - check secret key');
        } else if (error.response?.status === 400) {
            // Check for HTTP URL error in live mode
            if (yocoErrorMsg.includes('HTTP protocol') || yocoErrorMsg.includes('http://')) {
                userMessage = 'HTTPS required for live payments. Please use a secure connection.';
                console.error('❌ Yoco requires HTTPS URLs for live mode');
            } else {
                userMessage = yocoErrorMsg || 'Invalid payment request';
            }
            statusCode = 400;
        } else if (error.response?.status === 422) {
            userMessage = yocoErrorMsg || 'Invalid payment data';
            statusCode = 422;
        } else if (error.code === 'ECONNREFUSED') {
            userMessage = 'Unable to connect to payment gateway';
        } else if (error.code === 'ETIMEDOUT') {
            userMessage = 'Payment gateway timeout';
        }

        // Ensure we always return valid JSON
        const errorResponse = {
            success: false,
            message: userMessage,
            error: yocoErrorMsg || error.message,
            yocoMode: YOCO_MODE,
            requiresHttps: USE_LIVE
        };

        // Only include debug info in development
        if (process.env.NODE_ENV !== 'production') {
            errorResponse.debug = {
                name: error.name,
                code: error.code,
                isAxiosError: error.isAxiosError,
                requestPayload: {
                    amount: req.body.amount,
                    currency: req.body.currency,
                    description: req.body.description,
                    metadata: req.body.metadata,
                    baseUrl: baseUrl
                },
                yocoResponse: error.response?.data,
                status: error.response?.status
            };
        }

        res.status(statusCode).json(errorResponse);
    }
});

// API: Payment status (frontend expects /api/payments/status/:checkoutId)
app.get('/api/payments/status/:checkoutId', async (req, res) => {
    try {
        const { checkoutId } = req.params;
        if (!checkoutId) {
            return res.status(400).json({ message: 'Missing checkoutId' });
        }

        const payment = await Payment.findOne({
            where: { checkoutId },
            attributes: ['id', 'checkoutId', 'status', 'amount', 'currency', 'referenceNumber', 'yocoPaymentId', 'createdAt']
        });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // If pending or processing and we have a Yoco payment ID, attempt a lightweight verification
        if (['pending', 'processing'].includes(payment.status) && payment.yocoPaymentId) {
            try {
                const verifyResp = await axios.get(
                    `${YOCO_CONFIG.baseURL}/charges/${payment.yocoPaymentId}`,
                    { headers: { 'Authorization': `Bearer ${YOCO_CONFIG.secretKey}` }, timeout: 5000 }
                );
                const remoteStatus = verifyResp.data?.status;
                if (remoteStatus && remoteStatus !== payment.status) {
                    await payment.update({ status: remoteStatus });
                }
            } catch (verifyErr) {
                // Silent fail – keep local status
                console.warn('⚠️ Lightweight Yoco status check failed:', verifyErr.message);
            }
        }

        res.json({
            payment: {
                id: payment.id,
                checkoutId: payment.checkoutId,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                referenceNumber: payment.referenceNumber,
                yocoPaymentId: payment.yocoPaymentId,
                formattedAmount: `${payment.currency} ${(payment.amount / 100).toFixed(2)}`,
                createdAt: payment.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Payment status error:', error.message);
        res.status(500).json({ message: 'Failed to retrieve payment status' });
    }
});

// API: Process payment with token
app.post('/api/payments/process-payment', async (req, res) => {
    try {
        const { checkoutId, token } = req.body;

        if (!checkoutId || !token) {
            return res.status(400).json({ message: 'Missing checkoutId or token' });
        }

        console.log('💳 Processing payment:', { checkoutId, token: token.substring(0, 20) + '...' });

        // Find payment record
        const payment = await Payment.findOne({ where: { checkoutId } });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Update status to processing
        await payment.update({ status: 'processing' });

        // Charge the payment via Yoco API
        const response = await axios.post(
            `${YOCO_CONFIG.baseURL}/charges`,
            {
                token,
                amountInCents: payment.amount,
                currency: payment.currency,
                metadata: payment.metadata
            },
            {
                headers: {
                    'Authorization': `Bearer ${YOCO_CONFIG.secretKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const charge = response.data;
        console.log('✅ Payment charged successfully:', charge.id);

        // Update payment record
        await payment.update({
            status: 'succeeded',
            yocoPaymentId: charge.id,
            paymentMethod: charge.source?.type || 'card'
        });

        // Send confirmation email if user is logged in
        if (req.session.userId) {
            const user = await User.findByPk(req.session.userId);
            if (user && user.email) {
                await sendPaymentConfirmationEmail(user.email, payment);
            }
        }

        res.json({ 
            payment: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                yocoPaymentId: payment.yocoPaymentId
            }
        });

    } catch (error) {
        console.error('❌ Process payment error:', error);
        
        let errorMessage = error.message;
        let errorData = null;
        
        // Handle different types of errors
        if (error.response) {
            // HTTP error response
            errorData = error.response.data;
            errorMessage = error.response.data?.message || error.response.statusText || error.message;
            console.error('HTTP Error Response:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
        } else if (error.request) {
            // Network error
            errorMessage = 'Network error - unable to connect to payment gateway';
            console.error('Network Error:', error.request);
        }
        
        // Update payment status to failed
        if (req.body.checkoutId) {
            try {
                await Payment.update(
                    { 
                        status: 'failed',
                        errorMessage: errorMessage
                    },
                    { where: { checkoutId: req.body.checkoutId } }
                );
            } catch (updateError) {
                console.error('Failed to update payment status:', updateError);
            }
        }

        res.status(500).json({ 
            message: 'Payment processing failed',
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? errorData : undefined
        });
    }
});

// API: Verify payment status
app.get('/api/payments/verify-payment/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // If payment has Yoco payment ID, verify with Yoco
        if (payment.yocoPaymentId) {
            try {
                const response = await axios.get(
                    `${YOCO_CONFIG.baseURL}/charges/${payment.yocoPaymentId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${YOCO_CONFIG.secretKey}`
                        }
                    }
                );

                const charge = response.data;
                
                // Update local status if different
                if (charge.status !== payment.status) {
                    await payment.update({ status: charge.status });
                }
            } catch (error) {
                console.error('❌ Yoco verification error:', error.message);
                // Continue with local status
            }
        }

        res.json({ 
            payment: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                description: payment.description,
                createdAt: payment.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Verify payment error:', error.message);
        res.status(500).json({ message: 'Failed to verify payment' });
    }
});

// API: Get payment details by checkout ID (for success page)
app.get('/api/payments/details/:checkoutId', async (req, res) => {
    try {
        const { checkoutId } = req.params;

        const payment = await Payment.findOne({ 
            where: { checkoutId },
            attributes: ['id', 'amount', 'currency', 'description', 'referenceNumber', 'status', 'createdAt']
        });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ 
            payment: {
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                description: payment.description,
                referenceNumber: payment.referenceNumber,
                status: payment.status,
                createdAt: payment.createdAt,
                formattedAmount: `${payment.currency} ${(payment.amount / 100).toFixed(2)}`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Get payment details error:', error.message);
        res.status(500).json({ message: 'Failed to get payment details' });
    }
});

// API: Get payment details by reference number (for success page with reference)
app.get('/api/payments/reference/:referenceNumber', async (req, res) => {
    try {
        const { referenceNumber } = req.params;

        const payment = await Payment.findOne({ 
            where: { referenceNumber },
            attributes: ['id', 'amount', 'currency', 'description', 'referenceNumber', 'status', 'createdAt', 'checkoutId']
        });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ 
            payment: {
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                description: payment.description,
                referenceNumber: payment.referenceNumber,
                status: payment.status,
                createdAt: payment.createdAt,
                checkoutId: payment.checkoutId,
                formattedAmount: `${payment.currency} ${(payment.amount / 100).toFixed(2)}`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Get payment details by reference error:', error.message);
        res.status(500).json({ message: 'Failed to get payment details' });
    }
});

// API: Send payment receipt email
app.post('/api/payments/send-receipt', async (req, res) => {
    try {
        const { referenceNumber, checkoutId, amount, currency, description, createdAt } = req.body;

        // Find the payment record to get user details
        const payment = await Payment.findOne({ 
            where: { referenceNumber },
            include: [{
                model: User,
                attributes: ['email', 'firstName', 'lastName']
            }]
        });

        let userEmail = null;
        let userName = 'Valued Customer';

        if (payment && payment.User) {
            userEmail = payment.User.email;
            userName = `${payment.User.firstName || ''} ${payment.User.lastName || ''}`.trim() || 'Valued Customer';
        }

        // If no user email found in payment record, try to get from session
        if (!userEmail && req.session.userId) {
            const sessionUser = await User.findByPk(req.session.userId, {
                attributes: ['email', 'firstName', 'lastName']
            });
            if (sessionUser) {
                userEmail = sessionUser.email;
                userName = `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim() || 'Valued Customer';
            }
        }

        // If still no email, use a fallback (we'll still send to leads for record keeping)
        if (!userEmail) {
            console.log('⚠️ No user email found for payment receipt, using fallback');
            userEmail = 'customer@unknown.com'; // This won't actually send, but we'll still process
        }

        // Format amount
        const formattedAmount = `${currency} ${(amount / 100).toFixed(2)}`;
        const paymentDate = new Date(createdAt).toLocaleString();

        // Email content
        const emailSubject = `Payment Receipt - TMV Business Solutions - ${referenceNumber}`;
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #333; margin-bottom: 10px;">Payment Receipt</h1>
                    <h2 style="color: #4CAF50; margin: 0;">TMV Business Solutions</h2>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">Dear ${userName},</h3>
                    <p style="color: #666; line-height: 1.6;">
                        Thank you for your payment! This email serves as your official receipt for the transaction below.
                    </p>
                </div>

                <div style="background-color: #fff; border: 1px solid #eee; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Reference Number:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${referenceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Payment ID:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${checkoutId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Amount Paid:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #4CAF50; font-weight: bold;">${formattedAmount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${description || 'Service Payment'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Date & Time:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${paymentDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0; color: #4CAF50; font-weight: bold;">✓ Completed</td>
                        </tr>
                    </table>
                </div>

                <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h4 style="color: #333; margin-top: 0;">What happens next?</h4>
                    <ul style="color: #666; line-height: 1.6;">
                        <li>Your order will be processed within 1-2 business days</li>
                        <li>Our team will contact you with next steps if required</li>
                        <li>Keep this receipt for your records</li>
                    </ul>
                </div>

                <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p>TMV Business Solutions<br>
                    Email: leads@tmvbusinesssolutions.co.za<br>
                    This is an automated email. Please do not reply directly to this message.</p>
                </div>
            </div>
        `;

        // Send email to customer (if we have a valid email)
        if (userEmail && userEmail !== 'customer@unknown.com') {
            try {
                await transporter.sendMail({
                    from: '"TMV Business Solutions" <leads@tmvbusinesssolutions.co.za>',
                    to: userEmail,
                    subject: emailSubject,
                    html: emailContent
                });
                console.log(`✅ Payment receipt sent to: ${userEmail}`);
            } catch (emailError) {
                console.error('❌ Failed to send receipt to customer:', emailError.message);
            }
        }

        // Always send a copy to leads for record keeping
        try {
            await transporter.sendMail({
                from: '"TMV Business Solutions" <leads@tmvbusinesssolutions.co.za>',
                to: 'leads@tmvbusinesssolutions.co.za',
                subject: `Payment Receipt Copy - ${referenceNumber}`,
                html: emailContent.replace('Dear ' + userName, 'Payment Receipt Copy for ' + (userEmail || 'Unknown Customer'))
            });
            console.log('✅ Payment receipt copy sent to leads');
        } catch (emailError) {
            console.error('❌ Failed to send receipt copy to leads:', emailError.message);
        }

        res.json({ 
            message: 'Receipt sent successfully',
            emailSent: userEmail && userEmail !== 'customer@unknown.com'
        });

    } catch (error) {
        console.error('❌ Send receipt error:', error.message);
        res.status(500).json({ message: 'Failed to send receipt' });
    }
});

// API: Get payment history (for logged-in users)
app.get('/api/payments/history', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const payments = await Payment.findAll({
            where: { userId: req.session.userId },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json({ payments });

    } catch (error) {
        console.error('❌ Get payment history error:', error.message);
        res.status(500).json({ message: 'Failed to retrieve payment history' });
    }
});

// API: Webhook endpoint for Yoco (to receive payment notifications)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const event = req.body;
        console.log('🔔 Yoco webhook received:', event.type);

        // Handle different event types
        switch (event.type) {
            case 'checkout.completed':
                await handleCheckoutCompleted(event.data);
                break;
            case 'payment.succeeded':
                await handlePaymentSucceeded(event.data);
                break;
            case 'payment.failed':
                await handlePaymentFailed(event.data);
                break;
            case 'refund.succeeded':
                await handleRefundSucceeded(event.data);
                break;
            default:
                console.log('⚠️ Unhandled webhook event type:', event.type);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Webhook handlers
async function handleCheckoutCompleted(data) {
    try {
        const payment = await Payment.findOne({ 
            where: { checkoutId: data.id } 
        });

        if (payment && payment.status !== 'succeeded') {
            await payment.update({ 
                status: 'succeeded',
                yocoPaymentId: data.payment?.id || null
            });
            console.log('✅ Payment status updated to succeeded via checkout:', payment.id);
        }
    } catch (error) {
        console.error('❌ Handle checkout completed error:', error.message);
    }
}

async function handlePaymentSucceeded(data) {
    try {
        const payment = await Payment.findOne({ 
            where: { yocoPaymentId: data.id } 
        });

        if (payment && payment.status !== 'succeeded') {
            await payment.update({ status: 'succeeded' });
            console.log('✅ Payment status updated to succeeded:', payment.id);
        }
    } catch (error) {
        console.error('❌ Handle payment succeeded error:', error.message);
    }
}

async function handlePaymentFailed(data) {
    try {
        const payment = await Payment.findOne({ 
            where: { yocoPaymentId: data.id } 
        });

        if (payment) {
            await payment.update({ 
                status: 'failed',
                errorMessage: data.failureReason || 'Payment failed'
            });
            console.log('❌ Payment status updated to failed:', payment.id);
        }
    } catch (error) {
        console.error('❌ Handle payment failed error:', error.message);
    }
}

async function handleRefundSucceeded(data) {
    try {
        const payment = await Payment.findOne({ 
            where: { yocoPaymentId: data.paymentId } 
        });

        if (payment) {
            await payment.update({ 
                status: 'refunded',
                refundedAt: new Date()
            });
            console.log('💸 Payment refunded:', payment.id);
        }
    } catch (error) {
        console.error('❌ Handle refund succeeded error:', error.message);
    }
}

// Email helper for payment confirmations
async function sendPaymentConfirmationEmail(email, payment) {
    const amountDisplay = (payment.amount / 100).toFixed(2);
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .payment-box { background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; }
                .amount { font-size: 32px; font-weight: bold; color: #10b981; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Payment Confirmation</h1>
                </div>
                <div class="content">
                    <p>Thank you for your payment!</p>
                    
                    <div class="payment-box">
                        <p style="margin: 0 0 10px 0; color: #666;">Amount Paid</p>
                        <div class="amount">R ${amountDisplay}</div>
                        <p style="margin: 10px 0 0 0; color: #666;">Payment ID: ${payment.id}</p>
                        <p style="margin: 5px 0 0 0; color: #666;">Date: ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <p>${payment.description || 'Payment processed successfully'}</p>
                    
                    <p>If you have any questions about this payment, please contact us at:</p>
                    <p><strong>Email:</strong> info@tmvbusinesssolutions.co.za<br>
                    <strong>Phone:</strong> +27 XX XXX XXXX</p>
                    
                    <div class="footer">
                        <p>This is an automated email from TMV Business Solutions.<br>
                        Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const emailResult = await sendEmail(email, 'Payment Confirmation - TMV Business Solutions', html, 'general');
    if (emailResult && emailResult.success) {
        console.log(`✅ Payment confirmation email sent to ${email}`);
    } else {
        console.error(`❌ Failed to send payment confirmation email:`, emailResult ? emailResult.error : 'Unknown error');
    }
}

console.log('✅ Yoco Payment API endpoints loaded');

// ==========================================
// Company Registration Endpoint
// ==========================================

app.post('/api/company-registrations', async (req, res) => {
    try {
        const {
            paymentId,
            companyName,
            registrationNumber,
            industry,
            vatNumber,
            contactPerson,
            email,
            phone,
            physicalAddress,
            postalAddress,
            bbbeeLevel,
            selectedServices,
            directors,
            totalAmount
        } = req.body;

        console.log(`📝 Processing company registration for: ${companyName}`);

        // Validate required fields
        if (!paymentId || !companyName || !email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: paymentId, companyName, or email'
            });
        }

        // Verify payment exists and is successful
        const payment = await Payment.findOne({ where: { id: paymentId } });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: 'Payment has not been completed successfully'
            });
        }

        // Create CompanyRegistration model if it doesn't exist
        const CompanyRegistration = db.define('company_registration', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            paymentId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'payments',
                    key: 'id'
                }
            },
            companyName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            registrationNumber: DataTypes.STRING,
            industry: DataTypes.STRING,
            vatNumber: DataTypes.STRING,
            contactPerson: DataTypes.STRING,
            email: {
                type: DataTypes.STRING,
                allowNull: false
            },
            phone: DataTypes.STRING,
            physicalAddress: DataTypes.TEXT,
            postalAddress: DataTypes.TEXT,
            bbbeeLevel: DataTypes.STRING,
            selectedServices: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            directors: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            totalAmount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM('pending', 'processing', 'completed', 'archived'),
                defaultValue: 'pending'
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            updatedAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        }, {
            timestamps: true,
            tableName: 'company_registrations'
        });

        // Sync the model (create table if it doesn't exist)
        await CompanyRegistration.sync();

        // Create the registration record
        const registration = await CompanyRegistration.create({
            paymentId,
            companyName,
            registrationNumber,
            industry,
            vatNumber,
            contactPerson,
            email,
            phone,
            physicalAddress,
            postalAddress,
            bbbeeLevel,
            selectedServices: selectedServices || [],
            directors: directors || [],
            totalAmount,
            status: 'pending'
        });

        console.log(`✅ Company registration created with ID: ${registration.id}`);

        // Send confirmation email
        await sendCompanyRegistrationEmail(email, {
            companyName,
            registrationNumber: registration.id,
            services: selectedServices,
            amount: totalAmount,
            paymentId
        });

        res.json({
            success: true,
            message: 'Company registration saved successfully',
            registrationId: registration.id,
            companyName: registration.companyName
        });

    } catch (error) {
        console.error('❌ Company registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save company registration',
            error: error.message
        });
    }
});

// Email function for company registration confirmation
async function sendCompanyRegistrationEmail(email, data) {
    const { companyName, registrationNumber, services, amount, paymentId } = data;
    
    const servicesList = services && services.length > 0 
        ? services.map(s => `<li>${s}</li>`).join('') 
        : '<li>No services selected</li>';
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 4px; }
                .services-list { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                h1 { margin: 0; font-size: 28px; }
                h2 { color: #667eea; margin-top: 0; }
                .highlight { color: #667eea; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Registration Confirmed!</h1>
                </div>
                <div class="content">
                    <h2>Thank You for Registering with TMV Business Solutions</h2>
                    <p>Dear ${companyName} Team,</p>
                    <p>We've successfully received your company registration and payment. Your registration is now being processed by our team.</p>
                    
                    <div class="info-box">
                        <h3>Registration Details</h3>
                        <p><strong>Registration Number:</strong> <span class="highlight">#${registrationNumber}</span></p>
                        <p><strong>Company Name:</strong> ${companyName}</p>
                        <p><strong>Payment ID:</strong> ${paymentId}</p>
                        <p><strong>Amount Paid:</strong> R${amount.toFixed(2)}</p>
                    </div>
                    
                    <div class="services-list">
                        <h3>Selected Services</h3>
                        <ul>${servicesList}</ul>
                    </div>
                    
                    <div class="info-box">
                        <h3>What's Next?</h3>
                        <ol>
                            <li>Our team will review your registration within 1-2 business days</li>
                            <li>We'll contact you at ${email} with next steps</li>
                            <li>You'll receive access to your client portal once approved</li>
                            <li>We'll schedule an onboarding call to discuss your services</li>
                        </ol>
                    </div>
                    
                    <p><strong>Need Help?</strong><br>
                    Contact us at: <a href="mailto:info@tmvbusinesssolutions.com">info@tmvbusinesssolutions.com</a><br>
                    Phone: +27 11 234 5678</p>
                </div>
                <div class="footer">
                    <p>This is an automated email from TMV Business Solutions.<br>
                    Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const emailResult = await sendEmail(email, `Company Registration Confirmed - #${registrationNumber}`, html, 'general');
    if (emailResult && emailResult.success) {
        console.log(`✅ Company registration confirmation email sent to ${email}`);
    } else {
        console.error(`❌ Failed to send company registration email:`, emailResult ? emailResult.error : 'Unknown error');
    }
}

console.log('✅ Company Registration API endpoint loaded');

// ==========================================
// Express Error Handling Middleware
// Catch all errors in routes and prevent crashes
// ==========================================

// Global error handler for all routes - MUST be defined after all routes
app.use((err, req, res, next) => {
    console.error('💥 EXPRESS ERROR CAUGHT:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Stack trace:', err.stack);
    console.error('Request URL:', req.url);
    console.error('Request method:', req.method);
    console.error('Timestamp:', new Date().toISOString());
    console.error('---');
    
    // Send error response
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        timestamp: new Date().toISOString()
    });
});

// 404 handler - must be after all other routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        timestamp: new Date().toISOString()
    });
});

console.log('✅ Express error handlers initialized');

// Initialize database and start server
async function startServer() {
    try {
        // Try to connect to database, but don't fail if it's unavailable
        const dbConnected = await testConnection();
        
        if (dbConnected) {
            // Sync Database - Using 'force: false' to avoid altering existing tables
            // This prevents the "Too many keys" error when tables already exist
            console.log('🔄 Synchronizing database schema...');
            await sequelize.sync({ alter: false });
            console.log('✅ Database & tables synchronized!');
        } else {
            console.warn('⚠️ Skipping database sync - database not available');
            console.warn('⚠️ Server will start, but database-dependent features will be unavailable');
        }
        
        // Only run migrations if database is connected
        if (dbConnected) {
            // Add checklist column to tasks table if it doesn't exist
            try {
                console.log('🔄 Checking for checklist column in tasks table...');
                await sequelize.query(`
                    ALTER TABLE tasks 
                    ADD COLUMN checklist JSON DEFAULT NULL 
                    COMMENT 'Checklist items for task completion'
                `);
                console.log('✅ checklist column added to tasks table');
            } catch (error) {
                if (error.message && (error.message.includes('Duplicate column') || error.message.includes('duplicate'))) {
                    console.log('  - checklist column already exists');
                } else {
                    console.log('  ⚠ checklist column error:', error.message.substring(0, 80));
                }
            }
            
            // Run migration to update users.role ENUM
            await migrateRoleEnum();
            console.log('✅ Role ENUM migration complete!');
            
            // Run migration to update permissions for existing users
            console.log('🔄 Running permission columns migration...');
            await migratePermissionColumns();
            console.log('✅ Permission columns migration complete!');
            
            // Run migration for industry → department column
            console.log('🔄 Migrating industry → department column...');
            await migrateDepartmentColumn();
            console.log('✅ Department column migration complete!');
            
            // Run migration for approvalStatus column
            console.log('🔄 Migrating approvalStatus column...');
            await migrateApprovalStatus();
            console.log('✅ approvalStatus column migration complete!');
            
            // Run migration for referenceNumber column in payments table
            console.log('🔄 Migrating referenceNumber column in payments table...');
            await migrateReferenceNumberColumn();
            console.log('✅ referenceNumber column migration complete!');
        } else {
            console.warn('⚠️ Skipping database migrations - database not available');
        }
        
        // Start Server and keep reference
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Server also accessible on http://127.0.0.1:${PORT}`);
            console.log(`API endpoints:`);
            console.log(`- POST /api/auth/register - Register new user`);
            console.log(`- POST /api/auth/login - Login user`);
            console.log(`- POST /api/auth/logout - Logout user`);
            console.log(`- GET /api/auth/me - Get current user`);
            console.log(`- GET /api/profile - Get user profile (protected)`);
            console.log(`- POST /api/quote-request - Submit quote request`);
            console.log(`- POST /api/booking - Submit service booking`);
            console.log(`- GET /api/test - Test server connection`);
            console.log(`- GET /api/test-email - Test email configuration`);
            console.log(`\n📧 Email notifications enabled for:`);
            console.log(`- New user registrations → leads@tmvbusinesssolutions.co.za`);
            console.log(`- Quote requests → leads@tmvbusinesssolutions.co.za`);
            console.log(`- Service bookings → leads@tmvbusinesssolutions.co.za`);
        }).on('error', (err) => {
            console.error('Server failed to start:', err);
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Try a different port or kill the process using port ${PORT}`);
            }
            // Don't exit the process automatically - allow operator to inspect and restart
            // Optionally implement a retry/backoff here if desired
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        // Don't exit the process on startup error - log and leave process running for inspection
        // If the error is non-recoverable, consider restarting from an external supervisor (PM2/systemd)
    }
}

// Export models for use in other files
module.exports = { sequelize, User, Job, EmployerProfile, JobApplication, JobseekerProfile, Cart, CompanyRegistration, isAuthenticated };

// Start server with retry/backoff - keeps process alive if startup temporarily fails
async function startWithRetry(maxAttempts = 5, initialDelayMs = 1000) {
    let attempt = 0;
    let delay = initialDelayMs;
    while (attempt < maxAttempts) {
        try {
            attempt++;
            console.log(`Starting server - attempt ${attempt}/${maxAttempts}`);
            await startServer();
            console.log('Server started successfully');
            return;
        } catch (err) {
            console.error(`startServer attempt ${attempt} failed:`, err && err.stack ? err.stack : err);
            if (attempt >= maxAttempts) {
                console.error('Exceeded maximum start attempts. Server not started. Please inspect logs.');
                // Do not exit - keep the process alive for inspection and manual restart
                return;
            }
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            delay = Math.min(delay * 2, 30000); // exponential backoff, cap at 30s
        }
    }
}

startWithRetry().catch(err => {
    console.error('Unexpected error in startWithRetry:', err);
});



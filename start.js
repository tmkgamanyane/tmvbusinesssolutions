#!/usr/bin/env node
/**
 * TMV Business Solutions - Production Server Start Script
 * This script ensures proper environment setup for production deployment
 */

const path = require('path');
const fs = require('fs');

// Ensure we're using production environment
process.env.NODE_ENV = 'production';

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found! Please create .env file with production configuration.');
    process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
    'DB_HOST',
    'DB_USER', 
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

console.log('🚀 Starting TMV Business Solutions in production mode...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('🌐 Domain:', process.env.CLIENT_URL || 'https://tmvbusinesssolutions.co.za');
console.log('🗄️  Database:', process.env.DB_NAME);
console.log('📧 Email:', process.env.EMAIL_USER);

// Start the main server
require('./server.js');
// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // your MySQL connection pool
const router = express.Router();

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ------------------------- REGISTER -------------------------
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, error: "Passwords do not match" });
        }

        // check if user already exists
        const [user] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (user.length > 0) {
            return res.status(400).json({ success: false, error: "Email already registered" });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // insert into db
        await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
            name,
            email,
            hashedPassword,
        ]);

        res.json({ success: true, message: "Registration successful" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// ------------------------- LOGIN -------------------------
router.post("/login", async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password required" });
        }

        // check user
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }

        const user = rows[0];

        // compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }

        // Set token expiry based on remember me
        const expiresIn = rememberMe ? "30d" : "1h";
        
        // generate token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn });

        res.json({ 
            success: true, 
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || `${user.first_name} ${user.last_name}`,
                role: user.role
            },
            expiresIn: rememberMe ? "30 days" : "1 hour"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// ------------------------- CHECK AUTH -------------------------
router.get("/check", (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, error: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: "Invalid token" });
        res.json({ success: true, user });
    });
});

// ------------------------- FORGOT PASSWORD -------------------------
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        // Check if user exists
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) {
            // Don't reveal if email exists or not for security
            return res.json({ 
                success: true, 
                message: "If an account with that email exists, you will receive a password reset link shortly." 
            });
        }
        
        const user = rows[0];
        
        // Generate reset token
        const resetToken = jwt.sign(
            { id: user.id, email: user.email, type: 'password_reset' }, 
            JWT_SECRET, 
            { expiresIn: "1h" }
        );
        
        // Store reset token in database (you might want to create a password_reset_tokens table)
        await db.query(
            "UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?",
            [resetToken, user.id]
        );
        
        // In production, send email here
        // For now, we'll just return success
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset URL would be: ${process.env.CLIENT_URL}/reset-password?token=${resetToken}`);
        
        res.json({ 
            success: true, 
            message: "Password reset email sent! Check your inbox for further instructions.",
            // In development, include token for testing
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });
        
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
});

// ------------------------- RESET PASSWORD -------------------------
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }
        
        // Verify reset token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.type !== 'password_reset') {
                throw new Error('Invalid token type');
            }
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }
        
        // Check if token is still valid in database
        const [rows] = await db.query(
            "SELECT * FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > NOW()",
            [decoded.id, token]
        );
        
        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and clear reset token
        await db.query(
            "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
            [hashedPassword, decoded.id]
        );
        
        res.json({ success: true, message: "Password reset successfully! You can now login with your new password." });
        
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
});

module.exports = router;

const response = await fetch('https://tmvbusinesssolutions.co.za/api/auth/me', {
    credentials: 'include'
});
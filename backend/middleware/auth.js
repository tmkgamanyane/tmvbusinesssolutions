// ============================================
// CENTRALIZED AUTHENTICATION MIDDLEWARE
// ============================================
// Purpose: Validate user access across all dashboards
// Checks: User exists, account active, role matches, profile exists

const checkUserExists = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ 
                message: 'Unauthorized - Please login first',
                code: 'NO_SESSION'
            });
        }

        const { User, EmployerProfile, JobseekerProfile } = req.app.get('models');
        
        // Fetch user from database
        const user = await User.findByPk(req.session.userId);
        
        // Check if user still exists (admin might have deleted)
        if (!user) {
            req.session.destroy();
            return res.status(401).json({ 
                message: 'Account not found. Your account may have been removed by admin.',
                code: 'USER_DELETED',
                redirectTo: '/pages/login_employer.html'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            req.session.destroy();
            return res.status(403).json({ 
                message: 'Account deactivated. Please contact administrator.',
                code: 'ACCOUNT_INACTIVE',
                redirectTo: '/pages/login_employer.html'
            });
        }

        // Attach user to request for use in route handlers
        req.currentUser = user;
        next();
        
    } catch (error) {
        console.error('❌ Auth middleware error:', error);
        res.status(500).json({ message: 'Authentication check failed' });
    }
};

const requireEmployer = async (req, res, next) => {
    try {
        // First check user exists and is active
        if (!req.currentUser) {
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'NO_USER'
            });
        }

        // Check role
        if (req.currentUser.role !== 'employer' && req.currentUser.role !== 'management') {
            return res.status(403).json({ 
                message: 'Access denied - Employer account required',
                code: 'INVALID_ROLE'
            });
        }

        // Fetch employer profile
        const { EmployerProfile } = req.app.get('models');
        const profile = await EmployerProfile.findOne({ 
            where: { userId: req.currentUser.id } 
        });

        if (!profile) {
            return res.status(403).json({ 
                message: 'Employer profile not found. Please contact administrator.',
                code: 'NO_PROFILE'
            });
        }

        // Attach profile to request
        req.employerProfile = profile;
        req.session.userType = 'employer';
        
        next();
        
    } catch (error) {
        console.error('❌ Employer auth error:', error);
        res.status(500).json({ message: 'Authorization check failed' });
    }
};

const requireManager = async (req, res, next) => {
    try {
        // First check user exists and is active
        if (!req.currentUser) {
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'NO_USER'
            });
        }

        // Check if user role is management
        if (req.currentUser.role !== 'management') {
            return res.status(403).json({ 
                message: 'Access denied - Management account required',
                code: 'NOT_MANAGER',
                debug: {
                    userId: req.currentUser.id,
                    currentRole: req.currentUser.role,
                    requiredRole: 'management'
                }
            });
        }

        // Fetch employer profile (managers have employer profiles too)
        const { EmployerProfile } = req.app.get('models');
        const profile = await EmployerProfile.findOne({ 
            where: { userId: req.currentUser.id } 
        });

        if (!profile) {
            return res.status(403).json({ 
                message: 'Management profile not found. Please contact administrator.',
                code: 'NO_PROFILE'
            });
        }

        // Verify profile role matches
        if (profile.role !== 'management') {
            return res.status(403).json({ 
                message: 'Profile role mismatch. Please contact administrator.',
                code: 'ROLE_MISMATCH',
                debug: {
                    userRole: req.currentUser.role,
                    profileRole: profile.role
                }
            });
        }

        // Attach to request
        req.managerId = req.currentUser.id;
        req.managerProfile = profile;
        req.session.userType = 'employer';
        
        next();
        
    } catch (error) {
        console.error('❌ Manager auth error:', error);
        res.status(500).json({ message: 'Authorization check failed' });
    }
};

const requireJobseeker = async (req, res, next) => {
    try {
        // First check user exists and is active
        if (!req.currentUser) {
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'NO_USER'
            });
        }

        // Check role
        if (req.currentUser.role !== 'jobseeker') {
            return res.status(403).json({ 
                message: 'Access denied - Jobseeker account required',
                code: 'INVALID_ROLE'
            });
        }

        // Fetch jobseeker profile
        const { JobseekerProfile } = req.app.get('models');
        const profile = await JobseekerProfile.findOne({ 
            where: { userId: req.currentUser.id } 
        });

        if (!profile) {
            return res.status(403).json({ 
                message: 'Jobseeker profile not found. Please contact administrator.',
                code: 'NO_PROFILE'
            });
        }

        // Attach profile to request
        req.jobseekerProfile = profile;
        req.session.userType = 'jobseeker';
        
        next();
        
    } catch (error) {
        console.error('❌ Jobseeker auth error:', error);
        res.status(500).json({ message: 'Authorization check failed' });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        // First check user exists and is active
        if (!req.currentUser) {
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'NO_USER'
            });
        }

        // Check if user is admin
        if (req.currentUser.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Access denied - Administrator account required',
                code: 'NOT_ADMIN'
            });
        }

        next();
        
    } catch (error) {
        console.error('❌ Admin auth error:', error);
        res.status(500).json({ message: 'Authorization check failed' });
    }
};

module.exports = {
    checkUserExists,
    requireEmployer,
    requireManager,
    requireJobseeker,
    requireAdmin
};
function createTables() {
    // Client Users Table
    const clientUsersTable = `
        CREATE TABLE IF NOT EXISTS client_users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            company_name VARCHAR(255),
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Jobseeker Users Table
    const jobseekerUsersTable = `
        CREATE TABLE IF NOT EXISTS jobseeker_users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Jobseeker Profile Table
    const jobseekerProfileTable = `
        CREATE TABLE IF NOT EXISTS jobseeker_profiles (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            id_passport_no VARCHAR(50) UNIQUE NOT NULL,
            date_of_birth DATE,
            address TEXT,
            current_location VARCHAR(255),
            highest_qualification VARCHAR(255),
            field_of_study VARCHAR(255),
            institution_name VARCHAR(255),
            graduation_year YEAR,
            years_of_experience INT,
            current_salary DECIMAL(10,2),
            expected_salary DECIMAL(10,2),
            notice_period VARCHAR(50),
            cv_url VARCHAR(255),
            profile_picture_url VARCHAR(255),
            linkedin_url VARCHAR(255),
            portfolio_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES jobseeker_users(id) ON DELETE CASCADE
        )
    `;

    // Work Experience Table
    const workExperienceTable = `
        CREATE TABLE IF NOT EXISTS work_experience (
            id INT PRIMARY KEY AUTO_INCREMENT,
            profile_id INT NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            job_title VARCHAR(255) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            current_job BOOLEAN DEFAULT FALSE,
            responsibilities TEXT,
            achievements TEXT,
            FOREIGN KEY (profile_id) REFERENCES jobseeker_profiles(id) ON DELETE CASCADE
        )
    `;

    // Skills Table
    const skillsTable = `
        CREATE TABLE IF NOT EXISTS skills (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    `;

    // Jobseeker Skills Table (Many-to-Many relationship)
    const jobseekerSkillsTable = `
        CREATE TABLE IF NOT EXISTS jobseeker_skills (
            profile_id INT NOT NULL,
            skill_id INT NOT NULL,
            proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert'),
            PRIMARY KEY (profile_id, skill_id),
            FOREIGN KEY (profile_id) REFERENCES jobseeker_profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        )
    `;

    // Job Postings Table
    const jobPostingsTable = `
        CREATE TABLE IF NOT EXISTS job_postings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employer_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            department VARCHAR(255),
            location VARCHAR(255),
            job_type ENUM('Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'),
            experience_required INT,
            salary_min DECIMAL(10,2),
            salary_max DECIMAL(10,2),
            description TEXT,
            requirements TEXT,
            responsibilities TEXT,
            benefits TEXT,
            posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closing_date DATE,
            status ENUM('Draft', 'Published', 'Closed') DEFAULT 'Draft',
            FOREIGN KEY (employer_id) REFERENCES client_users(id) ON DELETE CASCADE
        )
    `;

    // Job Applications Table
    const jobApplicationsTable = `
        CREATE TABLE IF NOT EXISTS job_applications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            job_id INT NOT NULL,
            jobseeker_id INT NOT NULL,
            application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cover_letter TEXT,
            status ENUM('Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Offered', 'Rejected') DEFAULT 'Pending',
            FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
            FOREIGN KEY (jobseeker_id) REFERENCES jobseeker_users(id) ON DELETE CASCADE
        )
    `;

    // Cart Table
    const cartTable = `
        CREATE TABLE IF NOT EXISTS cart (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            service_id INT NOT NULL,
            quantity INT DEFAULT 1,
            price DECIMAL(10,2) NOT NULL,
            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES client_users(id) ON DELETE CASCADE
        )
    `;

    // Services Table
    const servicesTable = `
        CREATE TABLE IF NOT EXISTS services (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(255),
            status ENUM('Active', 'Inactive') DEFAULT 'Active'
        )
    `;

    // Orders Table
    const ordersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_amount DECIMAL(10,2) NOT NULL,
            status ENUM('Pending', 'Paid', 'Completed', 'Cancelled') DEFAULT 'Pending',
            payment_method VARCHAR(50),
            payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
            FOREIGN KEY (user_id) REFERENCES client_users(id) ON DELETE CASCADE
        )
    `;

    // Order Items Table
    const orderItemsTable = `
        CREATE TABLE IF NOT EXISTS order_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_id INT NOT NULL,
            service_id INT NOT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            vat DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        )
    `;

    // Execute all table creation queries
    const tables = [
        clientUsersTable,
        jobseekerUsersTable,
        jobseekerProfileTable,
        workExperienceTable,
        skillsTable,
        jobseekerSkillsTable,
        jobPostingsTable,
        jobApplicationsTable,
        cartTable,
        servicesTable,
        ordersTable,
        orderItemsTable
    ];

    tables.forEach(tableQuery => {
        db.query(tableQuery, (err) => {
            if (err) {
                console.error('Error creating table:', err);
                return;
            }
        });
    });
}
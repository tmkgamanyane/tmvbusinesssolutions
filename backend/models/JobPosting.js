const { query, pool } = require('../database/connection');

class JobPosting {
    static async create(jobData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert main job data
            const jobSql = `
                INSERT INTO job_postings (
                    employer_id,
                    title,
                    description,
                    category,
                    status
                ) VALUES (?, ?, ?, ?, ?)
            `;

            const [jobResult] = await connection.execute(jobSql, [
                jobData.employerId,
                jobData.title,
                jobData.description,
                jobData.category,
                jobData.status || 'active'
            ]);

            const jobId = jobResult.insertId;

            // Insert requirements
            if (jobData.requirements?.length > 0) {
                const reqSql = `
                    INSERT INTO job_requirements (job_id, requirement)
                    VALUES ?
                `;
                const reqValues = jobData.requirements.map(req => [jobId, req]);
                await connection.query(reqSql, [reqValues]);
            }

            await connection.commit();
            return this.getById(jobId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const sql = `
            SELECT j.*,
                   GROUP_CONCAT(DISTINCT jr.requirement) as requirements,
                   COUNT(DISTINCT ja.id) as total_applicants,
                   SUM(CASE WHEN ja.status = 'shortlisted' THEN 1 ELSE 0 END) as shortlisted,
                   SUM(CASE WHEN ja.status = 'declined' THEN 1 ELSE 0 END) as declined,
                   SUM(CASE WHEN ja.status = 'invited' THEN 1 ELSE 0 END) as invited,
                   SUM(CASE WHEN ja.status = 'interviewed' THEN 1 ELSE 0 END) as interviewed
            FROM job_postings j
            LEFT JOIN job_requirements jr ON j.id = jr.job_id
            LEFT JOIN job_applications ja ON j.id = ja.job_id
            WHERE j.id = ?
            GROUP BY j.id
        `;

        const jobs = await query(sql, [id]);
        if (jobs.length === 0) return null;

        const job = jobs[0];
        return {
            id: job.id,
            employerId: job.employer_id,
            title: job.title,
            description: job.description,
            requirements: job.requirements ? job.requirements.split(',') : [],
            category: job.category,
            status: job.status,
            statistics: {
                totalApplicants: parseInt(job.total_applicants) || 0,
                shortlisted: parseInt(job.shortlisted) || 0,
                declined: parseInt(job.declined) || 0,
                invited: parseInt(job.invited) || 0,
                interviewed: parseInt(job.interviewed) || 0
            },
            createdAt: job.created_at,
            updatedAt: job.updated_at
        };
    }

    static async update(id, updateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const updateSql = `
                UPDATE job_postings
                SET title = ?,
                    description = ?,
                    category = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await connection.execute(updateSql, [
                updateData.title,
                updateData.description,
                updateData.category,
                updateData.status,
                id
            ]);

            // Update requirements
            if (updateData.requirements) {
                await connection.execute('DELETE FROM job_requirements WHERE job_id = ?', [id]);
                if (updateData.requirements.length > 0) {
                    const reqSql = `
                        INSERT INTO job_requirements (job_id, requirement)
                        VALUES ?
                    `;
                    const reqValues = updateData.requirements.map(req => [id, req]);
                    await connection.query(reqSql, [reqValues]);
                }
            }

            await connection.commit();
            return this.getById(id);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        return query('DELETE FROM job_postings WHERE id = ?', [id]);
    }

    static async getAll(filters = {}) {
        let sql = `
            SELECT j.*,
                   GROUP_CONCAT(DISTINCT jr.requirement) as requirements,
                   COUNT(DISTINCT ja.id) as total_applicants,
                   SUM(CASE WHEN ja.status = 'shortlisted' THEN 1 ELSE 0 END) as shortlisted,
                   SUM(CASE WHEN ja.status = 'declined' THEN 1 ELSE 0 END) as declined,
                   SUM(CASE WHEN ja.status = 'invited' THEN 1 ELSE 0 END) as invited,
                   SUM(CASE WHEN ja.status = 'interviewed' THEN 1 ELSE 0 END) as interviewed
            FROM job_postings j
            LEFT JOIN job_requirements jr ON j.id = jr.job_id
            LEFT JOIN job_applications ja ON j.id = ja.job_id
        `;

        const whereConditions = [];
        const params = [];

        if (filters.employerId) {
            whereConditions.push('j.employer_id = ?');
            params.push(filters.employerId);
        }

        if (filters.status) {
            whereConditions.push('j.status = ?');
            params.push(filters.status);
        }

        if (filters.category) {
            whereConditions.push('j.category = ?');
            params.push(filters.category);
        }

        if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
        }

        sql += ' GROUP BY j.id ORDER BY j.created_at DESC';

        const jobs = await query(sql, params);
        return jobs.map(job => ({
            id: job.id,
            employerId: job.employer_id,
            title: job.title,
            description: job.description,
            requirements: job.requirements ? job.requirements.split(',') : [],
            category: job.category,
            status: job.status,
            statistics: {
                totalApplicants: parseInt(job.total_applicants) || 0,
                shortlisted: parseInt(job.shortlisted) || 0,
                declined: parseInt(job.declined) || 0,
                invited: parseInt(job.invited) || 0,
                interviewed: parseInt(job.interviewed) || 0
            },
            createdAt: job.created_at,
            updatedAt: job.updated_at
        }));
    }

    static async addApplicant(jobId, jobSeekerId) {
        const sql = `
            INSERT INTO job_applications (job_id, job_seeker_id, status)
            VALUES (?, ?, 'applied')
        `;
        return query(sql, [jobId, jobSeekerId]);
    }

    static async updateApplicantStatus(jobId, jobSeekerId, status) {
        const sql = `
            UPDATE job_applications
            SET status = ?
            WHERE job_id = ? AND job_seeker_id = ?
        `;
        return query(sql, [status, jobId, jobSeekerId]);
    }

    static async getApplicants(jobId) {
        const sql = `
            SELECT ja.*, js.name, js.email
            FROM job_applications ja
            JOIN job_seekers js ON ja.job_seeker_id = js.id
            WHERE ja.job_id = ?
            ORDER BY ja.applied_date DESC
        `;
        return query(sql, [jobId]);
    }
}

module.exports = JobPosting;
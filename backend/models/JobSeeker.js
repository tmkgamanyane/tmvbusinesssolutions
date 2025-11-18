const { query, pool } = require('../database/connection');

class JobSeeker {
    static async create(seekerData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert main job seeker data
            const seekerSql = `
                INSERT INTO job_seekers (
                    first_name,
                    last_name,
                    id_number,
                    cell_phone,
                    email,
                    address,
                    age,
                    qualification,
                    institute_name,
                    post_applied_for,
                    experience_years,
                    cv_path,
                    id_copy_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [seekerResult] = await connection.execute(seekerSql, [
                seekerData.firstName,
                seekerData.lastName,
                seekerData.idNumber,
                seekerData.cellPhone,
                seekerData.email,
                seekerData.address,
                seekerData.age,
                seekerData.qualification,
                seekerData.instituteName,
                seekerData.postAppliedFor,
                seekerData.experienceYears,
                seekerData.attachments?.cv,
                seekerData.attachments?.idCopy
            ]);

            const seekerId = seekerResult.insertId;

            // Insert references
            if (seekerData.references?.length > 0) {
                const refSql = `
                    INSERT INTO seeker_references (
                        seeker_id,
                        ref_name,
                        ref_contact,
                        ref_relationship
                    ) VALUES ?
                `;
                const refValues = seekerData.references.map(ref => [
                    seekerId,
                    ref.name,
                    ref.contact,
                    ref.relationship
                ]);
                await connection.query(refSql, [refValues]);
            }

            // Insert past employers
            if (seekerData.pastEmployers?.length > 0) {
                const empSql = `
                    INSERT INTO seeker_past_employers (
                        seeker_id,
                        company_name,
                        position,
                        duration,
                        reason_for_leaving
                    ) VALUES ?
                `;
                const empValues = seekerData.pastEmployers.map(emp => [
                    seekerId,
                    emp.companyName,
                    emp.position,
                    emp.duration,
                    emp.reasonForLeaving
                ]);
                await connection.query(empSql, [empValues]);
            }

            // Insert qualification documents
            if (seekerData.attachments?.qualifications?.length > 0) {
                const qualSql = `
                    INSERT INTO seeker_qualifications (
                        seeker_id,
                        document_path
                    ) VALUES ?
                `;
                const qualValues = seekerData.attachments.qualifications.map(path => [
                    seekerId,
                    path
                ]);
                await connection.query(qualSql, [qualValues]);
            }

            await connection.commit();
            return this.getById(seekerId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const seekerSql = `
            SELECT js.*,
                   GROUP_CONCAT(DISTINCT CONCAT(
                       sr.ref_name, '|',
                       sr.ref_contact, '|',
                       sr.ref_relationship
                   )) as references_data,
                   GROUP_CONCAT(DISTINCT CONCAT(
                       spe.company_name, '|',
                       spe.position, '|',
                       spe.duration, '|',
                       spe.reason_for_leaving
                   )) as employers_data,
                   GROUP_CONCAT(DISTINCT sq.document_path) as qualification_docs
            FROM job_seekers js
            LEFT JOIN seeker_references sr ON js.id = sr.seeker_id
            LEFT JOIN seeker_past_employers spe ON js.id = spe.seeker_id
            LEFT JOIN seeker_qualifications sq ON js.id = sq.seeker_id
            WHERE js.id = ?
            GROUP BY js.id
        `;

        const seekers = await query(seekerSql, [id]);
        if (seekers.length === 0) return null;

        const seeker = seekers[0];
        
        // Format references
        const references = seeker.references_data ? 
            seeker.references_data.split(',').map(ref => {
                const [name, contact, relationship] = ref.split('|');
                return { name, contact, relationship };
            }) : [];

        // Format past employers
        const pastEmployers = seeker.employers_data ?
            seeker.employers_data.split(',').map(emp => {
                const [companyName, position, duration, reasonForLeaving] = emp.split('|');
                return { companyName, position, duration, reasonForLeaving };
            }) : [];

        // Format qualification documents
        const qualificationDocs = seeker.qualification_docs ?
            seeker.qualification_docs.split(',') : [];

        return {
            id: seeker.id,
            firstName: seeker.first_name,
            lastName: seeker.last_name,
            idNumber: seeker.id_number,
            cellPhone: seeker.cell_phone,
            email: seeker.email,
            address: seeker.address,
            age: seeker.age,
            qualification: seeker.qualification,
            instituteName: seeker.institute_name,
            postAppliedFor: seeker.post_applied_for,
            experienceYears: seeker.experience_years,
            references,
            pastEmployers,
            attachments: {
                cv: seeker.cv_path,
                idCopy: seeker.id_copy_path,
                qualifications: qualificationDocs
            },
            createdAt: seeker.created_at,
            updatedAt: seeker.updated_at
        };
    }

    static async update(id, updateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const updateSql = `
                UPDATE job_seekers
                SET first_name = ?,
                    last_name = ?,
                    cell_phone = ?,
                    email = ?,
                    address = ?,
                    age = ?,
                    qualification = ?,
                    institute_name = ?,
                    post_applied_for = ?,
                    experience_years = ?,
                    cv_path = ?,
                    id_copy_path = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await connection.execute(updateSql, [
                updateData.firstName,
                updateData.lastName,
                updateData.cellPhone,
                updateData.email,
                updateData.address,
                updateData.age,
                updateData.qualification,
                updateData.instituteName,
                updateData.postAppliedFor,
                updateData.experienceYears,
                updateData.attachments?.cv,
                updateData.attachments?.idCopy,
                id
            ]);

            // Update references
            if (updateData.references) {
                await connection.execute('DELETE FROM seeker_references WHERE seeker_id = ?', [id]);
                if (updateData.references.length > 0) {
                    const refSql = `
                        INSERT INTO seeker_references (
                            seeker_id,
                            ref_name,
                            ref_contact,
                            ref_relationship
                        ) VALUES ?
                    `;
                    const refValues = updateData.references.map(ref => [
                        id,
                        ref.name,
                        ref.contact,
                        ref.relationship
                    ]);
                    await connection.query(refSql, [refValues]);
                }
            }

            // Update past employers
            if (updateData.pastEmployers) {
                await connection.execute('DELETE FROM seeker_past_employers WHERE seeker_id = ?', [id]);
                if (updateData.pastEmployers.length > 0) {
                    const empSql = `
                        INSERT INTO seeker_past_employers (
                            seeker_id,
                            company_name,
                            position,
                            duration,
                            reason_for_leaving
                        ) VALUES ?
                    `;
                    const empValues = updateData.pastEmployers.map(emp => [
                        id,
                        emp.companyName,
                        emp.position,
                        emp.duration,
                        emp.reasonForLeaving
                    ]);
                    await connection.query(empSql, [empValues]);
                }
            }

            // Update qualification documents
            if (updateData.attachments?.qualifications) {
                await connection.execute('DELETE FROM seeker_qualifications WHERE seeker_id = ?', [id]);
                if (updateData.attachments.qualifications.length > 0) {
                    const qualSql = `
                        INSERT INTO seeker_qualifications (
                            seeker_id,
                            document_path
                        ) VALUES ?
                    `;
                    const qualValues = updateData.attachments.qualifications.map(path => [
                        id,
                        path
                    ]);
                    await connection.query(qualSql, [qualValues]);
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
        return query('DELETE FROM job_seekers WHERE id = ?', [id]);
    }

    static async getAll() {
        return query('SELECT * FROM job_seekers ORDER BY created_at DESC');
    }

    static async findByEmail(email) {
        const seekers = await query('SELECT * FROM job_seekers WHERE email = ?', [email]);
        return seekers.length > 0 ? seekers[0] : null;
    }

    static async findByIdNumber(idNumber) {
        const seekers = await query('SELECT * FROM job_seekers WHERE id_number = ?', [idNumber]);
        return seekers.length > 0 ? seekers[0] : null;
    }
}

module.exports = JobSeeker;
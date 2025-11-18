const { query, pool } = require('../database/connection');

class ArchitectureForm {
    static async create(formData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert main project data
            const projectSql = `
                INSERT INTO architecture_projects (
                    client_id,
                    project_type,
                    project_name,
                    location,
                    size,
                    budget,
                    timeline,
                    floors,
                    rooms,
                    additional_notes,
                    status,
                    payment_amount,
                    payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [projectResult] = await connection.execute(projectSql, [
                formData.clientId,
                formData.type,
                formData.projectDetails.name,
                formData.projectDetails.location,
                formData.projectDetails.size,
                formData.projectDetails.budget,
                formData.projectDetails.timeline,
                formData.requirements.floors,
                formData.requirements.rooms,
                formData.requirements.additionalNotes,
                'draft',
                formData.payment?.amount || 0,
                formData.payment?.status || 'pending'
            ]);

            const projectId = projectResult.insertId;

            // Insert special features
            if (formData.requirements.specialFeatures?.length > 0) {
                const featuresSql = `
                    INSERT INTO project_features (project_id, feature_name)
                    VALUES ?
                `;
                const featuresValues = formData.requirements.specialFeatures
                    .map(feature => [projectId, feature]);
                await connection.query(featuresSql, [featuresValues]);
            }

            // Insert documents
            const documents = [
                ...(formData.documents.sitePhotos || []).map(path => ['site_photo', path]),
                ...(formData.documents.existingPlans || []).map(path => ['existing_plan', path]),
                ...(formData.documents.approvals || []).map(path => ['approval', path])
            ];

            if (documents.length > 0) {
                const documentsSql = `
                    INSERT INTO project_documents (project_id, document_type, file_path)
                    VALUES ?
                `;
                const documentsValues = documents.map(([type, path]) => [projectId, type, path]);
                await connection.query(documentsSql, [documentsValues]);
            }

            await connection.commit();
            return projectId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        // Get main project data
        const projectSql = `
            SELECT p.*, 
                   GROUP_CONCAT(DISTINCT f.feature_name) as special_features,
                   GROUP_CONCAT(DISTINCT CONCAT(d.document_type, ':', d.file_path)) as documents
            FROM architecture_projects p
            LEFT JOIN project_features f ON p.id = f.project_id
            LEFT JOIN project_documents d ON p.id = d.project_id
            WHERE p.id = ?
            GROUP BY p.id
        `;

        const projects = await query(projectSql, [id]);
        if (projects.length === 0) return null;

        const project = projects[0];

        // Format the data to match the original structure
        const formattedProject = {
            id: project.id,
            type: project.project_type,
            clientId: project.client_id,
            projectDetails: {
                name: project.project_name,
                location: project.location,
                size: project.size,
                budget: project.budget,
                timeline: project.timeline
            },
            requirements: {
                floors: project.floors,
                rooms: project.rooms,
                specialFeatures: project.special_features ? project.special_features.split(',') : [],
                additionalNotes: project.additional_notes
            },
            documents: {
                sitePhotos: [],
                existingPlans: [],
                approvals: []
            },
            status: project.status,
            payment: {
                amount: project.payment_amount,
                status: project.payment_status,
                transactionId: project.transaction_id
            },
            createdAt: project.created_at,
            updatedAt: project.updated_at
        };

        // Process documents
        if (project.documents) {
            const docs = project.documents.split(',');
            docs.forEach(doc => {
                const [type, path] = doc.split(':');
                switch (type) {
                    case 'site_photo':
                        formattedProject.documents.sitePhotos.push(path);
                        break;
                    case 'existing_plan':
                        formattedProject.documents.existingPlans.push(path);
                        break;
                    case 'approval':
                        formattedProject.documents.approvals.push(path);
                        break;
                }
            });
        }

        return formattedProject;
    }

    static async update(id, updateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update main project data
            const projectSql = `
                UPDATE architecture_projects
                SET project_type = ?,
                    project_name = ?,
                    location = ?,
                    size = ?,
                    budget = ?,
                    timeline = ?,
                    floors = ?,
                    rooms = ?,
                    additional_notes = ?,
                    status = ?,
                    payment_amount = ?,
                    payment_status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await connection.execute(projectSql, [
                updateData.type,
                updateData.projectDetails.name,
                updateData.projectDetails.location,
                updateData.projectDetails.size,
                updateData.projectDetails.budget,
                updateData.projectDetails.timeline,
                updateData.requirements.floors,
                updateData.requirements.rooms,
                updateData.requirements.additionalNotes,
                updateData.status,
                updateData.payment?.amount,
                updateData.payment?.status,
                id
            ]);

            // Update special features
            await connection.execute('DELETE FROM project_features WHERE project_id = ?', [id]);
            if (updateData.requirements.specialFeatures?.length > 0) {
                const featuresSql = `
                    INSERT INTO project_features (project_id, feature_name)
                    VALUES ?
                `;
                const featuresValues = updateData.requirements.specialFeatures
                    .map(feature => [id, feature]);
                await connection.query(featuresSql, [featuresValues]);
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
        return query('DELETE FROM architecture_projects WHERE id = ?', [id]);
    }

    static async getClientProjects(clientId) {
        const sql = `
            SELECT * FROM architecture_projects
            WHERE client_id = ?
            ORDER BY created_at DESC
        `;
        return query(sql, [clientId]);
    }
}

module.exports = ArchitectureForm;
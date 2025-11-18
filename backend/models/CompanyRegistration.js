const { query, pool } = require('../database/connection');

class CompanyRegistration {
    static async create(registrationData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert main company data
            const companySql = `
                INSERT INTO company_registrations (
                    company_name,
                    registration_number,
                    contact_person_name,
                    contact_person_position,
                    contact_person_email,
                    contact_person_phone,
                    address_street,
                    address_city,
                    address_postal_code,
                    address_country,
                    registration_doc,
                    tax_clearance,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [companyResult] = await connection.execute(companySql, [
                registrationData.companyName,
                registrationData.registrationNumber,
                registrationData.contactPerson.name,
                registrationData.contactPerson.position,
                registrationData.contactPerson.email,
                registrationData.contactPerson.phone,
                registrationData.address.street,
                registrationData.address.city,
                registrationData.address.postalCode,
                registrationData.address.country,
                registrationData.documents.registrationDoc,
                registrationData.documents.taxClearance,
                'pending'
            ]);

            const companyId = companyResult.insertId;

            // Insert services
            if (registrationData.services?.length > 0) {
                const servicesSql = `
                    INSERT INTO company_services (company_id, service_type)
                    VALUES ?
                `;
                const servicesValues = registrationData.services
                    .map(service => [companyId, service]);
                await connection.query(servicesSql, [servicesValues]);
            }

            // Insert other documents
            if (registrationData.documents.otherDocs?.length > 0) {
                const docsSql = `
                    INSERT INTO company_documents (company_id, document_path)
                    VALUES ?
                `;
                const docsValues = registrationData.documents.otherDocs
                    .map(doc => [companyId, doc]);
                await connection.query(docsSql, [docsValues]);
            }

            await connection.commit();
            return companyId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const sql = `
            SELECT c.*,
                   GROUP_CONCAT(DISTINCT cs.service_type) as services,
                   GROUP_CONCAT(DISTINCT cd.document_path) as other_docs
            FROM company_registrations c
            LEFT JOIN company_services cs ON c.id = cs.company_id
            LEFT JOIN company_documents cd ON c.id = cd.company_id
            WHERE c.id = ?
            GROUP BY c.id
        `;

        const companies = await query(sql, [id]);
        if (companies.length === 0) return null;

        const company = companies[0];
        return {
            id: company.id,
            companyName: company.company_name,
            registrationNumber: company.registration_number,
            contactPerson: {
                name: company.contact_person_name,
                position: company.contact_person_position,
                email: company.contact_person_email,
                phone: company.contact_person_phone
            },
            address: {
                street: company.address_street,
                city: company.address_city,
                postalCode: company.address_postal_code,
                country: company.address_country
            },
            services: company.services ? company.services.split(',') : [],
            documents: {
                registrationDoc: company.registration_doc,
                taxClearance: company.tax_clearance,
                otherDocs: company.other_docs ? company.other_docs.split(',') : []
            },
            status: company.status,
            createdAt: company.created_at,
            updatedAt: company.updated_at
        };
    }

    static async update(id, updateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const updateSql = `
                UPDATE company_registrations
                SET company_name = ?,
                    registration_number = ?,
                    contact_person_name = ?,
                    contact_person_position = ?,
                    contact_person_email = ?,
                    contact_person_phone = ?,
                    address_street = ?,
                    address_city = ?,
                    address_postal_code = ?,
                    address_country = ?,
                    registration_doc = ?,
                    tax_clearance = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await connection.execute(updateSql, [
                updateData.companyName,
                updateData.registrationNumber,
                updateData.contactPerson.name,
                updateData.contactPerson.position,
                updateData.contactPerson.email,
                updateData.contactPerson.phone,
                updateData.address.street,
                updateData.address.city,
                updateData.address.postalCode,
                updateData.address.country,
                updateData.documents.registrationDoc,
                updateData.documents.taxClearance,
                updateData.status,
                id
            ]);

            // Update services
            await connection.execute('DELETE FROM company_services WHERE company_id = ?', [id]);
            if (updateData.services?.length > 0) {
                const servicesSql = `
                    INSERT INTO company_services (company_id, service_type)
                    VALUES ?
                `;
                const servicesValues = updateData.services
                    .map(service => [id, service]);
                await connection.query(servicesSql, [servicesValues]);
            }

            // Update other documents
            await connection.execute('DELETE FROM company_documents WHERE company_id = ?', [id]);
            if (updateData.documents.otherDocs?.length > 0) {
                const docsSql = `
                    INSERT INTO company_documents (company_id, document_path)
                    VALUES ?
                `;
                const docsValues = updateData.documents.otherDocs
                    .map(doc => [id, doc]);
                await connection.query(docsSql, [docsValues]);
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
        return query('DELETE FROM company_registrations WHERE id = ?', [id]);
    }

    static async getAll() {
        const sql = `
            SELECT c.*,
                   GROUP_CONCAT(DISTINCT cs.service_type) as services,
                   GROUP_CONCAT(DISTINCT cd.document_path) as other_docs
            FROM company_registrations c
            LEFT JOIN company_services cs ON c.id = cs.company_id
            LEFT JOIN company_documents cd ON c.id = cd.company_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `;
        return query(sql);
    }
}

module.exports = CompanyRegistration;
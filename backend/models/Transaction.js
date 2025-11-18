const { query, pool } = require('../database/connection');

class Transaction {
    static async create(transactionData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert main transaction data
            const transactionSql = `
                INSERT INTO transactions (
                    user_id,
                    amount,
                    currency,
                    description,
                    payment_method,
                    yoco_payment_id,
                    status,
                    checkout_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [transactionResult] = await connection.execute(transactionSql, [
                transactionData.userId,
                transactionData.amount,
                transactionData.currency || 'ZAR',
                transactionData.description,
                transactionData.paymentMethod,
                transactionData.yocoPaymentId,
                transactionData.status || 'pending',
                transactionData.checkoutUrl
            ]);

            const transactionId = transactionResult.insertId;

            // Insert transaction items
            if (transactionData.items?.length > 0) {
                const itemsSql = `
                    INSERT INTO transaction_items (
                        transaction_id,
                        item_type,
                        item_reference_id,
                        item_name,
                        price,
                        quantity
                    ) VALUES ?
                `;
                const itemsValues = transactionData.items.map(item => [
                    transactionId,
                    item.type,
                    item.itemId,
                    item.name,
                    item.price,
                    item.quantity
                ]);
                await connection.query(itemsSql, [itemsValues]);
            }

            await connection.commit();
            return this.getById(transactionId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const sql = `
            SELECT t.*,
                   GROUP_CONCAT(
                       CONCAT_WS('|',
                           ti.item_type,
                           ti.item_reference_id,
                           ti.item_name,
                           ti.price,
                           ti.quantity
                       )
                   ) as items_data
            FROM transactions t
            LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
            WHERE t.id = ?
            GROUP BY t.id
        `;

        const transactions = await query(sql, [id]);
        if (transactions.length === 0) return null;

        const transaction = transactions[0];
        
        return {
            id: transaction.id,
            userId: transaction.user_id,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            items: transaction.items_data ? 
                transaction.items_data.split(',').map(item => {
                    const [type, itemId, name, price, quantity] = item.split('|');
                    return {
                        type,
                        itemId,
                        name,
                        price: parseFloat(price),
                        quantity: parseInt(quantity)
                    };
                }) : [],
            paymentMethod: transaction.payment_method,
            yocoPaymentId: transaction.yoco_payment_id,
            status: transaction.status,
            checkoutUrl: transaction.checkout_url,
            createdAt: transaction.created_at,
            updatedAt: transaction.updated_at
        };
    }

    static async update(id, updateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const updateSql = `
                UPDATE transactions
                SET status = ?,
                    yoco_payment_id = ?,
                    checkout_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await connection.execute(updateSql, [
                updateData.status,
                updateData.yocoPaymentId,
                updateData.checkoutUrl,
                id
            ]);

            // Log webhook event if provided
            if (updateData.webhookEvent) {
                const eventSql = `
                    INSERT INTO transaction_events (
                        transaction_id,
                        event_type,
                        event_data
                    ) VALUES (?, ?, ?)
                `;
                await connection.execute(eventSql, [
                    id,
                    updateData.webhookEvent.eventType,
                    JSON.stringify(updateData.webhookEvent.data)
                ]);
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

    static async getByUserId(userId) {
        const sql = `
            SELECT t.*,
                   GROUP_CONCAT(
                       CONCAT_WS('|',
                           ti.item_type,
                           ti.item_reference_id,
                           ti.item_name,
                           ti.price,
                           ti.quantity
                       )
                   ) as items_data
            FROM transactions t
            LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
            WHERE t.user_id = ?
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `;
        
        const transactions = await query(sql, [userId]);
        return transactions.map(transaction => ({
            id: transaction.id,
            userId: transaction.user_id,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            items: transaction.items_data ? 
                transaction.items_data.split(',').map(item => {
                    const [type, itemId, name, price, quantity] = item.split('|');
                    return {
                        type,
                        itemId,
                        name,
                        price: parseFloat(price),
                        quantity: parseInt(quantity)
                    };
                }) : [],
            paymentMethod: transaction.payment_method,
            yocoPaymentId: transaction.yoco_payment_id,
            status: transaction.status,
            checkoutUrl: transaction.checkout_url,
            createdAt: transaction.created_at,
            updatedAt: transaction.updated_at
        }));
    }

    static async getTransactionEvents(transactionId) {
        return query(
            'SELECT * FROM transaction_events WHERE transaction_id = ? ORDER BY created_at DESC',
            [transactionId]
        );
    }
}

module.exports = Transaction;
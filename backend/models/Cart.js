const { query, pool } = require('../database/connection');

class Cart {
    static async getCart(userId) {
        const sql = `
            SELECT c.*, s.name, s.description, s.category as productType
            FROM cart c
            JOIN services s ON c.service_id = s.id
            WHERE c.user_id = ?
        `;
        return query(sql, [userId]);
    }

    static async addItem(userId, serviceId, quantity = 1) {
        // First check if the item already exists in cart
        const existing = await query(
            'SELECT * FROM cart WHERE user_id = ? AND service_id = ?',
            [userId, serviceId]
        );

        if (existing.length > 0) {
            // Update quantity if item exists
            return query(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND service_id = ?',
                [quantity, userId, serviceId]
            );
        }

        // Add new item if it doesn't exist
        const sql = `
            INSERT INTO cart (user_id, service_id, quantity)
            SELECT ?, ?, ?
            FROM services
            WHERE id = ?
        `;
        return query(sql, [userId, serviceId, quantity, serviceId]);
    }

    static async removeItem(userId, serviceId) {
        const sql = 'DELETE FROM cart WHERE user_id = ? AND service_id = ?';
        return query(sql, [userId, serviceId]);
    }

    static async updateQuantity(userId, serviceId, quantity) {
        const sql = 'UPDATE cart SET quantity = ? WHERE user_id = ? AND service_id = ?';
        return query(sql, [quantity, userId, serviceId]);
    }

    static async clearCart(userId) {
        const sql = 'DELETE FROM cart WHERE user_id = ?';
        return query(sql, [userId]);
    }

    static async createOrder(userId, items) {
        // Start transaction
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Create order
            const [orderResult] = await connection.execute(
                'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
                [userId, 0] // We'll update the total later
            );
            const orderId = orderResult.insertId;

            // Add items and calculate totals
            let totalAmount = 0;

            for (const item of items) {
                const [service] = await connection.execute(
                    'SELECT price FROM services WHERE id = ?',
                    [item.service_id]
                );

                const price = service[0].price;
                const subtotal = price * item.quantity;
                const vat = subtotal * 0.15;
                const total = subtotal + vat;

                await connection.execute(
                    `INSERT INTO order_items 
                    (order_id, service_id, quantity, price, vat, total)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [orderId, item.service_id, item.quantity, price, vat, total]
                );

                totalAmount += total;
            }

            // Update order total
            await connection.execute(
                'UPDATE orders SET total_amount = ? WHERE id = ?',
                [totalAmount, orderId]
            );

            // Clear cart
            await connection.execute(
                'DELETE FROM cart WHERE user_id = ?',
                [userId]
            );

            await connection.commit();
            return orderId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Cart;
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Afrihost MySQL Database Connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'tmvbusinesssolutions',
    process.env.DB_USER || 'tmvbusinesssolutions',
    process.env.DB_PASSWORD || 'Moses@1985',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = User;
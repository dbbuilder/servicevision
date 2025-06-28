// Sequelize Models Index
// Initializes Sequelize and loads all models

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const logger = require('../utils/logger');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
let config;

// Load appropriate config based on environment
if (env === 'test') {
    config = require('../config/database.test');
} else {
    config = require('../config/database')[env];
}

const db = {};

// Initialize Sequelize
let sequelize;
if (config.use_env_variable) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
    sequelize = new Sequelize(
        config.database,
        config.username,
        config.password,
        config
    );
}

// Test the connection
sequelize
    .authenticate()
    .then(() => {
        if (process.env.NODE_ENV !== 'test') {
            logger.info('Database connection has been established successfully.');
        }
    })
    .catch((err) => {
        logger.error('Unable to connect to the database:', err);
    });

// Load all models dynamically
fs.readdirSync(__dirname)
    .filter((file) => {
        return (
            file.indexOf('.') !== 0 &&
            file !== basename &&
            file.slice(-3) === '.js' &&
            !file.includes('.test.js')
        );
    })
    .forEach((file) => {
        try {
            const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
            db[model.name] = model;
            if (process.env.NODE_ENV === 'test') {
                console.log(`Loaded model: ${model.name}`);
            }
        } catch (error) {
            console.error(`Error loading model ${file}:`, error.message);
        }
    });

// Set up associations
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

// Export database object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
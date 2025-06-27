// Database Configuration
// Configured for Supabase PostgreSQL

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration for different environments
const config = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        dialectOptions: {
            ssl: process.env.NODE_ENV === 'production' ? {
                require: true,
                rejectUnauthorized: false
            } : false
        },
        logging: (msg) => require('../utils/logger').debug(msg),
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
    test: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres_test',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',        dialectOptions: {
            ssl: false
        },
        logging: false
    },
    production: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false,
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        }
    }
};

// Test database connection
async function testDatabaseConnection(databaseUrl) {
    try {
        const testUrl = databaseUrl || process.env.DATABASE_URL;
        if (!testUrl || testUrl === 'invalid-url') {
            return false;
        }
        
        const sequelize = new Sequelize(testUrl, {
            dialect: 'postgres',
            logging: false
        });
        
        await sequelize.authenticate();
        await sequelize.close();
        return true;
    } catch (error) {
        logger.error('Database connection test failed:', error);
        return false;
    }
}

// Connect to database with proper configuration
async function connectDatabase() {
    const env = process.env.NODE_ENV || 'development';
    const databaseUrl = process.env.DATABASE_URL;
    
    let sequelize;
    
    if (databaseUrl) {
        // Use DATABASE_URL if available (production/deployment)
        sequelize = new Sequelize(databaseUrl, {
            dialect: 'postgres',
            logging: env === 'development' ? console.log : false,
            dialectOptions: {
                ssl: env === 'production' ? {
                    require: true,
                    rejectUnauthorized: false
                } : false
            },
            pool: {
                max: env === 'production' ? 10 : 5,
                min: env === 'production' ? 2 : 0,
                acquire: 30000,
                idle: 10000
            }
        });
    } else {
        // Use individual config values
        const dbConfig = config[env];
        sequelize = new Sequelize(
            dbConfig.database,
            dbConfig.username,
            dbConfig.password,
            {
                host: dbConfig.host,
                port: dbConfig.port,
                dialect: dbConfig.dialect,
                logging: dbConfig.logging,
                dialectOptions: dbConfig.dialectOptions,
                pool: dbConfig.pool
            }
        );
    }
    
    // Test the connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync database schema
    await sequelize.sync({ alter: true });
    logger.info('Database schema synchronized.');
    
    return sequelize;
}

module.exports = {
    ...config,
    testDatabaseConnection,
    connectDatabase
};
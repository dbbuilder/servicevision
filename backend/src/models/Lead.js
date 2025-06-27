// Lead Model
// Stores information about potential clients

module.exports = (sequelize, DataTypes) => {
    const Lead = sequelize.define('Lead', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        organizationName: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        organizationType: {
            type: DataTypes.ENUM('for-profit', 'nonprofit', 'government', 'other'),
            allowNull: true
        },
        organizationSize: {
            type: DataTypes.ENUM('small', 'medium', 'large', 'enterprise'),
            allowNull: true
        },
        contactName: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        contactRole: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        consultingInterests: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        budgetRange: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        timeline: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        leadScore: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        source: {
            type: DataTypes.STRING(50),
            defaultValue: 'website'
        },
        status: {
            type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'),
            defaultValue: 'new'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        lastContactDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        scheduledCallDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        isSubscribed: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'Leads',
        timestamps: true,
        indexes: [
            {
                fields: ['email']
            },
            {
                fields: ['status']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    // Define associations
    Lead.associate = function(models) {
        Lead.hasMany(models.ChatSession, {
            foreignKey: 'leadId',
            as: 'chatSessions'
        });
        
        Lead.hasMany(models.DrawingEntry, {
            foreignKey: 'leadId',
            as: 'drawingEntries'
        });
    };

    return Lead;
};
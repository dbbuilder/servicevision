// Lead Model
// Stores information about potential clients

module.exports = (sequelize, DataTypes) => {
    const Lead = sequelize.define('Lead', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        company: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                is: /^[\d\s\-\+\(\)]+$/
            }
        },
        qualified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        qualificationScore: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            field: 'qualification_score',
            validate: {
                min: 0,
                max: 100
            }
        },
        status: {
            type: DataTypes.ENUM('new', 'contacted', 'qualified', 'unqualified', 'converted'),
            defaultValue: 'new'
        },
        meetingScheduled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'meeting_scheduled'
        },
        meetingTime: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'meeting_time'
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        tableName: 'leads',
        timestamps: true,
        indexes: [
            {
                fields: ['email'],
                unique: true
            },
            {
                fields: ['status']
            },
            {
                fields: ['created_at']
            }
        ],
        hooks: {
            beforeCreate: (lead) => {
                // Normalize email to lowercase
                if (lead.email) {
                    lead.email = lead.email.trim().toLowerCase();
                }
            }
        }
    });

    // Define associations
    Lead.associate = function(models) {
        Lead.hasMany(models.ChatSession, {
            foreignKey: 'lead_id',
            as: 'chatSessions'
        });
        
        Lead.hasOne(models.DrawingEntry, {
            foreignKey: 'lead_id',
            as: 'drawingEntry'
        });
    };

    return Lead;
};
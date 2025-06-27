// DrawingEntry Model
// Tracks entries for the consulting session giveaway

module.exports = (sequelize, DataTypes) => {
    const DrawingEntry = sequelize.define('DrawingEntry', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        leadId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Leads',
                key: 'id'
            }
        },
        entryType: {
            type: DataTypes.ENUM('email', 'session_complete'),
            allowNull: false
        },
        drawingPeriod: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'Format: YYYY-MM'
        },
        isWinner: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        winnerSelectedDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        prizeDescription: {
            type: DataTypes.STRING(500),
            defaultValue: 'Free 1-hour consulting session'
        },
        notificationSent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'DrawingEntries',
        timestamps: true,
        indexes: [
            {
                fields: ['leadId']
            },
            {
                fields: ['drawingPeriod']
            },
            {
                fields: ['isWinner']
            },
            {
                unique: true,
                fields: ['leadId', 'entryType', 'drawingPeriod']
            }
        ]
    });

    // Define associations
    DrawingEntry.associate = function(models) {
        DrawingEntry.belongsTo(models.Lead, {
            foreignKey: 'leadId',
            as: 'lead'
        });
    };

    return DrawingEntry;
};
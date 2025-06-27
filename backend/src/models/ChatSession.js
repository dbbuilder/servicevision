// ChatSession Model
// Stores AI chat session data and conversations

module.exports = (sequelize, DataTypes) => {
    const ChatSession = sequelize.define('ChatSession', {
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
        sessionId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        startTime: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true
        },
        conversationHistory: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        executiveSummary: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        identifiedNeeds: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        recommendedServices: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        isComplete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        completionRate: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        totalMessages: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        userSentiment: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        }
    }, {        tableName: 'ChatSessions',
        timestamps: true,
        indexes: [
            {
                fields: ['leadId']
            },
            {
                fields: ['sessionId']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    // Define associations
    ChatSession.associate = function(models) {
        ChatSession.belongsTo(models.Lead, {
            foreignKey: 'leadId',
            as: 'lead'
        });
    };

    return ChatSession;
};
// ChatSession Model
// Stores AI chat session data and conversations

module.exports = (sequelize, DataTypes) => {
    const ChatSession = sequelize.define('ChatSession', {
        sessionId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'session_id'
        },
        messages: {
            type: DataTypes.JSON,
            defaultValue: [],
            allowNull: false,
            field: 'messages'
        },
        userEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'user_email',
            validate: {
                isEmail: true
            }
        },
        leadQualified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'lead_qualified'
        },
        executiveSummary: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'executive_summary'
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {},
            field: 'metadata'
        },
        state: {
            type: DataTypes.JSON,
            defaultValue: {},
            field: 'state'
        },
        conversationHistory: {
            type: DataTypes.JSON,
            defaultValue: [],
            field: 'conversation_history'
        },
        identifiedNeeds: {
            type: DataTypes.JSON,
            defaultValue: [],
            field: 'identified_needs'
        },
        recommendedServices: {
            type: DataTypes.JSON,
            defaultValue: [],
            field: 'recommended_services'
        },
        completionRate: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            field: 'completion_rate'
        },
        totalMessages: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_messages'
        },
        startTime: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'start_time'
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'end_time'
        },
        isComplete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_complete'
        },
        summaryGeneratedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'summary_generated_at'
        },
        summaryEmailSent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'summary_email_sent'
        },
        summaryEmailSentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'summary_email_sent_at'
        }
    }, {
        tableName: 'chat_sessions',
        timestamps: true,
        indexes: [
            {
                fields: ['user_email']
            },
            {
                fields: ['created_at']
            }
        ],
        instanceMethods: {
            addMessage: function(role, content) {
                this.messages.push({
                    role,
                    content,
                    timestamp: new Date()
                });
                return this.save();
            }
        }
    });

    // Define associations
    ChatSession.associate = function(models) {
        ChatSession.belongsTo(models.Lead, {
            foreignKey: 'lead_id',
            as: 'lead'
        });
        
        ChatSession.hasMany(models.Message, {
            foreignKey: 'chatSessionId',
            as: 'chatMessages'
        });
    };

    return ChatSession;
};
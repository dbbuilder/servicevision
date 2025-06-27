// Message Model
// Represents individual messages in chat conversations

const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  class Message extends Model {
    static associate(models) {
      // Message belongs to ChatSession
      Message.belongsTo(models.ChatSession, {
        foreignKey: 'chatSessionId',
        as: 'chatSession'
      });
    }

    // Mark message as read
    async markAsRead() {
      if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
      }
      return this;
    }

    // Mark message as delivered
    async markAsDelivered() {
      if (!this.isDelivered) {
        this.isDelivered = true;
        this.deliveredAt = new Date();
        await this.save();
      }
      return this;
    }

    // Check if message has quick replies
    hasQuickReplies() {
      return this.quickReplies && this.quickReplies.length > 0;
    }

    // Check if message has attachments
    hasAttachments() {
      return this.attachments && this.attachments.length > 0;
    }

    // Get surrounding messages for context
    async getConversationContext(contextSize = 3) {
      const beforeMessages = await Message.findAll({
        where: {
          chatSessionId: this.chatSessionId,
          timestamp: {
            [Op.lt]: this.timestamp
          }
        },
        order: [['timestamp', 'DESC']],
        limit: contextSize
      });

      const afterMessages = await Message.findAll({
        where: {
          chatSessionId: this.chatSessionId,
          timestamp: {
            [Op.gt]: this.timestamp
          }
        },
        order: [['timestamp', 'ASC']],
        limit: contextSize
      });

      return {
        before: beforeMessages.reverse(),
        current: this,
        after: afterMessages
      };
    }

    // Check if this is a system message
    get isSystemMessage() {
      return this.role === 'system';
    }
  }

  Message.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    chatSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ChatSessions',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000]
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isDelivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    quickReplies: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Message',
    tableName: 'Messages',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['chat_session_id', 'timestamp']
      },
      {
        fields: ['role']
      },
      {
        fields: ['is_delivered']
      },
      {
        fields: ['is_read']
      }
    ]
  });

  return Message;
};
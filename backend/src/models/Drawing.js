// Drawing Model
// Represents monthly drawings for lead generation prizes

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Drawing extends Model {
    static associate(models) {
      // Drawing has many entries
      Drawing.hasMany(models.DrawingEntry, {
        foreignKey: 'drawingId',
        as: 'entries'
      });
      
      // Drawing has one winner (Lead)
      Drawing.belongsTo(models.Lead, {
        foreignKey: 'winnerId',
        as: 'winner'
      });
    }
    
    // Get the winner lead
    async getWinner() {
      if (!this.winnerId) return null;
      return this.getDataValue('winner') || 
        await this.sequelize.models.Lead.findByPk(this.winnerId);
    }
  }

  Drawing.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'special'),
      defaultValue: 'monthly'
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
      defaultValue: 'draft'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStart(value) {
          if (value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    prizeDetails: {
      type: DataTypes.JSON,
      defaultValue: {
        type: 'consultation',
        value: 250,
        duration: '60 minutes'
      }
    },
    winnerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Leads',
        key: 'id'
      }
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Drawing',
    tableName: 'Drawings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['start_date', 'end_date']
      },
      {
        fields: ['type']
      }
    ]
  });

  return Drawing;
};
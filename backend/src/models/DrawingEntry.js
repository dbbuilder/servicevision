// DrawingEntry Model
// Tracks entries for the consulting session giveaway

module.exports = (sequelize, DataTypes) => {
    const DrawingEntry = sequelize.define('DrawingEntry', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        entryNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            field: 'entry_number'
        },
        status: {
            type: DataTypes.ENUM('active', 'winner', 'expired'),
            defaultValue: 'active'
        },
        drawingDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'drawing_date'
        },
        wonDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'won_date'
        },
        prizeDetails: {
            type: DataTypes.JSON,
            defaultValue: {
                type: 'free_consultation',
                value: 500,
                duration: '1 hour'
            },
            field: 'prize_details'
        }
    }, {
        tableName: 'drawing_entries',
        timestamps: true,
        indexes: [
            {
                fields: ['entry_number'],
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
            beforeCreate: (entry) => {
                // Generate unique entry number
                const date = new Date();
                const year = date.getFullYear();
                const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                entry.entryNumber = `DE-${year}-${random}`;
            }
        },
        classMethods: {
            selectRandomWinner: async function() {
                const activeEntries = await this.findAll({
                    where: { status: 'active' }
                });
                
                if (activeEntries.length === 0) {
                    return null;
                }
                
                const randomIndex = Math.floor(Math.random() * activeEntries.length);
                const winner = activeEntries[randomIndex];
                
                winner.status = 'winner';
                winner.wonDate = new Date();
                await winner.save();
                
                return winner;
            }
        }
    });

    // Define associations
    DrawingEntry.associate = function(models) {
        DrawingEntry.belongsTo(models.Lead, {
            foreignKey: 'lead_id',
            as: 'lead'
        });
    };

    return DrawingEntry;
};
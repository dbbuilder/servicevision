const { DataTypes } = require('sequelize');
const DrawingEntry = require('../DrawingEntry');

// Mock sequelize
const mockSequelize = {
  define: jest.fn()
};

// Mock model instance
const mockModel = {
  belongsTo: jest.fn()
};

describe('DrawingEntry Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSequelize.define.mockReturnValue(mockModel);
  });

  test('should define model with correct name and options', () => {
    const model = DrawingEntry(mockSequelize, DataTypes);
    
    expect(mockSequelize.define).toHaveBeenCalledWith('DrawingEntry', expect.any(Object), expect.any(Object));
    
    const [modelName, , options] = mockSequelize.define.mock.calls[0];
    
    expect(modelName).toBe('DrawingEntry');
    expect(options.tableName).toBe('drawing_entries');
    expect(options.timestamps).toBe(true);
  });

  test('should have correct attributes', () => {
    DrawingEntry(mockSequelize, DataTypes);
    
    const [, attributes] = mockSequelize.define.mock.calls[0];
    
    // Check id
    expect(attributes.id).toEqual({
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    });
    
    // Check entryNumber
    expect(attributes.entryNumber).toEqual({
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'entry_number'
    });
    
    // Check status
    expect(attributes.status).toEqual({
      type: DataTypes.ENUM('active', 'winner', 'expired'),
      defaultValue: 'active'
    });
    
    // Check drawingDate
    expect(attributes.drawingDate).toEqual({
      type: DataTypes.DATE,
      allowNull: true,
      field: 'drawing_date'
    });
    
    // Check wonDate
    expect(attributes.wonDate).toEqual({
      type: DataTypes.DATE,
      allowNull: true,
      field: 'won_date'
    });
    
    // Check prizeDetails
    expect(attributes.prizeDetails).toEqual({
      type: DataTypes.JSON,
      defaultValue: {
        type: 'free_consultation',
        value: 500,
        duration: '1 hour'
      },
      field: 'prize_details'
    });
  });

  test('should have associations', () => {
    const model = DrawingEntry(mockSequelize, DataTypes);
    
    expect(model.associate).toBeDefined();
    
    const models = {
      Lead: jest.fn()
    };
    
    model.associate(models);
    
    expect(mockModel.belongsTo).toHaveBeenCalledWith(models.Lead, {
      foreignKey: 'lead_id',
      as: 'lead'
    });
  });

  test('should have indexes', () => {
    DrawingEntry(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    
    expect(options.indexes).toContainEqual({
      fields: ['entry_number'],
      unique: true
    });
    
    expect(options.indexes).toContainEqual({
      fields: ['status']
    });
    
    expect(options.indexes).toContainEqual({
      fields: ['created_at']
    });
  });

  test('should have hooks for entry number generation', () => {
    DrawingEntry(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    
    expect(options.hooks).toBeDefined();
    expect(options.hooks.beforeCreate).toBeDefined();
    
    // Test entry number generation
    const mockInstance = {};
    const mockDate = new Date('2024-01-15');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    
    options.hooks.beforeCreate(mockInstance);
    
    expect(mockInstance.entryNumber).toMatch(/^DE-2024-/);
    expect(mockInstance.entryNumber).toHaveLength(13); // DE-2024-XXXXX
    
    global.Date.mockRestore();
  });

  test('should have class methods for winner selection', () => {
    DrawingEntry(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    
    expect(options.classMethods).toBeDefined();
    expect(options.classMethods.selectRandomWinner).toBeDefined();
  });
});
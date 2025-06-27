const { DataTypes } = require('sequelize');
const Lead = require('../Lead');

// Mock sequelize
const mockSequelize = {
  define: jest.fn()
};

// Mock model instance
const mockModel = {
  hasMany: jest.fn(),
  hasOne: jest.fn()
};

describe('Lead Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSequelize.define.mockReturnValue(mockModel);
  });

  test('should define model with correct name and options', () => {
    const model = Lead(mockSequelize, DataTypes);
    
    expect(mockSequelize.define).toHaveBeenCalledWith('Lead', expect.any(Object), expect.any(Object));
    
    const [modelName, , options] = mockSequelize.define.mock.calls[0];
    
    expect(modelName).toBe('Lead');
    expect(options.tableName).toBe('leads');
    expect(options.timestamps).toBe(true);
  });

  test('should have correct attributes', () => {
    Lead(mockSequelize, DataTypes);
    
    const [, attributes] = mockSequelize.define.mock.calls[0];
    
    // Check id
    expect(attributes.id).toEqual({
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    });
    
    // Check email
    expect(attributes.email).toEqual({
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    });
    
    // Check name
    expect(attributes.name).toEqual({
      type: DataTypes.STRING,
      allowNull: true
    });
    
    // Check company
    expect(attributes.company).toEqual({
      type: DataTypes.STRING,
      allowNull: true
    });
    
    // Check phone
    expect(attributes.phone).toEqual({
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)]+$/
      }
    });
    
    // Check qualified
    expect(attributes.qualified).toEqual({
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
    
    // Check qualification score
    expect(attributes.qualificationScore).toEqual({
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'qualification_score',
      validate: {
        min: 0,
        max: 100
      }
    });
    
    // Check status
    expect(attributes.status).toEqual({
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'unqualified', 'converted'),
      defaultValue: 'new'
    });
    
    // Check meeting scheduled
    expect(attributes.meetingScheduled).toEqual({
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'meeting_scheduled'
    });
    
    // Check meeting time
    expect(attributes.meetingTime).toEqual({
      type: DataTypes.DATE,
      allowNull: true,
      field: 'meeting_time'
    });
    
    // Check metadata
    expect(attributes.metadata).toEqual({
      type: DataTypes.JSON,
      defaultValue: {}
    });
  });

  test('should have associations', () => {
    const model = Lead(mockSequelize, DataTypes);
    
    expect(model.associate).toBeDefined();
    
    const models = {
      ChatSession: jest.fn(),
      DrawingEntry: jest.fn()
    };
    
    model.associate(models);
    
    expect(mockModel.hasMany).toHaveBeenCalledWith(models.ChatSession, {
      foreignKey: 'lead_id',
      as: 'chatSessions'
    });
    
    expect(mockModel.hasOne).toHaveBeenCalledWith(models.DrawingEntry, {
      foreignKey: 'lead_id',
      as: 'drawingEntry'
    });
  });

  test('should have indexes for performance', () => {
    Lead(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    
    expect(options.indexes).toContainEqual({
      fields: ['email'],
      unique: true
    });
    
    expect(options.indexes).toContainEqual({
      fields: ['status']
    });
    
    expect(options.indexes).toContainEqual({
      fields: ['created_at']
    });
  });

  test('should have hooks for data processing', () => {
    Lead(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    
    expect(options.hooks).toBeDefined();
    expect(options.hooks.beforeCreate).toBeDefined();
    
    // Test email normalization hook
    const mockInstance = {
      email: ' TEST@EXAMPLE.COM '
    };
    
    options.hooks.beforeCreate(mockInstance);
    
    expect(mockInstance.email).toBe('test@example.com');
  });

  test('should validate phone number format', () => {
    Lead(mockSequelize, DataTypes);
    
    const [, attributes] = mockSequelize.define.mock.calls[0];
    
    const phoneValidation = attributes.phone.validate.is;
    
    // Valid phone numbers
    expect(phoneValidation.test('+1 (555) 123-4567')).toBe(true);
    expect(phoneValidation.test('555-123-4567')).toBe(true);
    expect(phoneValidation.test('5551234567')).toBe(true);
    
    // Invalid phone numbers
    expect(phoneValidation.test('abc-def-ghij')).toBe(false);
    expect(phoneValidation.test('555@123#4567')).toBe(false);
  });
});
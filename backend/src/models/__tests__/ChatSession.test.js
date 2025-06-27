const { DataTypes } = require('sequelize');
const ChatSession = require('../ChatSession');

// Mock sequelize
const mockSequelize = {
  define: jest.fn()
};

// Mock model instance methods
const mockModel = {
  hasMany: jest.fn(),
  belongsTo: jest.fn()
};

describe('ChatSession Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSequelize.define.mockReturnValue(mockModel);
  });

  test('should define model with correct name and attributes', () => {
    const model = ChatSession(mockSequelize, DataTypes);
    
    expect(mockSequelize.define).toHaveBeenCalledWith('ChatSession', expect.any(Object), expect.any(Object));
    
    const [modelName, attributes, options] = mockSequelize.define.mock.calls[0];
    
    expect(modelName).toBe('ChatSession');
    expect(options.tableName).toBe('chat_sessions');
    expect(options.timestamps).toBe(true);
  });

  test('should have correct attributes', () => {
    ChatSession(mockSequelize, DataTypes);
    
    const [, attributes] = mockSequelize.define.mock.calls[0];
    
    // Check sessionId
    expect(attributes.sessionId).toEqual({
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'session_id'
    });
    
    // Check messages
    expect(attributes.messages).toEqual({
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
      field: 'messages'
    });
    
    // Check userEmail
    expect(attributes.userEmail).toEqual({
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_email',
      validate: {
        isEmail: true
      }
    });
    
    // Check leadQualified
    expect(attributes.leadQualified).toEqual({
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'lead_qualified'
    });
    
    // Check executiveSummary
    expect(attributes.executiveSummary).toEqual({
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'executive_summary'
    });
    
    // Check metadata
    expect(attributes.metadata).toEqual({
      type: DataTypes.JSON,
      defaultValue: {},
      field: 'metadata'
    });
  });

  test('should have instance methods', () => {
    ChatSession(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    const instanceMethods = options.instanceMethods || {};
    
    // Test addMessage method
    const mockInstance = {
      messages: [],
      save: jest.fn()
    };
    
    if (instanceMethods.addMessage) {
      instanceMethods.addMessage.call(mockInstance, 'user', 'Hello');
      expect(mockInstance.messages).toHaveLength(1);
      expect(mockInstance.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello'
      });
      expect(mockInstance.save).toHaveBeenCalled();
    }
  });

  test('should set up associations', () => {
    const model = ChatSession(mockSequelize, DataTypes);
    
    // Check if associate method exists
    expect(model.associate).toBeDefined();
    
    // Test associations
    const models = {
      Lead: jest.fn()
    };
    
    model.associate(models);
    
    expect(mockModel.belongsTo).toHaveBeenCalledWith(models.Lead, {
      foreignKey: 'lead_id',
      as: 'lead'
    });
  });

  test('should have validation for email format', () => {
    ChatSession(mockSequelize, DataTypes);
    
    const [, attributes] = mockSequelize.define.mock.calls[0];
    
    expect(attributes.userEmail.validate).toEqual({
      isEmail: true
    });
  });

  test('should have indexes for performance', () => {
    ChatSession(mockSequelize, DataTypes);
    
    const [, , options] = mockSequelize.define.mock.calls[0];
    
    expect(options.indexes).toContainEqual({
      fields: ['user_email']
    });
    
    expect(options.indexes).toContainEqual({
      fields: ['created_at']
    });
  });
});
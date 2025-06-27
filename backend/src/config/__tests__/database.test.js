const { Sequelize } = require('sequelize');
const { connectDatabase, testDatabaseConnection } = require('../database');

// Mock Sequelize
jest.mock('sequelize');

describe('Database Connection', () => {
  let mockAuthenticate;
  let mockSync;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock functions
    mockAuthenticate = jest.fn();
    mockSync = jest.fn();
    
    // Mock Sequelize constructor
    Sequelize.mockImplementation(() => ({
      authenticate: mockAuthenticate,
      sync: mockSync,
      close: jest.fn()
    }));
  });

  describe('testDatabaseConnection', () => {
    test('should return true when connection is successful', async () => {
      mockAuthenticate.mockResolvedValue();
      
      const result = await testDatabaseConnection();
      
      expect(result).toBe(true);
      expect(mockAuthenticate).toHaveBeenCalled();
    });

    test('should return false when connection fails', async () => {
      mockAuthenticate.mockRejectedValue(new Error('Connection failed'));
      
      const result = await testDatabaseConnection();
      
      expect(result).toBe(false);
      expect(mockAuthenticate).toHaveBeenCalled();
    });

    test('should handle invalid database URL gracefully', async () => {
      const result = await testDatabaseConnection('invalid-url');
      
      expect(result).toBe(false);
    });
  });

  describe('connectDatabase', () => {
    test('should successfully connect and sync database', async () => {
      mockAuthenticate.mockResolvedValue();
      mockSync.mockResolvedValue();
      
      const sequelize = await connectDatabase();
      
      expect(sequelize).toBeDefined();
      expect(mockAuthenticate).toHaveBeenCalled();
      expect(mockSync).toHaveBeenCalledWith({ alter: true });
    });

    test('should throw error when connection fails', async () => {
      mockAuthenticate.mockRejectedValue(new Error('Authentication failed'));
      
      await expect(connectDatabase()).rejects.toThrow('Authentication failed');
    });

    test('should use DATABASE_URL from environment', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mockAuthenticate.mockResolvedValue();
      mockSync.mockResolvedValue();
      
      await connectDatabase();
      
      expect(Sequelize).toHaveBeenCalledWith(
        process.env.DATABASE_URL,
        expect.objectContaining({
          dialect: 'postgres',
          logging: false
        })
      );
    });

    test('should enable logging in development mode', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mockAuthenticate.mockResolvedValue();
      mockSync.mockResolvedValue();
      
      await connectDatabase();
      
      expect(Sequelize).toHaveBeenCalledWith(
        process.env.DATABASE_URL,
        expect.objectContaining({
          logging: console.log
        })
      );
    });
  });
});
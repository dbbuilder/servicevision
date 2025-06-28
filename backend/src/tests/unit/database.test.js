const { sequelize } = require('../../models');

describe('Database Connection Test', () => {
  test('should connect to test database', async () => {
    try {
      await sequelize.authenticate();
      expect(true).toBe(true);
    } catch (error) {
      console.error('Database connection failed:', error);
      expect(error).toBeNull();
    }
  });

  test('should be using sqlite in test mode', () => {
    expect(sequelize.options.dialect).toBe('sqlite');
    expect(sequelize.options.storage).toBe(':memory:');
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
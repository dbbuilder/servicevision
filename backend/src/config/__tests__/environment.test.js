const { loadEnvironmentConfig, validateEnvironment, getConfig } = require('../environment');

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear any cached config
    jest.resetModules();
    // Create a clean copy of env
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('loadEnvironmentConfig', () => {
    test('should load required environment variables', () => {
      // Set up test environment
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
      process.env.JWT_SECRET = 'test-jwt-secret';
      
      const config = loadEnvironmentConfig();
      
      expect(config.OPENAI_API_KEY).toBe('test-openai-key');
      expect(config.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test');
      expect(config.SENDGRID_API_KEY).toBe('test-sendgrid-key');
      expect(config.JWT_SECRET).toBe('test-jwt-secret');
    });

    test('should provide defaults for optional variables', () => {
      // Set only required vars
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.SENDGRID_API_KEY = 'test-key';
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.PORT; // Ensure PORT is not set
      
      const config = loadEnvironmentConfig();
      
      expect(config.PORT).toBe(3000);
      expect(config.NODE_ENV).toBe('test'); // In test environment
      expect(config.REDIS_URL).toBeNull();
      expect(config.APP_INSIGHTS_KEY).toBeNull();
    });

    test('should throw error for missing required variables', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => loadEnvironmentConfig()).toThrow('Missing required environment variable: OPENAI_API_KEY');
    });

    test('should parse numeric PORT correctly', () => {
      process.env.PORT = '8080';
      process.env.OPENAI_API_KEY = 'test';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.SENDGRID_API_KEY = 'test';
      process.env.JWT_SECRET = 'test';
      
      const config = loadEnvironmentConfig();
      
      expect(config.PORT).toBe(8080);
      expect(typeof config.PORT).toBe('number');
    });
  });

  describe('validateEnvironment', () => {
    test('should validate all required fields are present', () => {
      const validConfig = {
        OPENAI_API_KEY: 'test',
        DATABASE_URL: 'postgresql://test',
        SENDGRID_API_KEY: 'test',
        JWT_SECRET: 'test'
      };
      
      expect(() => validateEnvironment(validConfig)).not.toThrow();
    });

    test('should throw error for missing required field', () => {
      const invalidConfig = {
        OPENAI_API_KEY: 'test',
        DATABASE_URL: 'postgresql://test',
        // Missing SENDGRID_API_KEY
        JWT_SECRET: 'test'
      };
      
      expect(() => validateEnvironment(invalidConfig)).toThrow('Missing required environment variable: SENDGRID_API_KEY');
    });

    test('should validate DATABASE_URL format', () => {
      const invalidConfig = {
        OPENAI_API_KEY: 'test',
        DATABASE_URL: 'not-a-valid-url',
        SENDGRID_API_KEY: 'test',
        JWT_SECRET: 'test'
      };
      
      expect(() => validateEnvironment(invalidConfig)).toThrow('Invalid DATABASE_URL format');
    });

    test('should validate PORT is within valid range', () => {
      const configWithInvalidPort = {
        OPENAI_API_KEY: 'test',
        DATABASE_URL: 'postgresql://test',
        SENDGRID_API_KEY: 'test',
        JWT_SECRET: 'test',
        PORT: 70000 // Invalid port
      };
      
      expect(() => validateEnvironment(configWithInvalidPort)).toThrow('PORT must be between 1 and 65535');
    });
  });

  describe('getConfig', () => {
    test('should return cached config after first load', () => {
      process.env.OPENAI_API_KEY = 'test';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.SENDGRID_API_KEY = 'test';
      process.env.JWT_SECRET = 'test';
      
      const config1 = getConfig();
      const config2 = getConfig();
      
      expect(config1).toBe(config2); // Same reference
    });

    test('should provide typed config object', () => {
      process.env.OPENAI_API_KEY = 'test';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.SENDGRID_API_KEY = 'test';
      process.env.JWT_SECRET = 'test';
      process.env.CORS_ORIGIN = 'https://example.com';
      
      const config = getConfig();
      
      expect(config).toMatchObject({
        NODE_ENV: expect.any(String),
        PORT: expect.any(Number),
        DATABASE_URL: expect.any(String),
        OPENAI_API_KEY: expect.any(String),
        SENDGRID_API_KEY: expect.any(String),
        JWT_SECRET: expect.any(String),
        CORS_ORIGIN: expect.any(String)
      });
    });
  });
});
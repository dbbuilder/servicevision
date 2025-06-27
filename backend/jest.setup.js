// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/servicevision_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';

// Mock external services by default
jest.mock('openai');
jest.mock('@sendgrid/mail');

// Increase timeout for integration tests
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
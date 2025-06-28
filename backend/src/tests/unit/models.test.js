const { sequelize, ChatSession, Lead, Message, Drawing, DrawingEntry } = require('../../models');

describe('Models Loading Test', () => {
  test('should load all required models', () => {
    expect(ChatSession).toBeDefined();
    expect(Lead).toBeDefined();
    expect(Message).toBeDefined();
    expect(Drawing).toBeDefined();
    expect(DrawingEntry).toBeDefined();
  });

  test('should have correct model names', () => {
    expect(ChatSession.name).toBe('ChatSession');
    expect(Lead.name).toBe('Lead');
    expect(Message?.name).toBe('Message');
  });
});
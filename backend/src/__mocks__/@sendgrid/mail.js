// Mock for @sendgrid/mail
const sgMail = {
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'test-msg-id' } }])
};

module.exports = sgMail;
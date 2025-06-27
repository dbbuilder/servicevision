// Test database configuration
module.exports = {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    underscored: true,
    timestamps: true
  }
};
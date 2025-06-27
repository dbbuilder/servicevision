// Redis Client Utility
// Placeholder for Redis connection management

let redisClient = null;

function getRedisClient() {
  return redisClient;
}

function setRedisClient(client) {
  redisClient = client;
}

module.exports = {
  getRedisClient,
  setRedisClient
};
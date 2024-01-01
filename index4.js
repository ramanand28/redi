const express = require('express');
const { graphqlHTTP } = require('graphql-http');
const { buildSchema } = require('graphql');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
app.use(cors());

// Initialize Redis client
const redisClient = new Redis({
  host: "ramsredis-jnwy7y.serverless.use1.cache.amazonaws.com",
  port: 6379,
});

// Read the JSON data from the file
const customers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8'));

// Construct a schema using GraphQL schema language
const schema = buildSchema(`
  type Customer {
    name: String
    id: Int
    price: Float
  }

  type Query {
    customers: [Customer]
  }
`);

// The root provides a resolver function for each API endpoint
const root = {
  customers: async () => {
    const cacheKey = 'customers';
    try {
      const pingResponse = await redisClient.ping();
      console.log('Redis PING response:', pingResponse); // Should log "PONG" if successful

      let data = await redisClient.get(cacheKey);
      if (data) {
        return JSON.parse(data); // Return data from cache
      } else {
        // Fetch and cache the data if not present in the cache
        data = customers; // Using local data as a placeholder
        await redisClient.set(cacheKey, JSON.stringify(data)); // Cache the result
        return data;
      }
    } catch (error) {
      console.error('Error accessing Redis cache:', error);
      throw new Error('Error accessing cache');
    }
  },
};

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

app.listen(4000, () => {
  console.log('Running a GraphQL API server at http://localhost:4000/graphql');
});

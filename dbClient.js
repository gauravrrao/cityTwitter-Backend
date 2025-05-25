// dbClient.js
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_4aQqVF1blBYC@ep-polished-king-a4npbeck-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error', err.stack));

module.exports = client;

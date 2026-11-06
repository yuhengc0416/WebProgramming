require('dotenv').config();

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        ca: fs.readFileSync(
            path.join(__dirname, 'ca.pem')
        ),
        rejectUnauthorized: true
    },

    connectTimeout: 20000
});

db.on('error', (err) => {
    console.error('Database error:', err.message);
});

db.connect((err) => {
    if (err) {
        console.error('Connection failed:', err.message);
        return;
    }

    console.log('Successfully connected to Aiven MySQL!');
});

// Allow server.js to use the database connection.
module.exports = db;

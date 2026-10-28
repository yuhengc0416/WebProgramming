
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

// Serve login and registration pages.
app.use('/auth', express.static(path.join(__dirname, 'auth')));

// Serve your existing website files.
for (const name of [
    'index.html',
    'about_sheet.html',
    'style_sheet.css',
    'external_stylesheet.css',
    'theme.js'
]) {
    app.get('/' + name, (req, res) => {
        res.sendFile(path.join(__dirname, name));
    });
}

app.use('/images', express.static(path.join(__dirname, 'images')));

// Password hashing.
const hashRounds = 100000;
const hashLength = 64;
const passwordSalt = 'league-tracker-salt';

function hashPassword(password) {
    return crypto.pbkdf2Sync(
        password,
        passwordSalt,
        hashRounds,
        hashLength,
        'sha512'
    ).toString('hex');
}

// Register a new user.
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.send(`
            <p>Username, e-mail, and password are required.</p>
            <a href="/auth/register.html">Back to registration</a>
        `);
    }

    const hashedPassword = hashPassword(password);

    const sql = `
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [username, email, hashedPassword], (err) => {
        if (err) {
            console.error('Registration error:', err.message);

            if (err.code === 'ER_DUP_ENTRY') {
                return res.send(`
                    <p>Username or e-mail already registered.</p>
                    <a href="/auth/register.html">Try again</a>
                `);
            }

            return res.status(500).send(
                'There was an error registering your account.'
            );
        }

        res.send(`
            <p>You have successfully registered</p>
            <a href="/auth/login.html">Go to login</a>
        `);
    });
});

// Login.
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send(`
            <p>The login credentials were incorrect.</p>
            <a href="/auth/login.html">Back to login</a>
        `);
    }

    const sql = `
        SELECT username, password
        FROM users
        WHERE username = ?
    `;

    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Login error:', err.message);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            return res.send(`
                <p>The login credentials were incorrect.</p>
                <a href="/auth/login.html">Back to login</a>
            `);
        }

        const hashedPassword = hashPassword(password);

        if (hashedPassword !== results[0].password) {
            return res.send(`
                <p>The login credentials were incorrect.</p>
                <a href="/auth/login.html">Back to login</a>
            `);
        }

        res.send('<p>You have logged in successfully</p>');
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

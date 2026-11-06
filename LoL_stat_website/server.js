const express = require('express');
const crypto = require('crypto');
const path = require('path');
const session = require('express-session');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = 3000;

// Allows Express to read data submitted through HTML forms
app.use(express.urlencoded({ extended: true }));

// Creates a session when a user successfully logs in
app.use(session({
    name: 'league.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 1000 // Session lasts for 1 hour
    }
}));

// Serves login.html, register.html, and auth.css
// from the login folder
app.use('/login', express.static(
    path.join(__dirname, 'auth')
));

// Serves your existing League Tracker website files
const publicFiles = [
    'index.html',
    'about_sheet.html',
    'style_sheet.css',
    'external_stylesheet.css',
    'theme.js'
];

publicFiles.forEach((file) => {
    app.get('/' + file, (req, res) => {
        res.sendFile(path.join(__dirname, file));
    });
});

// Allows images to load on the website
app.use('/images', express.static(
    path.join(__dirname, 'images')
));

// Redirects the homepage to index.html
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Password hashing settings from the previous assignment
// These settings must match the passwords already stored in MySQL
const hashRounds = 100000;
const hashLength = 64;
const passwordSalt = 'league-tracker-salt';

// Converts a plain-text password into a hashed password
function hashPassword(password) {
    return crypto.pbkdf2Sync(
        password,
        passwordSalt,
        hashRounds,
        hashLength,
        'sha512'
    ).toString('hex');
}

// Prevents special HTML characters from being interpreted as HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
        const characters = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return characters[char];
    });
}

// --------------------------------------------------
// REGISTER
// Registers a new user and stores their information
// in the MySQL users table
// --------------------------------------------------
app.post('/register', (req, res) => {

    const { username, email, password } = req.body;

    // Makes sure all required fields are entered
    if (!username || !email || !password) {
        return res.send(`
            <p>Username, e-mail, and password are required.</p>
            <a href="/login/register.html">Back to registration</a>
        `);
    }

    // Hashes the password before inserting it into MySQL
    const hashedPassword = hashPassword(password);

    const sql = `
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
    `;

    // Saves the new user's information in the database
    db.query(sql, [username, email, hashedPassword], (err) => {

        if (err) {
            console.error('Registration error:', err.message);

            // Checks whether username or email already exists
            if (err.code === 'ER_DUP_ENTRY') {
                return res.send(`
                    <p>Username or e-mail already registered.</p>
                    <a href="/login/register.html">Try again</a>
                `);
            }

            return res.status(500).send(
                'There was an error registering your account.'
            );
        }

        // Displays registration success and login link
        res.send(`
            <p>You have successfully registered</p>
            <a href="/login/login.html">Go to login</a>
        `);
    });
});

// --------------------------------------------------
// LOGIN
// Verifies username and password, then creates
// a session and redirects to the main website
// --------------------------------------------------
app.post('/login', (req, res) => {

    const { username, password } = req.body;

    // Checks for missing login information
    if (!username || !password) {
        return res.send(`
            <p>The login credentials were incorrect.</p>
            <a href="/login/login.html">Back to login</a>
        `);
    }

    // Looks up the user's information in MySQL
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

        // Checks if the username exists
        if (results.length === 0) {
            return res.send(`
                <p>The login credentials were incorrect.</p>
                <a href="/login/login.html">Back to login</a>
            `);
        }

        // Hashes the entered password
        const hashedPassword = hashPassword(password);

        // Compares the entered password with the stored hash
        if (hashedPassword !== results[0].password) {
            return res.send(`
                <p>The login credentials were incorrect.</p>
                <a href="/login/login.html">Back to login</a>
            `);
        }

        // Creates a new session after successful login
        req.session.regenerate((sessionErr) => {

            if (sessionErr) {
                console.error('Session error:', sessionErr.message);

                return res.status(500).send(
                    'Login session error.'
                );
            }

            // Stores the logged-in user's username in the session
            req.session.username = results[0].username;

            // Saves the session before redirecting
            req.session.save((saveErr) => {

                if (saveErr) {
                    console.error('Session save error:', saveErr.message);

                    return res.status(500).send(
                        'Login session error.'
                    );
                }

                // NEW: Automatically sends the user to the
                // League Tracker homepage after successful login
                res.redirect('/index.html');
            });
        });
    });
});

// --------------------------------------------------
// PROFILE
// Displays the username stored in the session
// --------------------------------------------------
app.get('/profile', (req, res) => {

    // Checks if the user is currently logged in
    if (!req.session.username) {
        return res.status(401).send(`
            <h1>You are not logged in</h1>
            <p>Please log in to view your profile.</p>
            <a href="/login/login.html">Login here</a>
        `);
    }

    // Retrieves and safely displays the saved username
    const username = escapeHTML(req.session.username);

    // Generates the profile page
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport"
                  content="width=device-width, initial-scale=1.0">

            <title>Profile - Personal League Tracker</title>

            <!-- Uses the existing login CSS -->
            <link rel="stylesheet" href="/login/auth.css">
        </head>
        <body>

            <main class="auth-card">

                <h1>Your Profile</h1>

                <!-- Displays the username stored in the session -->
                <p>Welcome, ${username}!</p>

                <p>
                    Your username is stored in your login session.
                </p>

                <!-- Returns to the main League Tracker website -->
                <p>
                    <a href="/index.html">
                        Go to League Tracker
                    </a>
                </p>

                <!-- Logs out and destroys the session -->
                <p>
                    <a href="/logout">Logout</a>
                </p>

            </main>

        </body>
        </html>
    `);
});

// --------------------------------------------------
// LOGOUT
// Destroys the session and removes the session cookie
// --------------------------------------------------
app.get('/logout', (req, res) => {

    // Deletes the user's active session
    req.session.destroy((err) => {

        if (err) {
            console.error('Logout error:', err.message);

            return res.status(500).send(
                'There was an error logging out.'
            );
        }

        // Clears the session cookie from the browser
        res.clearCookie('league.sid', {
            path: '/'
        });

        // Displays a logout confirmation
        res.send(`
            <h1>You have logged out successfully</h1>

            <p>Your session has been destroyed.</p>

            <a href="/login/login.html">Login again</a>
            <br>
            <a href="/index.html">Back to homepage</a>
        `);
    });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

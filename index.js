import express from "express";
import bodyParser from "body-parser";
import session from 'express-session';
import pg from "pg";
import bcrypt from 'bcryptjs'; 
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "portfolio_db_gywm_user",
    host: "cojpg0ud3nmc73bvurtg-a.oregon-postgres.render.com",
    database:"portfolio_db_gywm",
    password: "2IUgqIKtdo2xGyYXdntw9Wl2k2doye09",
    port: "5432",
    ssl: {
        rejectUnauthorized: false, // Set to false if you're using self-signed certificates
      },
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: 'your_secret_key', // Change this to a random string
    resave: false,
    saveUninitialized: true
}));

// Middleware to set userId session variable (should come before authentication middleware)
app.use(async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            res.locals.isAuthenticated = true;
        } else {
            res.locals.isAuthenticated = false;
        }
        next();
    } catch (error) {
        console.error("Session error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Routes
app.get("/", async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM projects");
        const projects = results.rows;
        res.render("index.ejs", { 
            projects,
            isAuthenticated: res.locals.isAuthenticated
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs", {
        isAuthenticated: res.locals.isAuthenticated
    });
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // Form validation
    if (!username || !password) {
        return res.status(400).send("Username and password are required");
    }

    try {
        // Check if the user exists in the database
        const user = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (user.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        // Check if the password is correct
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).send("Invalid password");
        }

        // Set userId session variable
        req.session.userId = user.rows[0].uid;

        // Redirect to home page after successful login
        res.redirect("/");
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs", {
        isAuthenticated: res.locals.isAuthenticated
    });
});

app.post("/register", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    // Form validation
    if (!username || !email || !password) {
        return res.status(400).send("Username, email, and password are required");
    }

    try {
        // Check if the username or email already exists
        const userExists = await db.query("SELECT * FROM users WHERE username = $1 OR email = $2", [username, email]);
        if (userExists.rows.length > 0) {
            return res.status(400).send("Username or email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database and return the ID of the inserted row
        const result = await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING uid", [username, email, hashedPassword]);

        // Set userId session variable
        req.session.userId = result.rows[0].uid;

        // Redirect to home page
        res.redirect("/");
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/create", (req, res) => {
    res.render("create.ejs", {
        isAuthenticated: res.locals.isAuthenticated
    });
});

app.post("/create-project", async (req, res) => {
    try {
        // Ensure user is authenticated
        if (!req.session.userId) {
            return res.status(401).send("Unauthorized");
        }

        // Extract project data from request body
        const title = req.body.title;
        const description = req.body.description;
        const startDate = req.body.start_date;
        const endDate = req.body.end_date;
        const phase = req.body.phase;

        // Perform form validation
        if (!title || !description) {
            return res.status(400).send("Title and description are required");
        }

        // Insert project into the database
        await db.query("INSERT INTO projects (title, short_description, uid, start_date, end_date, phase) VALUES ($1, $2, $3, $4, $5, $6)", [title, description, req.session.userId, startDate, endDate, phase]);

        // Redirect to home page
        res.redirect("/");
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/post/:project_id", async (req, res) => {
    const project_id = req.params.project_id;
    try {
        const result = await db.query("SELECT * FROM projects WHERE pid = $1", [project_id]);
        const project = result.rows[0];
        res.render("post.ejs", {
            project,
            isAuthenticated: res.locals.isAuthenticated
        });
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            res.status(500).send("Internal Server Error");
        } else {
            // Redirect to the home page after logout
            res.redirect("/");
        }
    });
});

app.listen(port, () => {
    console.log("Running on Port 3000");
});

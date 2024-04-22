import express from "express";
import bodyParser from "body-parser";
import session from 'express-session';
import pg from "pg";
import bcrypt from 'bcrypt';

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "IAD_Portfolio",
    password: "#tesanORA3107",
    port: "5433"
})

db.connect();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: 'your_secret_key', // Change this to a random string
    resave: false,
    saveUninitialized: true
    
}));

// Middleware to set userId session variable (should come before authentication middleware)
app.use((req, res, next) => {
    if (req.session && req.session.userId) {
        res.locals.isAuthenticated = true;
    } else {
        res.locals.isAuthenticated = false;
    }
    next();
});
// Middleware for authentication (should come after session middleware)
app.use((req, res, next) => {
    if (res.locals.isAuthenticated) {
        // User is authenticated, proceed to next middleware
        next();
    } else {
        // User is not authenticated, handle accordingly (e.g., redirect to login page)
        res.redirect("/login");
    }
});





app.get("/", async (req, res) => {
    try {
    const results = await db.query("SELECT * FROM projects");
    const isAuthenticated = req.session.userId ? true : false;
    let projects = results.rows;
    res.render("index.ejs",  {
        projects: projects,
        isAuthenticated : isAuthenticated
    });
}catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).send("Internal Server Error");
}
})

app.get("/", async (req, res) => {
    try {
        const projects = await db.query("SELECT * FROM projects");
        const isAuthenticated = req.session.userId ? true : false;
        res.render("index.ejs", { projects, isAuthenticated });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/login", (req, res) => {
    const isAuthenticated = req.session.userId ? true : false;
    res.render("login.ejs", {
        isAuthenticated: isAuthenticated
    });
})

app.get("/signup", (req, res) => {
    const isAuthenticated = req.session.userId ? true : false;
    res.render("signup.ejs", {
        isAuthenticated: isAuthenticated
    });
})

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

// Get the ID of the last inserted row
const userId = result.rows[0].id;

        // Redirect to home page
        res.redirect("/");
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.get("/create", (req, res) => {
    res.render("create.ejs");
})

// app.get("/posts/:id", async (req, res) => {
//     const id = req.params.id;
//     const result = await db.query("SELECT * from projects WHERE pid = $1", [id]);
//     const project = result.rows[0];
//     console.log(project);
//     res.render("post.ejs", {
//         project: project
//     });
// })

app.get("/post/:project_id", async (req, res) => {
    const id = req.params.project_id;
    const result = await db.query("SELECT * from projects WHERE pid = $1", [id]);
    const project = result.rows[0];
    console.log(project);
    res.render("post.ejs", {
        project: project
    });
})

app.listen(port, () => {
    console.log("Running on Port 3000")
})
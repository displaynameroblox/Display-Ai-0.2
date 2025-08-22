 import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 2000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "catboy-secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

const users = {
  feras: { password: "1234", aiName: "Display", personality: "" },
};

function requireLogin(req, res, next) {
  if (!req.session.username) return res.redirect("/login");
  next();
}

app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    req.session.username = username;
    return res.redirect("/");
  }
  res.render("login", { error: "Invalid username or password" });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/", requireLogin, (req, res) => {
  const user = users[req.session.username];
  res.render("dashboard", {
    username: req.session.username,
    user,
    isOwner: req.session.username === "feras",
  });
});

app.listen(PORT, () =>
  console.log(`✅ Website server running on port ${PORT}`)
);

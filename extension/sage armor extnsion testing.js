// Path traversal
const fs = require("fs");
const requestedFile = req.body.filename;
const fileContents = fs.readFileSync("../" + requestedFile, "utf8");

// Weak cryptography
const crypto = require("crypto");
const weakHash = crypto.createHash("md5").update(req.body.password).digest("hex");

// Authentication bypass
function checkAdmin(req, res, next) {
  if (req.query.admin) {
    return next();
  }
  res.status(403).send("Forbidden");
}

// CORS misconfiguration
app.use(cors({ origin: "*" }));

// Open redirect
app.get("/go", (req, res) => {
  res.redirect(req.query.next);
});

// Missing validation
app.get("/profile", (req, res) => {
  res.send(req.body.displayName);
});

// Server-side request forgery
const axios = require("axios");
axios.get(req.body.url);

// Prototype pollution
const settings = {};
Object.assign(settings, req.body);

// Regular expression denial of service
const pattern = new RegExp(req.query.pattern);
pattern.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaa!");

// Unsafe dynamic code execution
eval(req.body.script);

/**
 * Simple backend for the SGP website.
 * - Serves index.html / styles.css / script.js / images
 * - Stores user accounts in users.json (created automatically on first run)
 * - Passwords are never stored in plain text: each one is hashed with a
 *   random salt using Node's built-in crypto module (PBKDF2).
 *
 * Requires only Node.js — no npm install needed.
 * Run with:  node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = 3000;
const ROOT_DIR = __dirname;
const USERS_FILE = path.join(ROOT_DIR, 'users.json');

/* ---------- users.json helpers ---------- */

function ensureUsersFile(){
  if(!fs.existsSync(USERS_FILE)){
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function readUsers(){
  ensureUsersFile();
  try{
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.users) ? data.users : [];
  } catch(err){
    return [];
  }
}

function writeUsers(users){
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

function findUserByEmail(users, email){
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

/* ---------- password hashing (PBKDF2 + per-user salt) ---------- */

function hashPassword(password, salt){
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function makeSalt(){
  return crypto.randomBytes(16).toString('hex');
}

/* ---------- tiny helpers ---------- */

function sendJSON(res, statusCode, data){
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readRequestBody(req){
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if(body.length > 1e6){ // 1MB safety cap
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

/* ---------- API route handlers ---------- */

async function handleSignup(req, res){
  let body;
  try{
    body = JSON.parse(await readRequestBody(req));
  } catch(err){
    return sendJSON(res, 400, { success:false, message:'Invalid request body.' });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const password = body.password || '';

  if(!name || !email || !password){
    return sendJSON(res, 400, { success:false, message:'Name, email, and password are all required.' });
  }
  if(password.length < 6){
    return sendJSON(res, 400, { success:false, message:'Password must be at least 6 characters.' });
  }

  const users = readUsers();

  // ----- Verify if the account already exists -----
  if(findUserByEmail(users, email)){
    return sendJSON(res, 409, { success:false, message:'An account with this email already exists. Please log in instead.' });
  }

  // ----- Doesn't exist yet: create it -----
  const salt = makeSalt();
  const passwordHash = hashPassword(password, salt);

  users.push({
    name,
    email,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  });
  writeUsers(users);

  return sendJSON(res, 201, { success:true, message:'Account created.', user:{ name, email } });
}

async function handleLogin(req, res){
  let body;
  try{
    body = JSON.parse(await readRequestBody(req));
  } catch(err){
    return sendJSON(res, 400, { success:false, message:'Invalid request body.' });
  }

  const email = (body.email || '').trim();
  const password = body.password || '';

  if(!email || !password){
    return sendJSON(res, 400, { success:false, message:'Email and password are required.' });
  }

  const users = readUsers();
  const user = findUserByEmail(users, email);

  // ----- Verify if the account exists -----
  if(!user){
    return sendJSON(res, 404, { success:false, message:'No account found with this email. Please sign up first.' });
  }

  // ----- Exists: verify the password -----
  const computedHash = hashPassword(password, user.salt);
  if(computedHash !== user.passwordHash){
    return sendJSON(res, 401, { success:false, message:'Incorrect password.' });
  }

  return sendJSON(res, 200, { success:true, message:'Login successful.', user:{ name:user.name, email:user.email } });
}

/* ---------- static file serving ---------- */

function serveStatic(req, res, pathname){
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, ''); // basic traversal guard
  filePath = path.join(ROOT_DIR, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if(err){
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + pathname);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

/* ---------- server ---------- */

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if(pathname === '/api/signup' && req.method === 'POST'){
    try{ await handleSignup(req, res); }
    catch(err){ sendJSON(res, 500, { success:false, message:'Server error.' }); }
    return;
  }

  if(pathname === '/api/login' && req.method === 'POST'){
    try{ await handleLogin(req, res); }
    catch(err){ sendJSON(res, 500, { success:false, message:'Server error.' }); }
    return;
  }

  serveStatic(req, res, pathname);
});

ensureUsersFile();

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📄 Credentials are stored in: ${USERS_FILE}`);
});

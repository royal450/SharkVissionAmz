// build.js
// Reads .env → generates public/config.js
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const envPath = path.join(ROOT, '.env');
const outputPath = path.join(ROOT, 'public', 'config.js');

// --- Check .env exists ---
if (!fs.existsSync(envPath)) {
  console.error('❌ .env not found at: ' + envPath);
  process.exit(1);
}

// --- Parse .env ---
const env = {};
fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
});

// --- Required keys ---
const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_MEASUREMENT_ID',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID'
];

const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.error('❌ Missing in .env:');
  missing.forEach(k => console.error('   - ' + k));
  process.exit(1);
}

// --- Generate config.js ---
const output = `// public/config.js
// AUTO-GENERATED from .env — DO NOT EDIT

window.SHOPMAZE_CONFIG = {
  firebase: {
    apiKey: "${env.FIREBASE_API_KEY}",
    authDomain: "${env.FIREBASE_AUTH_DOMAIN}",
    databaseURL: "${env.FIREBASE_DATABASE_URL}",
    projectId: "${env.FIREBASE_PROJECT_ID}",
    storageBucket: "${env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${env.FIREBASE_APP_ID}",
    measurementId: "${env.FIREBASE_MEASUREMENT_ID}"
  },
  telegram: {
    botToken: "${env.TELEGRAM_BOT_TOKEN}",
    chatId: "${env.TELEGRAM_CHAT_ID}"
  },
  site: {
    name: "ShopMaze",
    url: "https://shopmaze.web.app"
  },
  year: ${new Date().getFullYear()},
  yearText: "${new Date().getFullYear()}",
  updated: "${new Date().toISOString().split('T')[0]}"
};
`;

// --- Ensure public/ exists ---
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, 'utf-8');

console.log('✅ public/config.js generated!');
console.log('   → ' + outputPath);

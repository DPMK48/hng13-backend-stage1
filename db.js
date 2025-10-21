// db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// default data file
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = process.env.DATABASE_FILE || path.join(DATA_DIR, 'strings.json');

// ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// load or initialize DB (an object mapping id -> record)
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf8');
      return {};
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to load DB file:', err);
    return {};
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// In-memory cache loaded at start (we write-through on each change)
let DB = loadDb();

/**
 * getById(id) -> record or null
 */
export function getById(id) {
  return DB[id] ?? null;
}

/**
 * insert(record) -> true on success, throws if id exists
 * record must be the full object including id, value, properties, created_at
 */
export function insertRecord(record) {
  if (!record || !record.id) throw new Error('Invalid record');
  if (DB[record.id]) throw new Error('EXISTS');
  DB[record.id] = record;
  saveDb(DB);
}

/**
 * deleteById(id) -> true if deleted, false if not found
 */
export function deleteById(id) {
  if (!DB[id]) return false;
  delete DB[id];
  saveDb(DB);
  return true;
}

/**
 * listRecords(filters) -> array of records matching filters
 * Supported filters object keys: is_palindrome (bool), min_length (int), max_length (int), word_count (int), contains_character (single char)
 */
export function listRecords(filters = {}) {
  const records = Object.values(DB);

  return records.filter(r => {
    const props = r.properties ?? {};
    if (filters.is_palindrome !== undefined) {
      if (props.is_palindrome !== Boolean(filters.is_palindrome)) return false;
    }
    if (filters.min_length !== undefined) {
      if (props.length < Number(filters.min_length)) return false;
    }
    if (filters.max_length !== undefined) {
      if (props.length > Number(filters.max_length)) return false;
    }
    if (filters.word_count !== undefined) {
      if (props.word_count !== Number(filters.word_count)) return false;
    }
    if (filters.contains_character !== undefined) {
      const ch = String(filters.contains_character);
      const freq = props.character_frequency_map ?? {};
      if (!Object.prototype.hasOwnProperty.call(freq, ch)) return false;
    }
    return true;
  }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); // newest first
}

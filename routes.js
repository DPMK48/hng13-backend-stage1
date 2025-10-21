// routes.js
import express from 'express';
import { analyzeString, sha256Hex, parseNaturalLanguage } from './utils.js';
import { getById, insertRecord, listRecords, deleteById } from './db.js';

const router = express.Router();

/*
 * POST /strings
 * Body: { "value": "string to analyze" }
 */
router.post('/strings', (req, res) => {
  try {
    if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, 'value')) {
      return res.status(400).json({ error: '"value" field is required' });
    }
    if (typeof req.body.value !== 'string') {
      return res.status(422).json({ error: '"value" must be a string' });
    }

    const value = req.body.value;
    const props = analyzeString(value);
    const id = props.sha256_hash;

    // Check duplicate
    if (getById(id)) {
      return res.status(409).json({ error: 'String already exists in the system' });
    }

    const created_at = new Date().toISOString();
    const record = {
      id,
      value,
      properties: props,
      created_at
    };

    insertRecord(record);

    return res.status(201).json(record);
  } catch (err) {
    if (err.message === 'EXISTS') return res.status(409).json({ error: 'String already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/*
 * GET /strings  with query filters
 * Example: /strings?is_palindrome=true&min_length=5&max_length=20&word_count=2&contains_character=a
 */
router.get('/strings', (req, res) => {
  try {
    // Validate query params
    const q = req.query ?? {};
    const filters = {};

    if (q.is_palindrome !== undefined) {
      const v = String(q.is_palindrome).toLowerCase();
      if (v !== 'true' && v !== 'false') return res.status(400).json({ error: 'is_palindrome must be true or false' });
      filters.is_palindrome = v === 'true';
    }
    if (q.min_length !== undefined) {
      const n = Number(q.min_length);
      if (Number.isNaN(n)) return res.status(400).json({ error: 'min_length must be an integer' });
      filters.min_length = n;
    }
    if (q.max_length !== undefined) {
      const n = Number(q.max_length);
      if (Number.isNaN(n)) return res.status(400).json({ error: 'max_length must be an integer' });
      filters.max_length = n;
    }
    if (q.word_count !== undefined) {
      const n = Number(q.word_count);
      if (Number.isNaN(n)) return res.status(400).json({ error: 'word_count must be an integer' });
      filters.word_count = n;
    }
    if (q.contains_character !== undefined) {
      const ch = String(q.contains_character);
      if (ch.length !== 1) return res.status(400).json({ error: 'contains_character must be a single character' });
      filters.contains_character = ch;
    }

    if (filters.min_length !== undefined && filters.max_length !== undefined) {
      if (filters.min_length > filters.max_length) return res.status(400).json({ error: 'min_length cannot be greater than max_length' });
    }

    const data = listRecords(filters);
    return res.status(200).json({ data, count: data.length, filters_applied: filters });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/*
 * GET /strings/filter-by-natural-language?query=...
 */
router.get('/strings/filter-by-natural-language', (req, res) => {
  try {
    const q = req.query.query;
    const parsed = parseNaturalLanguage(q);

    // Reuse listRecords by translating parsed filters directly
    const data = listRecords(parsed);
    return res.status(200).json({
      data,
      count: data.length,
      interpreted_query: {
        original: q,
        parsed_filters: parsed
      }
    });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/*
 * GET /strings/:string_value
 * string_value is URL-encoded original string; decode, hash and find
 */
router.get('/strings/:string_value', (req, res) => {
  try {
    const raw = req.params.string_value ?? '';
    const decoded = decodeURIComponent(raw);
    const id = sha256Hex(decoded);
    const rec = getById(id);
    if (!rec) return res.status(404).json({ error: 'String does not exist in the system' });
    return res.status(200).json(rec);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL-encoded string' });
  }
});

/*
 * DELETE /strings/:string_value
 */
router.delete('/strings/:string_value', (req, res) => {
  try {
    const raw = req.params.string_value ?? '';
    const decoded = decodeURIComponent(raw);
    const id = sha256Hex(decoded);
    const ok = deleteById(id);
    if (!ok) return res.status(404).json({ error: 'String does not exist in the system' });
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL-encoded string' });
  }
});

export default router;

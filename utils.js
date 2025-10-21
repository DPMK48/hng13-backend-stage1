// utils.js
import crypto from 'crypto';

/**
 * Compute SHA-256 hex digest for a string (no normalization).
 */
export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Count characters using spread operator to correctly handle unicode code points.
 */
export function charLength(value) {
  return [...value].length;
}

/**
 * Build a frequency map: character -> count
 */
export function charFrequencyMap(value) {
  const map = {};
  for (const ch of value) {
    map[ch] = (map[ch] || 0) + 1;
  }
  return map;
}

/**
 * Count unique characters (case-sensitive by design)
 */
export function uniqueCharacters(value) {
  return new Set([...value]).size;
}

/**
 * Word count by splitting on whitespace. Empty or only-space -> 0
 */
export function wordCount(value) {
  if (!value) return 0;
  const tokens = value.trim().split(/\s+/);
  if (tokens.length === 1 && tokens[0] === '') return 0;
  return tokens.filter(Boolean).length;
}

/**
 * Palindrome check: case-insensitive but does NOT remove spaces/punctuation.
 * Empty string -> true.
 */
export function isPalindrome(value) {
  const lower = value.toLowerCase();
  const arr = [...lower];
  for (let i = 0, j = arr.length - 1; i < j; i++, j--) {
    if (arr[i] !== arr[j]) return false;
  }
  return true;
}

/**
 * analyzeString: returns the properties object required by the spec
 */
export function analyzeString(value) {
  const id = sha256Hex(value);
  const length = charLength(value);
  const freqMap = charFrequencyMap(value);
  const unique_characters = uniqueCharacters(value);
  const words = wordCount(value);
  const palindrome = isPalindrome(value);

  return {
    length,
    is_palindrome: palindrome,
    unique_characters,
    word_count: words,
    sha256_hash: id,
    character_frequency_map: freqMap
  };
}

/**
 * parseNaturalLanguage(query)
 * Simple deterministic parser for the examples in the spec.
 * Returns a filters object like { is_palindrome: true, word_count: 1, min_length: 11, contains_character: 'a' }
 * Throws { status, message } on parse failure or conflicting filters.
 */
export function parseNaturalLanguage(query) {
  if (!query || typeof query !== 'string') {
    throw { status: 400, message: 'query must be a non-empty string' };
  }

  const text = query.toLowerCase().trim();
  const filters = {};

  // Palindrome / palindromic
  if (/\bpalindromic\b|\bpalindrome\b/.test(text)) {
    filters.is_palindrome = true;
  }

  // Single word / one word
  if (/\bsingle word\b|\bone word\b/.test(text)) {
    filters.word_count = 1;
  }

  // "strings longer than N" -> min_length = N+1
  const longerMatch = text.match(/longer than (\d+)/);
  if (longerMatch) {
    const n = parseInt(longerMatch[1], 10);
    if (!Number.isNaN(n)) filters.min_length = n + 1;
  }

  // "at least N" -> min_length = N
  const atLeast = text.match(/at least (\d+)/);
  if (atLeast) {
    const n = parseInt(atLeast[1], 10);
    if (!Number.isNaN(n)) filters.min_length = Math.max(filters.min_length ?? 0, n);
  }

  // "shorter than N" -> max_length = N-1
  const shorterMatch = text.match(/shorter than (\d+)/);
  if (shorterMatch) {
    const n = parseInt(shorterMatch[1], 10);
    if (!Number.isNaN(n)) filters.max_length = n - 1;
  }

  // "containing the letter X" or "containing x"
  // Look for "containing the letter z" or 'containing "z"' or containing z
  let contains = null;
  const byPhrase = text.match(/containing the letter (\w)/);
  if (byPhrase) contains = byPhrase[1];
  if (!contains) {
    const simple = text.match(/containing ([a-z0-9])/);
    if (simple) contains = simple[1];
  }
  if (!contains) {
    const quoted = text.match(/['"]([a-z0-9])['"]/);
    if (quoted) contains = quoted[1];
  }
  // Heuristic: "first vowel" -> 'a'
  if (!contains && /first vowel/.test(text)) {
    contains = 'a';
  }
  if (contains) filters.contains_character = contains;

  if (Object.keys(filters).length === 0) {
    throw { status: 400, message: 'Unable to parse natural language query' };
  }

  if (filters.min_length !== undefined && filters.max_length !== undefined) {
    if (filters.min_length > filters.max_length) {
      throw { status: 422, message: 'Parsed filters are conflicting (min_length > max_length)' };
    }
  }

  return filters;
}

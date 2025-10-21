# String Analyzer Service (Stage 1)

A RESTful API that analyzes strings and stores their computed properties. Built with Node.js, Express, and a lightweight JSON file datastore.

## What it does

For each analyzed string, the service computes and stores:

- length: Number of characters (Unicode-aware)
- is_palindrome: Whether the string reads the same forward and backward (case-insensitive; whitespace/punctuation are not removed)
- unique_characters: Count of distinct characters (Unicode-aware)
- word_count: Number of words separated by whitespace
- sha256_hash: SHA-256 hash of the string (used as the unique id)
- character_frequency_map: Map of each character to its occurrence count

## Endpoints

Base URL (local): http://localhost:3000

- POST /strings
  - Body: { "value": "string to analyze" }
  - 201 Created → Returns full record
  - 409 Conflict → String already exists
  - 400 Bad Request → Missing "value"
  - 422 Unprocessable Entity → "value" is not a string

- GET /strings/{string_value}
  - 200 OK → Returns record for the requested string
  - 404 Not Found → String does not exist

- GET /strings
  - Query params: is_palindrome (true/false), min_length (int), max_length (int), word_count (int), contains_character (single character)
  - 200 OK → { data, count, filters_applied }
  - 400 Bad Request → Invalid query parameter types/values

- GET /strings/filter-by-natural-language?query=...
  - Supports examples:
    - "all single word palindromic strings" → word_count=1, is_palindrome=true
    - "strings longer than 10 characters" → min_length=11
    - "palindromic strings that contain the first vowel" → is_palindrome=true, contains_character=a (heuristic)
    - "strings containing the letter z" → contains_character=z
  - 200 OK → { data, count, interpreted_query: { original, parsed_filters } }
  - 400 Bad Request → Unable to parse query
  - 422 Unprocessable Entity → Conflicting filters (e.g., min_length > max_length)

- DELETE /strings/{string_value}
  - 204 No Content → Deleted
  - 404 Not Found → String does not exist

## Data model

Each stored record has the shape:

{
  "id": "<sha256 hex>",
  "value": "<original string>",
  "properties": {
    "length": <int>,
    "is_palindrome": <bool>,
    "unique_characters": <int>,
    "word_count": <int>,
    "sha256_hash": "<sha256 hex>",
    "character_frequency_map": { "<char>": <count>, ... }
  },
  "created_at": "<ISO timestamp>"
}

## Tech stack

- Node.js + Express
- Helmet for security headers, Morgan for logging
- File-based JSON storage (configurable path)

## Requirements

- Node.js 18+ recommended

## Setup and run locally

1. Install dependencies:

```bash
npm install
```

2. Create a .env file (optional):

```
# Folder where data file lives (default: <project>/data)
DATA_DIR=./data
# Override data file path (default: <DATA_DIR>/strings.json)
DATABASE_FILE=./data/strings.json
# Port (default: 3000)
PORT=3000
# NODE_ENV can be development or production
NODE_ENV=development
```

3. Start the server:

```bash
npm run dev
# or
npm start
```

The service will be available at http://localhost:3000

## Try it

- Create/Analyze:

```bash
curl -s -X POST http://localhost:3000/strings \
  -H 'Content-Type: application/json' \
  -d '{"value":"racecar"}' | jq
```

- Get specific string:

```bash
curl -s http://localhost:3000/strings/racecar | jq
```

- Filtered list:

```bash
curl -s 'http://localhost:3000/strings?is_palindrome=true&min_length=5&max_length=20&word_count=1' | jq
```

- Natural language filter:

```bash
curl -s 'http://localhost:3000/strings/filter-by-natural-language?query=all%20single%20word%20palindromic%20strings' | jq
```

- Delete:

```bash
curl -i -X DELETE http://localhost:3000/strings/racecar
```

## Notes

- Character counting and uniqueness are Unicode-aware.
- Palindrome check is case-insensitive and does not strip spaces/punctuation.
- Natural language parsing uses simple patterns and a heuristic for "first vowel" → 'a'.

## Project structure

backend-stage1/
- server.js: App bootstrap and middleware
- routes.js: Route handlers and validation
- utils.js: String analysis and NL query parsing
- db.js: JSON file-based storage
- data/: Data directory (auto-created); strings.json will be created on first write

## Deployment

You can deploy to platforms like Railway, Heroku, AWS, PXXL App, etc. Vercel and Render are not allowed. Ensure persistent storage is configured or mount a volume for the data file.

- Required environment variables: DATA_DIR and/or DATABASE_FILE (optional), PORT
- Start command: npm start

## Tests

Manual curl commands are provided above. You can also integrate a test framework (e.g., Jest + Supertest) if desired. For the scope of Stage 1, correctness verified via local requests is sufficient.

// Vercel serverless function entry point
// Using require since TypeScript compiles to CommonJS
let app;
try {
  app = require('../dist/server.js').default;
} catch (err) {
  // If the app fails to load (e.g. missing env vars, DB/Supabase config), return a clear error
  const express = require('express');
  app = express();
  app.use((_req, res) => {
    console.error('Serverless function failed to load:', err.message);
    res.status(503).json({
      error: 'Backend failed to start',
      message: process.env.NODE_ENV === 'production' ? 'Check server logs and environment variables.' : err.message,
      code: 'FUNCTION_INVOCATION_FAILED'
    });
  });
}
module.exports = app;

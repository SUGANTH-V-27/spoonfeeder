// Vercel serverless function entry point
// Using require since TypeScript compiles to CommonJS
const app = require('../dist/server.js').default;


// Export for Vercel - Vercel automatically handles Express apps
module.exports = app;

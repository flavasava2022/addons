const addonInterface = require('./addon');

// Export for Vercel serverless
module.exports = addonInterface;

// Also start server for local testing
if (require.main === module) {
  const { serveHTTP } = require('stremio-addon-sdk');
  const port = process.env.PORT || 7000;
  
  serveHTTP(addonInterface, { port: port }).then(() => {
    console.log(`TukTuk Cinema addon is running on http://localhost:${port}`);
    console.log(`Install it in Stremio with: http://localhost:${port}/manifest.json`);
  }).catch(err => {
    console.error('Failed to start addon:', err);
    process.exit(1);
  });
}

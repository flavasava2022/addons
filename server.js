const { serveHTTP } = require('stremio-addon-sdk');
const addonInterface = require('./addon');

// Default export for Vercel (REQUIRED)
module.exports = async (req, res) => {
  const url = req.url;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get the addon interface
  const addon = addonInterface.getInterface();
  
  // Handle manifest
  if (url === '/manifest.json' || url === '/') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(addon.manifest);
  }
  
  // Handle catalog
  const catalogMatch = url.match(/^\/catalog\/([^/]+)\/([^/]+)(?:\/(.+))?\.json$/);
  if (catalogMatch) {
    const [, type, id, extraStr] = catalogMatch;
    const extra = extraStr ? JSON.parse(decodeURIComponent(extraStr)) : {};
    
    try {
      const result = await addon.catalog.find(c => c.types.includes(type)).handler({ type, id, extra });
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  // Handle stream
  const streamMatch = url.match(/^\/stream\/([^/]+)\/(.+)\.json$/);
  if (streamMatch) {
    const [, type, id] = streamMatch;
    
    try {
      const result = await addon.stream.handler({ type, id: decodeURIComponent(id) });
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  // Handle meta
  const metaMatch = url.match(/^\/meta\/([^/]+)\/(.+)\.json$/);
  if (metaMatch) {
    const [, type, id] = metaMatch;
    
    try {
      const result = await addon.meta.handler({ type, id: decodeURIComponent(id) });
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  res.status(404).json({ error: 'Not found' });
};

// For local development
if (require.main === module) {
  const port = process.env.PORT || 7000;
  serveHTTP(addonInterface, { port: port }).then(() => {
    console.log(`TukTuk Cinema addon is running on http://localhost:${port}`);
    console.log(`Install it in Stremio with: http://localhost:${port}/manifest.json`);
  }).catch(err => {
    console.error('Failed to start addon:', err);
    process.exit(1);
  });
}

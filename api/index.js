const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

// Import your addon logic
const addonInterface = require('../addon');

// Default export for Vercel (REQUIRED)
export default async function handler(req, res) {
  const url = req.url;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const addon = addonInterface.getInterface();
    
    // Handle manifest
    if (url === '/' || url === '/manifest.json') {
      return res.status(200).json(addon.manifest);
    }
    
    // Handle catalog
    const catalogMatch = url.match(/^\/catalog\/([^/]+)\/([^/]+)(?:\/(.+))?\.json$/);
    if (catalogMatch) {
      const [, type, id, extraStr] = catalogMatch;
      const extra = extraStr ? JSON.parse(decodeURIComponent(extraStr)) : {};
      const result = await addon.catalog.find(c => c.types.includes(type)).handler({ type, id, extra });
      return res.status(200).json(result);
    }
    
    // Handle stream
    const streamMatch = url.match(/^\/stream\/([^/]+)\/(.+)\.json$/);
    if (streamMatch) {
      const [, type, id] = streamMatch;
      const result = await addon.stream.handler({ type, id: decodeURIComponent(id) });
      return res.status(200).json(result);
    }
    
    // Handle meta
    const metaMatch = url.match(/^\/meta\/([^/]+)\/(.+)\.json$/);
    if (metaMatch) {
      const [, type, id] = metaMatch;
      const result = await addon.meta.handler({ type, id: decodeURIComponent(id) });
      return res.status(200).json(result);
    }
    
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

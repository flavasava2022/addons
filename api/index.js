const addonInterface = require('../addon');

// Default export for Vercel
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Use the SDK's built-in request handler
  const manifest = addonInterface.manifest;
  const handlers = {
    catalog: addonInterface.interface?.catalog,
    stream: addonInterface.interface?.stream,
    meta: addonInterface.interface?.meta
  };

  const path = req.url.split('?')[0];

  try {
    // Manifest
    if (path === '/' || path === '/manifest.json') {
      return res.status(200).json(manifest);
    }

    // Parse the path
    const pathParts = path.replace('.json', '').split('/').filter(p => p);
    
    // Catalog: /catalog/{type}/{id} or /catalog/{type}/{id}/{extra}
    if (pathParts[0] === 'catalog' && pathParts.length >= 3) {
      const type = pathParts[1];
      const id = pathParts[2];
      const extra = pathParts[3] ? JSON.parse(decodeURIComponent(pathParts[3])) : {};
      
      if (handlers.catalog) {
        const result = await handlers.catalog({ type, id, extra });
        return res.status(200).json(result);
      }
    }

    // Stream: /stream/{type}/{id}
    if (pathParts[0] === 'stream' && pathParts.length >= 3) {
      const type = pathParts[1];
      const id = decodeURIComponent(pathParts.slice(2).join('/'));
      
      if (handlers.stream) {
        const result = await handlers.stream({ type, id });
        return res.status(200).json(result);
      }
    }

    // Meta: /meta/{type}/{id}
    if (pathParts[0] === 'meta' && pathParts.length >= 3) {
      const type = pathParts[1];
      const id = decodeURIComponent(pathParts.slice(2).join('/'));
      
      if (handlers.meta) {
        const result = await handlers.meta({ type, id });
        return res.status(200).json(result);
      }
    }

    return res.status(404).json({ error: 'Not found', path });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

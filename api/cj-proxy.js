export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, CJ-Access-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const endpoint = req.query.endpoint || '';
  const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
  
  try {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (req.headers['cj-access-token']) {
      options.headers['CJ-Access-Token'] = req.headers['cj-access-token'];
    }

    if (req.method !== 'GET' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(`${CJ_BASE}${endpoint}`, options);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

'use strict';

/**
 * IP Geolocation via ip-api.com (free tier, HTTP only, 45 req/min).
 * Main-process only — CSP does not apply to Node.js http requests.
 */

const http = require('http');

const FIELDS = 'status,message,country,countryCode,regionName,city,isp,org,as,lat,lon,timezone,query';

function geoLookup(ip) {
  return new Promise((resolve) => {
    const req = http.get(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${FIELDS}`,
      { timeout: 6000 },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { resolve({ status: 'fail', message: 'parse error', query: ip }); }
        });
      }
    );
    req.on('error', (err) => resolve({ status: 'fail', message: err.message, query: ip }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'fail', message: 'timeout', query: ip }); });
  });
}

/**
 * Batch lookup — uses ip-api.com /batch endpoint (max 100 IPs per request).
 * @param {string[]} ips
 * @returns {Promise<object[]>}
 */
function geoBatch(ips) {
  const queries = ips
    .filter(ip => ip && ip !== '*' && ip !== '???' && typeof ip === 'string')
    .slice(0, 100);

  if (queries.length === 0) return Promise.resolve([]);

  const body = JSON.stringify(queries.map(ip => ({ query: ip, fields: FIELDS })));

  return new Promise((resolve) => {
    const options = {
      hostname: 'ip-api.com',
      path: '/batch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve([]); }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
    req.write(body);
    req.end();
  });
}

module.exports = { geoLookup, geoBatch };

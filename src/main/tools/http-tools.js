'use strict';

const https = require('https');
const http = require('http');
const dns = require('dns').promises;

/**
 * Make an HTTP/HTTPS request and return timing + status.
 * @param {string} url - sanitized URL
 * @param {string} [method='GET']
 * @returns {Promise<{ status, headers, body, timing }>}
 */
function httpRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const start = Date.now();

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: method.toUpperCase(),
        headers: {
          'User-Agent': 'Net-Architect/1.0',
          'Accept': '*/*',
        },
        timeout: 10000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyBuf = Buffer.concat(chunks);
          const timing = Date.now() - start;
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: bodyBuf.toString('utf8').slice(0, 4096), // cap at 4KB
            size: bodyBuf.length,
            timing,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * DNS lookup with full record data.
 * @param {string} hostname
 * @param {string} [type='A'] - A, AAAA, MX, TXT, NS, PTR, CNAME, SOA
 * @returns {Promise<{ hostname, type, records, timing }>}
 */
async function dnsQuery(hostname, type = 'A') {
  const start = Date.now();
  const t = type.toUpperCase();

  let records;
  try {
    switch (t) {
      case 'A':    records = await dns.resolve4(hostname); break;
      case 'AAAA': records = await dns.resolve6(hostname); break;
      case 'MX':   records = await dns.resolveMx(hostname); break;
      case 'TXT':  records = await dns.resolveTxt(hostname); break;
      case 'NS':   records = await dns.resolveNs(hostname); break;
      case 'PTR':  records = await dns.resolvePtr(hostname); break;
      case 'CNAME':records = await dns.resolveCname(hostname); break;
      case 'SOA':  records = [await dns.resolveSoa(hostname)]; break;
      default:     throw new Error(`Unsupported DNS record type: ${type}`);
    }
  } catch (err) {
    return { hostname, type: t, records: [], error: err.message, timing: Date.now() - start };
  }

  return { hostname, type: t, records, timing: Date.now() - start };
}

module.exports = { httpRequest, dnsQuery };

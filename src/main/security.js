'use strict';

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;
const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
const CIDR_V4_RE = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const PORT_RE = /^\d{1,5}$/;
const IFACE_RE = /^[a-zA-Z0-9\-_.]{1,32}$/;

/**
 * Sanitize an IPv4 address.
 * @param {string} ip
 * @returns {string} validated IP
 * @throws if invalid
 */
function sanitizeIP(ip) {
  if (typeof ip !== 'string') throw new Error('IP must be a string');
  const trimmed = ip.trim();
  if (!IPV4_RE.test(trimmed)) throw new Error(`Invalid IPv4 address: ${trimmed}`);
  const parts = trimmed.split('.').map(Number);
  if (parts.some(p => p > 255)) throw new Error(`IPv4 octet out of range: ${trimmed}`);
  return trimmed;
}

/**
 * Sanitize a hostname (FQDN or label).
 * @param {string} hostname
 * @returns {string}
 */
function sanitizeHostname(hostname) {
  if (typeof hostname !== 'string') throw new Error('Hostname must be a string');
  const trimmed = hostname.trim();
  if (trimmed.length > 253) throw new Error('Hostname too long');
  // Allow IPv4 too
  if (IPV4_RE.test(trimmed)) return sanitizeIP(trimmed);
  if (!HOSTNAME_RE.test(trimmed)) throw new Error(`Invalid hostname: ${trimmed}`);
  return trimmed;
}

/**
 * Sanitize a CIDR block (IPv4 only).
 * @param {string} cidr
 * @returns {string}
 */
function sanitizeCIDR(cidr) {
  if (typeof cidr !== 'string') throw new Error('CIDR must be a string');
  const trimmed = cidr.trim();
  if (!CIDR_V4_RE.test(trimmed)) throw new Error(`Invalid CIDR: ${trimmed}`);
  const [ip, prefix] = trimmed.split('/');
  const parts = ip.split('.').map(Number);
  if (parts.some(p => p > 255)) throw new Error(`IPv4 octet out of range in CIDR: ${trimmed}`);
  const pfx = Number(prefix);
  if (pfx < 0 || pfx > 32) throw new Error(`CIDR prefix out of range: ${pfx}`);
  return trimmed;
}

/**
 * Sanitize a TCP/UDP port number.
 * @param {number|string} port
 * @returns {number}
 */
function sanitizePort(port) {
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }
  return n;
}

/**
 * Sanitize a network interface name.
 * @param {string} iface
 * @returns {string}
 */
function sanitizeIface(iface) {
  if (typeof iface !== 'string') throw new Error('Interface must be a string');
  const trimmed = iface.trim();
  if (!IFACE_RE.test(trimmed)) throw new Error(`Invalid interface name: ${trimmed}`);
  return trimmed;
}

/**
 * Sanitize a tcpdump/pcap filter expression.
 * Only printable ASCII, no shell metacharacters.
 * @param {string} filter
 * @returns {string}
 */
function sanitizeFilter(filter) {
  if (typeof filter !== 'string') throw new Error('Filter must be a string');
  const trimmed = filter.trim();
  // Allow alphanumeric, spaces, dots, slashes, colons, parens, and common BPF keywords
  if (/[`$\\|;&<>!]/.test(trimmed)) throw new Error('Filter contains disallowed characters');
  if (trimmed.length > 256) throw new Error('Filter expression too long');
  return trimmed;
}

/**
 * Sanitize a URL (https only, no auth, no local).
 * @param {string} url
 * @returns {string}
 */
function sanitizeURL(url) {
  if (typeof url !== 'string') throw new Error('URL must be a string');
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are allowed');
  }
  // Block local/private addresses
  const forbidden = ['localhost', '127.', '0.0.0.0', '169.254.', '::1'];
  if (forbidden.some(f => parsed.hostname.startsWith(f))) {
    throw new Error('Local/loopback URLs are not allowed');
  }
  return parsed.toString();
}

module.exports = { sanitizeIP, sanitizeHostname, sanitizeCIDR, sanitizePort, sanitizeIface, sanitizeFilter, sanitizeURL };

/**
 * IPv4 calculation utilities — pure functions, no I/O.
 */

/**
 * Convert a dotted-decimal IP to a 32-bit unsigned integer.
 * @param {string} ip
 * @returns {number}
 */
export function ipToLong(ip) {
  return ip.split('.').reduce((acc, oct) => (acc * 256 + parseInt(oct, 10)) >>> 0, 0);
}

/**
 * Convert a 32-bit unsigned integer to dotted-decimal.
 * @param {number} n
 * @returns {string}
 */
export function longToIP(n) {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8)  & 0xff,
    n & 0xff,
  ].join('.');
}

/**
 * Validate an IPv4 address string.
 * @param {string} str
 * @returns {boolean}
 */
export function validateIPv4(str) {
  if (typeof str !== 'string') return false;
  const parts = str.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

/**
 * Parse a CIDR string into a rich subnet info object.
 * @param {string} cidr - e.g. "192.168.1.0/24"
 * @returns {{
 *   cidr: string,
 *   ip: string,
 *   prefix: number,
 *   networkAddress: string,
 *   broadcastAddress: string,
 *   subnetMask: string,
 *   wildcardMask: string,
 *   firstHost: string,
 *   lastHost: string,
 *   totalHosts: number,
 *   usableHosts: number,
 *   ipClass: string,
 *   isPrivate: boolean,
 *   binaryMask: string,
 *   binaryIP: string,
 * }}
 */
export function parseIPv4(cidr) {
  const [ipPart, prefixPart] = cidr.trim().split('/');
  if (!validateIPv4(ipPart)) throw new Error(`Invalid IPv4: ${ipPart}`);

  const prefix = parseInt(prefixPart, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error(`Invalid prefix: ${prefixPart}`);

  const ipLong = ipToLong(ipPart);
  const maskLong = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const networkLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (networkLong | (~maskLong >>> 0)) >>> 0;

  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);

  const firstHostLong = prefix >= 31 ? networkLong : networkLong + 1;
  const lastHostLong  = prefix >= 31 ? broadcastLong : broadcastLong - 1;

  const subnetMask = longToIP(maskLong);
  const wildcardMask = longToIP(~maskLong >>> 0);

  return {
    cidr: `${longToIP(networkLong)}/${prefix}`,
    ip: ipPart,
    prefix,
    networkAddress: longToIP(networkLong),
    broadcastAddress: longToIP(broadcastLong),
    subnetMask,
    wildcardMask,
    firstHost: longToIP(firstHostLong),
    lastHost: longToIP(lastHostLong),
    totalHosts,
    usableHosts,
    ipClass: getIPClass(ipLong),
    isPrivate: isPrivateIP(ipLong),
    binaryMask: maskLong.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim(),
    binaryIP: ipLong.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim(),
  };
}

function getIPClass(ipLong) {
  const first = (ipLong >>> 24) & 0xff;
  if (first < 128)       return 'A';
  if (first < 192)       return 'B';
  if (first < 224)       return 'C';
  if (first < 240)       return 'D (Multicast)';
  return 'E (Reserved)';
}

function isPrivateIP(ipLong) {
  const a = (ipLong >>> 24) & 0xff;
  const b = (ipLong >>> 16) & 0xff;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (APIPA)
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Calculate subnet information for a given number of hosts needed.
 * Returns the smallest prefix that fits `hosts` usable hosts.
 * @param {number} hosts
 * @returns {{ prefix: number, totalHosts: number, usableHosts: number, subnetMask: string }}
 */
export function subnetForHosts(hosts) {
  for (let prefix = 30; prefix >= 0; prefix--) {
    const usable = Math.max(0, Math.pow(2, 32 - prefix) - 2);
    if (usable >= hosts) {
      const maskLong = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return {
        prefix,
        totalHosts: Math.pow(2, 32 - prefix),
        usableHosts: usable,
        subnetMask: longToIP(maskLong),
      };
    }
  }
  throw new Error(`No prefix fits ${hosts} hosts`);
}

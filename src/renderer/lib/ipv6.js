/**
 * IPv6 utilities — pure functions, no I/O.
 */

/**
 * Validate an IPv6 address (with or without prefix).
 * @param {string} str
 * @returns {boolean}
 */
export function validateIPv6(str) {
  if (typeof str !== 'string') return false;
  const withoutPrefix = str.trim().split('/')[0];
  // Basic regex — accepts :: compressed form
  return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(withoutPrefix) ||
         /^::$/.test(withoutPrefix) ||
         /^::1$/.test(withoutPrefix);
}

/**
 * Expand a compressed IPv6 address to full 8-group form.
 * @param {string} abbrev - e.g. "2001:db8::1"
 * @returns {string} - full form e.g. "2001:0db8:0000:0000:0000:0000:0000:0001"
 */
export function expandIPv6(abbrev) {
  let addr = abbrev.trim().split('/')[0];

  // Handle :: expansion
  if (addr.includes('::')) {
    const sides = addr.split('::');
    const left  = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0000');
    addr = [...left, ...middle, ...right].join(':');
  }

  return addr.split(':').map(g => g.padStart(4, '0')).join(':');
}

/**
 * Compress a full IPv6 address to its shortest form.
 * @param {string} full - full 8-group form
 * @returns {string}
 */
export function compressIPv6(full) {
  // Remove leading zeros in each group
  let addr = full.split(':').map(g => g.replace(/^0+/, '') || '0').join(':');

  // Replace the longest run of :0: with ::
  let best = '', current = '';
  const groups = addr.split(':');
  let bestLen = 0, bestStart = -1, curStart = -1, curLen = 0;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === '0') {
      if (curLen === 0) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curLen = 0;
    }
  }

  if (bestLen > 1) {
    const before = groups.slice(0, bestStart).join(':');
    const after  = groups.slice(bestStart + bestLen).join(':');
    addr = before + '::' + after;
    if (addr.startsWith(':') && !addr.startsWith('::')) addr = ':' + addr;
    if (addr.endsWith(':') && !addr.endsWith('::')) addr = addr + ':';
  }

  return addr;
}

/**
 * Parse an IPv6 CIDR string.
 * @param {string} cidr - e.g. "2001:db8::/32"
 * @returns {{
 *   cidr: string, address: string, prefix: number,
 *   expanded: string, compressed: string,
 *   networkAddress: string, totalAddresses: BigInt
 * }}
 */
export function parseIPv6(cidr) {
  const [addrPart, prefixPart] = cidr.trim().split('/');
  if (!validateIPv6(addrPart)) throw new Error(`Invalid IPv6: ${addrPart}`);

  const prefix = prefixPart !== undefined ? parseInt(prefixPart, 10) : 128;
  if (isNaN(prefix) || prefix < 0 || prefix > 128) throw new Error(`Invalid prefix: ${prefix}`);

  const expanded = expandIPv6(addrPart);
  const compressed = compressIPv6(expanded);

  // Network address: zero out host bits
  const groups = expanded.split(':').map(g => parseInt(g, 16));
  const maskBits = prefix;
  let bitsLeft = maskBits;

  const netGroups = groups.map(g => {
    if (bitsLeft >= 16) { bitsLeft -= 16; return g; }
    if (bitsLeft <= 0)  return 0;
    const mask = (0xffff << (16 - bitsLeft)) & 0xffff;
    bitsLeft = 0;
    return g & mask;
  });

  const networkAddress = compressIPv6(netGroups.map(g => g.toString(16).padStart(4, '0')).join(':'));
  const totalAddresses = BigInt(2) ** BigInt(128 - prefix);

  return {
    cidr: `${networkAddress}/${prefix}`,
    address: addrPart,
    prefix,
    expanded,
    compressed,
    networkAddress,
    totalAddresses,
    type: getIPv6Type(expanded),
  };
}

function getIPv6Type(expanded) {
  if (expanded.startsWith('fe80')) return 'Link-Local';
  if (expanded.startsWith('fc') || expanded.startsWith('fd')) return 'Unique Local';
  if (expanded.startsWith('ff')) return 'Multicast';
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') return 'Loopback (::1)';
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') return 'Unspecified (::)';
  if (expanded.startsWith('2001:0db8')) return 'Documentation';
  return 'Global Unicast';
}

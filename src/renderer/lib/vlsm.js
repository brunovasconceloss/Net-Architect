/**
 * VLSM (Variable Length Subnet Masking) planner — pure functions.
 */

import { ipToLong, longToIP, parseIPv4 } from './ipv4.js';

/**
 * @typedef {Object} VLSMSegment
 * @property {string} name - segment name / label
 * @property {number} hosts - number of usable hosts required
 */

/**
 * @typedef {Object} VLSMAllocation
 * @property {string} name
 * @property {number} requestedHosts
 * @property {number} usableHosts
 * @property {number} totalHosts
 * @property {number} prefix
 * @property {string} network
 * @property {string} subnetMask
 * @property {string} firstHost
 * @property {string} lastHost
 * @property {string} broadcast
 * @property {string} cidr
 */

/**
 * Calculate VLSM allocations for a base network and a set of segments.
 * Segments are sorted largest-first (best practice for VLSM).
 *
 * @param {string} baseNetwork - e.g. "192.168.0.0/20"
 * @param {VLSMSegment[]} segments
 * @returns {{ allocations: VLSMAllocation[], remaining: string[], error?: string }}
 */
export function calculateVLSM(baseNetwork, segments) {
  const base = parseIPv4(baseNetwork);

  // Sort largest first
  const sorted = [...segments].sort((a, b) => b.hosts - a.hosts);

  let pointer = ipToLong(base.networkAddress);
  const baseEnd = ipToLong(base.broadcastAddress);

  const allocations = [];

  for (const seg of sorted) {
    if (seg.hosts < 1) {
      allocations.push({ name: seg.name, error: 'Hosts must be ≥ 1', requestedHosts: seg.hosts });
      continue;
    }

    // Find the smallest prefix that accommodates seg.hosts usable addresses.
    // Iterate from /30 downward (larger subnets) and stop at the first fit.
    let prefix = 0;
    let blockSize = Math.pow(2, 32);
    for (let p = 30; p >= 0; p--) {
      const size = Math.pow(2, 32 - p);
      const usable = p >= 31 ? size : Math.max(0, size - 2);
      if (usable >= seg.hosts) { prefix = p; blockSize = size; break; }
    }

    // Align pointer to block boundary
    if (blockSize > 1) {
      pointer = Math.ceil(pointer / blockSize) * blockSize;
    }

    const networkLong = pointer >>> 0;
    const broadcastLong = (networkLong + blockSize - 1) >>> 0;

    if (broadcastLong > baseEnd) {
      return {
        allocations,
        remaining: [],
        error: `Address space exhausted at segment "${seg.name}". Not enough space in ${baseNetwork}.`,
      };
    }

    const maskLong = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const usableHosts = prefix >= 31 ? blockSize : Math.max(0, blockSize - 2);

    allocations.push({
      name: seg.name,
      requestedHosts: seg.hosts,
      usableHosts,
      totalHosts: blockSize,
      prefix,
      network: longToIP(networkLong),
      subnetMask: longToIP(maskLong),
      firstHost: longToIP(prefix >= 31 ? networkLong : networkLong + 1),
      lastHost: longToIP(prefix >= 31 ? broadcastLong : broadcastLong - 1),
      broadcast: longToIP(broadcastLong),
      cidr: `${longToIP(networkLong)}/${prefix}`,
    });

    pointer = broadcastLong + 1;
  }

  // Calculate remaining space
  const remaining = [];
  if (pointer <= baseEnd) {
    remaining.push(`${longToIP(pointer >>> 0)} — ${longToIP(baseEnd)}`);
  }

  return { allocations, remaining };
}

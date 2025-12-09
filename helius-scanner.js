// helius-scanner.js
// Scans all FARTCOIN liquidity pools using Helius DeFi API and returns normalized prices

const fetch = require('node-fetch');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const FARTCOIN_MINT = 'FART111111111111111111111111111111111111111'; // placeholder
const MIN_SOL_LIQ = 3;
const COMMON_BASES = [
  'So11111111111111111111111111111111111111112', // WSOL
  'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh'  // USDC
];

const BASE_URL = `https://api.helius.xyz/v0/tokens/${FARTCOIN_MINT}/markets?api-key=${HELIUS_API_KEY}`;

function normalizePrice(tokenAmount, baseAmount, tokenDecimals, baseDecimals) {
  return (baseAmount / 10 ** baseDecimals) / (tokenAmount / 10 ** tokenDecimals);
}

async function findFartcoinPools() {
  const res = await fetch(BASE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch from Helius: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.filter(pool =>
    pool &&
    pool?.liquidity?.sol >= MIN_SOL_LIQ &&
    pool.tokenA &&
    pool.tokenB
  );
}

async function getNormalizedPrices() {
  const pools = await findFartcoinPools();
  const results = [];

  for (const pool of pools) {
    const {
      tokenA,
      tokenB,
      tokenADecimals,
      tokenBDecimals,
      reserveA,
      reserveB,
      address,
      tokenASymbol,
      tokenBSymbol,
    } = pool;

    const isFartcoinA = tokenA === FARTCOIN_MINT;
    const baseToken = isFartcoinA ? tokenB : tokenA;

    if (!COMMON_BASES.includes(baseToken)) continue;

    const price = isFartcoinA
      ? normalizePrice(reserveA, reserveB, tokenADecimals, tokenBDecimals)
      : normalizePrice(reserveB, reserveA, tokenBDecimals, tokenADecimals);

    results.push({
      poolAddress: address,
      baseToken,
      baseSymbol: isFartcoinA ? tokenBSymbol : tokenASymbol,
      price,
      liquidity: pool?.liquidity?.sol || 0,
    });
  }

  return results;
}

module.exports = {
  getNormalizedPrices,
};

// shyft-scanner.js
// Scans all FARTCOIN liquidity pools and returns normalized prices
// Requires: SHYFT_API_KEY set in environment

require('dotenv').config();
const fetch = require('node-fetch');

const SHYFT_API_KEY = process.env.SHYFT_API_KEY;
const FARTCOIN_MINT = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
const MIN_SOL_LIQ = 3;
const COMMON_BASES = [
  'So11111111111111111111111111111111111111112', // WSOL
  'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh'  // USDC
];

function normalizePrice(tokenAmount, baseAmount, tokenDecimals, baseDecimals) {
  return (baseAmount / (10 ** baseDecimals)) / (tokenAmount / (10 ** tokenDecimals));
}

async function findFartcoinPools() {
  const url = `https://rpc.shyft.to/?api_key=${SHYFT_API_KEY}`;
  const body = {
    method: 'getPools',
    jsonrpc: '2.0',
    id: 1,
    params: {
      mint: FARTCOIN_MINT,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Shyft API request failed: ${res.status}`);
  }

  const data = await res.json();

  // DEBUG: Log full Shyft response if data is malformed
  if (!data || !Array.isArray(data.data)) {
    console.error('⚠️ Shyft API returned invalid or unexpected data:', data);
    throw new Error('Unexpected Shyft API response: data.data not array');
  }

  const pools = data.data.filter(pool =>
    pool.reserveA && pool.reserveB &&
    pool.tokenA && pool.tokenB &&
    (pool.tokenA.mint === FARTCOIN_MINT || pool.tokenB.mint === FARTCOIN_MINT)
  );

  return pools;
}

async function getNormalizedPrices() {
  const pools = await findFartcoinPools();
  const prices = [];

  for (const pool of pools) {
    const { tokenA, tokenB, reserveA, reserveB } = pool;
    const isFartcoinA = tokenA.mint === FARTCOIN_MINT;
    const baseToken = isFartcoinA ? tokenB : tokenA;

    if (!COMMON_BASES.includes(baseToken.mint)) continue;

    const price = isFartcoinA
      ? normalizePrice(reserveA, reserveB, tokenA.decimals, tokenB.decimals)
      : normalizePrice(reserveB, reserveA, tokenB.decimals, tokenA.decimals);

    const liquidity = baseToken.mint === COMMON_BASES[0] ? reserveB / (10 ** baseToken.decimals) : 0;

    if (liquidity >= MIN_SOL_LIQ) {
      prices.push({
        poolAddress: pool.address,
        baseSymbol: baseToken.symbol,
        price: price,
        liquidity: liquidity,
      });
    }
  }

  return prices;
}

module.exports = {
  getNormalizedPrices,
  findFartcoinPools,
};

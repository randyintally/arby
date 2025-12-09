// helius-scanner.js
const fetch = require('node-fetch');
const FARTCOIN_MINT = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

const COMMON_BASES = [
  'So11111111111111111111111111111111111111112', // WSOL
  'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh'  // USDC
];

const MIN_SOL_LIQ = 3;

async function findFartcoinPools() {
  const url = `https://api.helius.xyz/v0/tokens/${FARTCOIN_MINT}/markets?api-key=${HELIUS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius API error: ${res.status}`);
  const pools = await res.json();
  return Array.isArray(pools)
    ? pools.filter(pool => pool?.liquidity?.sol >= MIN_SOL_LIQ)
    : [];
}

function normalizePrice(tokenAmount, baseAmount, tokenDecimals, baseDecimals) {
  return (baseAmount / 10 ** baseDecimals) / (tokenAmount / 10 ** tokenDecimals);
}

async function getNormalizedPrices() {
  const pools = await findFartcoinPools();
  const prices = [];

  for (const pool of pools) {
    const { tokenA, tokenB, reserveA, reserveB, tokenADecimals, tokenBDecimals } = pool;
    const isFartcoinA = tokenA === FARTCOIN_MINT;
    const isBase = COMMON_BASES.includes(isFartcoinA ? tokenB : tokenA);
    if (!isBase) continue;

    const price = isFartcoinA
      ? normalizePrice(reserveA, reserveB, tokenADecimals, tokenBDecimals)
      : normalizePrice(reserveB, reserveA, tokenBDecimals, tokenADecimals);

    prices.push({
      poolAddress: pool.address,
      baseToken: isFartcoinA ? tokenB : tokenA,
      baseSymbol: isFartcoinA ? pool.tokenBSymbol : pool.tokenASymbol,
      price,
      liquidity: pool?.liquidity?.sol || 0,
    });
  }

  return prices;
}

module.exports = {
  getNormalizedPrices
};

// helius-scanner.js
// Scans all FARTCOIN liquidity pools and returns normalized prices
// Requires: HELIUS_API_KEY set in environment

const fetch = require('node-fetch');
const { PublicKey } = require('@solana/web3.js');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const BASE_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const FARTCOIN_MINT = 'FART111111111111111111111111111111111111111'; // placeholder
const MIN_SOL_LIQ = 3;
const COMMON_BASES = ['So11111111111111111111111111111111111111112', // WSOL
                      'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh']; // USDC

async function findFartcoinPools() {
  const url = `https://api.helius.xyz/v0/tokens/${FARTCOIN_MINT}/markets?api-key=${HELIUS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch from Helius: ${res.status}`);

  const pools = await res.json();
  return pools.filter(pool => pool?.liquidity?.sol >= MIN_SOL_LIQ);
}

function normalizePrice(tokenAmount, baseAmount, tokenDecimals, baseDecimals) {
  return (baseAmount / (10 ** baseDecimals)) / (tokenAmount / (10 ** tokenDecimals));
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
      price: price,
      liquidity: pool?.liquidity?.sol || 0,
    });
  }

  return prices;
}

module.exports = {
  getNormalizedPrices,
  findFartcoinPools,
};

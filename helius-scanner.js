// helius-scanner.js (with working pool discovery + Jupiter quote simulation)
require('dotenv').config();
const fetch = require('node-fetch');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const BASE_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const FARTCOIN_MINT = 'FART111111111111111111111111111111111111111'; // replace with real
const MIN_SOL_LIQ = 3;
const COMMON_BASES = [
  'So11111111111111111111111111111111111111112', // WSOL
  'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh'  // USDC
];

async function findFartcoinPoolsViaHelius() {
  const body = {
    jsonrpc: "2.0",
    id: "find-pools",
    method: "searchTransactions",
    params: {
      account: FARTCOIN_MINT,
      source: "token",
      type: "liquidity-pool",
      limit: 50
    }
  };

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`Failed to fetch pools from Helius: ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

function normalizePrice(tokenAmount, baseAmount, tokenDecimals, baseDecimals) {
  return (baseAmount / (10 ** baseDecimals)) / (tokenAmount / (10 ** tokenDecimals));
}

async function getNormalizedPrices() {
  const pools = await findFartcoinPoolsViaHelius();
  const prices = [];

  for (const pool of pools) {
    const { tokenA, tokenB, reserveA, reserveB, tokenADecimals, tokenBDecimals } = pool;

    const isFartcoinA = tokenA === FARTCOIN_MINT;
    const isBase = COMMON_BASES.includes(isFartcoinA ? tokenB : tokenA);
    if (!isBase) continue;

    const price = isFartcoinA
      ? normalizePrice(reserveA, reserveB, tokenADecimals, tokenBDecimals)
      : normalizePrice(reserveB, reserveA, tokenBDecimals, tokenADecimals);

    if ((pool?.liquidity?.sol || 0) >= MIN_SOL_LIQ) {
      prices.push({
        poolAddress: pool.address,
        baseToken: isFartcoinA ? tokenB : tokenA,
        baseSymbol: isFartcoinA ? pool.tokenBSymbol : pool.tokenASymbol,
        price,
        liquidity: pool?.liquidity?.sol || 0,
      });
    }
  }

  return prices;
}

async function simulateViaJupiter(fromMint, toMint, amount) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${amount}&slippage=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  return data?.data?.[0] || null;
}

module.exports = {
  getNormalizedPrices,
  simulateViaJupiter
};

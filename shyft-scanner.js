// shyft-scanner.js
require('dotenv').config();
const fetch = require('node-fetch');

const SHYFT_API_KEY = process.env.SHYFT_API_KEY;
const SHYFT_URL = `https://rpc.shyft.to?api_key=${SHYFT_API_KEY}`;
const FARTCOIN_MINT = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump'; // placeholder
const MIN_LIQUIDITY_SOL = 3;

async function getNormalizedPrices() {
  const response = await fetch(`${SHYFT_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAllPools',
      params: {}
    })
  });

  if (!response.ok) throw new Error(`Shyft API error: ${response.statusText}`);

  const { result } = await response.json();
  if (!Array.isArray(result)) {
    throw new Error(`Unexpected Shyft API response: ${JSON.stringify(result)}`);
  }

  const fartPools = result.filter(pool => {
    return (
      (pool.tokenA?.mint === FARTCOIN_MINT || pool.tokenB?.mint === FARTCOIN_MINT) &&
      Number(pool.liquidity || 0) >= MIN_LIQUIDITY_SOL
    );
  });

  return fartPools.map(pool => {
    const fartIsA = pool.tokenA.mint === FARTCOIN_MINT;
    const price = fartIsA
      ? pool.tokenB.amount / pool.tokenA.amount
      : pool.tokenA.amount / pool.tokenB.amount;

    return {
      poolAddress: pool.address,
      baseSymbol: fartIsA ? pool.tokenB.symbol : pool.tokenA.symbol,
      price: price,
      liquidity: Number(pool.liquidity),
    };
  });
}

module.exports = {
  getNormalizedPrices
};

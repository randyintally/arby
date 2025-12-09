// shyft-scanner.js
require('dotenv').config();
const fetch = require('node-fetch');

const SHYFT_API_KEY = process.env.SHYFT_API_KEY;
const FARTCOIN_MINT = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
const COMMON_BASES = [
  'So11111111111111111111111111111111111111112', // WSOL
  'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh'  // USDC
];
const MIN_SOL_LIQ = 3;

async function findFartcoinPools() {
  const url = `https://api.shyft.to/sol/v1/dex/pairs?network=mainnet-beta&token_address=${FARTCOIN_MINT}`;
  const res = await fetch(url, {
    headers: {
      'x-api-key': SHYFT_API_KEY
    }
  });

  const data = await res.json();

  if (!Array.isArray(data?.data)) {
    console.warn('⚠️ Shyft API returned invalid or unexpected data:', data);
    throw new Error('Unexpected Shyft API response: data.data not array');
  }

  return data.data.filter(pool =>
    pool?.liquidity?.base >= MIN_SOL_LIQ &&
    COMMON_BASES.includes(pool.base_token.address)
  );
}

function normalizePrice(baseAmount, quoteAmount, baseDecimals, quoteDecimals) {
  return (quoteAmount / (10 ** quoteDecimals)) / (baseAmount / (10 ** baseDecimals));
}

async function getNormalizedPrices() {
  const pools = await findFartcoinPools();
  const prices = [];

  for (const pool of pools) {
    const {
      base_token,
      quote_token,
      base_token_amount,
      quote_token_amount,
      base_token_decimals,
      quote_token_decimals,
      lp_address
    } = pool;

    const price = normalizePrice(
      base_token_amount,
      quote_token_amount,
      base_token_decimals,
      quote_token_decimals
    );

    prices.push({
      poolAddress: lp_address,
      baseToken: base_token.address,
      baseSymbol: base_token.symbol,
      price,
      liquidity: pool.liquidity.base || 0,
    });
  }

  return prices;
}

module.exports = {
  getNormalizedPrices,
  findFartcoinPools,
};

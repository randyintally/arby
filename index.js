// index.js
require('dotenv').config();
const { getNormalizedPrices } = require('./helius-scanner');
const fetch = require('node-fetch');

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6/quote';
const FARTCOIN_MINT = 'FART111111111111111111111111111111111111111'; // placeholder
const SLIPPAGE_BPS = 100; // 1%

// Optional: simulate arbitrage using Jupiter quote API
async function simulateTrade(inputMint, outputMint, amount) {
  const url = `${JUPITER_API_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${SLIPPAGE_BPS}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Jupiter quote failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data?.outAmount ? data.outAmount / 10 ** 6 : null; // assuming output is USDC/WSOL
}

async function runBotLoop() {
  console.log(`[${new Date().toISOString()}] Starting FARTCOIN arbitrage scan...`);

  try {
    const prices = await getNormalizedPrices();
    if (prices.length < 2) {
      console.log('Not enough viable pools found for FARTCOIN.');
      return;
    }

    prices.sort((a, b) => a.price - b.price);
    const lowest = prices[0];
    const highest = prices[prices.length - 1];
    const spread = ((highest.price - lowest.price) / lowest.price) * 100;

    console.log(`→ Spread: ${spread.toFixed(2)}% | Low: ${lowest.price.toFixed(6)} (${lowest.baseSymbol}) → High: ${highest.price.toFixed(6)} (${highest.baseSymbol})`);

    if (spread > 2.0) {
      const mockAmount = 100_000; // amount of FARTCOIN in base units

      const sellTo = await simulateTrade(FARTCOIN_MINT, highest.baseToken, mockAmount);
      const buyFrom = await simulateTrade(lowest.baseToken, FARTCOIN_MINT, sellTo * 10 ** 6);

      const roundtripGain = buyFrom - mockAmount;
      const percent = (roundtripGain / mockAmount) * 100;

      console.log(`🧪 Simulated Jupiter trade: +${roundtripGain.toFixed(0)} FARTCOIN (${percent.toFixed(2)}%)`);

      if (percent > 0.5) {
        console.log('💰 Potential arbitrage opportunity detected!');
      }
    }

  } catch (err) {
    console.error('Error in arb bot loop:', err.message || err);
  }
}

setInterval(runBotLoop, 30_000); // Run every 30 seconds
runBotLoop();

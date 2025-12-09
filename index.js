// index.js
require('dotenv').config();
const express = require('express');
const { getNormalizedPrices } = require('./helius-scanner');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint (required by host)
app.get('/', (_, res) => res.send('OK'));
app.listen(PORT, () => console.log(`Health check server running on port ${PORT}`));

// Core bot loop
async function runBotLoop() {
  console.log('Starting FARTCOIN arbitrage scan...');

  try {
    const prices = await getNormalizedPrices();
    if (prices.length < 2) {
      console.log('Not enough viable pools found.');
      return;
    }

    console.log(`→ ${prices.length} viable pools loaded.`);

    // Compare every pair of pools
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const p1 = prices[i];
        const p2 = prices[j];
        const spread = Math.abs(p1.price - p2.price) / ((p1.price + p2.price) / 2);

        if (spread >= 0.05) { // 5% threshold
          console.log(`🚨 Potential arbitrage between ${p1.baseSymbol} pools!`);
          console.log(`    Pool A (${p1.poolAddress}): ${p1.price.toFixed(6)} (${p1.liquidity.toFixed(2)} SOL)`);
          console.log(`    Pool B (${p2.poolAddress}): ${p2.price.toFixed(6)} (${p2.liquidity.toFixed(2)} SOL)`);
          console.log(`    Spread: ${(spread * 100).toFixed(2)}%`);

          await simulateJupiterQuote(p1.baseToken, p2.baseToken);
        }
      }
    }
  } catch (err) {
    console.error('Error in arb bot loop:', err.message);
  }
}

// Simulate Jupiter swap between tokens
async function simulateJupiterQuote(inputMint, outputMint) {
  try {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=1000000&slippageBps=100`;
    const res = await fetch(url);
    const data = await res.json();

    if (data?.data?.[0]) {
      const route = data.data[0];
      console.log(`🔍 Simulated Jupiter quote:`);
      console.log(`    In: ${route.inAmount / 1e6} → Out: ${route.outAmount / 1e6}`);
      console.log(`    Estimated profit: ${((route.outAmount - route.inAmount) / 1e6).toFixed(6)} ${route.outTokenSymbol}`);
    } else {
      console.log(`    No route available for Jupiter simulation.`);
    }
  } catch (err) {
    console.error('Failed to simulate Jupiter quote:', err.message);
  }
}

// Loop every 30s
setInterval(runBotLoop, 30000);
runBotLoop();

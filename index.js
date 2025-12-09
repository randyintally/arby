// index.js
require('dotenv').config();
const express = require('express');
const { getNormalizedPrices } = require('./helius-scanner');

const app = express();
const PORT = 3000;

// Health check endpoint
app.get('/', (_, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});

async function runBotLoop() {
  console.log(`[${new Date().toISOString()}] Starting FARTCOIN arbitrage scan...`);
  try {
    const prices = await getNormalizedPrices();
    if (!Array.isArray(prices) || prices.length === 0) {
      console.log('⚠️ No viable FARTCOIN pools found.');
      return;
    }

    console.log(`✅ Found ${prices.length} viable pools:`);
    prices.forEach(p => {
      console.log(`→ ${p.baseSymbol}: ${p.price.toFixed(6)} (Liquidity: ${p.liquidity.toFixed(2)} SOL)`);
    });

    // TODO: Price spread detection
    // TODO: Simulated trade flow

  } catch (err) {
    console.error('❌ Error in arb bot loop:', err.message || err);
  }
}

setInterval(runBotLoop, 30000);
runBotLoop();

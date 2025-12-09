// index.js (updated with Helius scanner integration)
require('dotenv').config();
const { getNormalizedPrices } = require('./helius-scanner');

async function runBotLoop() {
  console.log('Starting FARTCOIN arbitrage scan...');

  try {
    const prices = await getNormalizedPrices();
    if (prices.length === 0) {
      console.log('No viable FARTCOIN pools with sufficient liquidity.');
      return;
    }

    console.log(`Found ${prices.length} viable pools:`);
    prices.forEach(p => {
      console.log(`→ ${p.baseSymbol}: ${p.price.toFixed(6)} (Liquidity: ${p.liquidity.toFixed(2)} SOL)`);
    });

    // TODO: Add price spread detection across pairs
    // TODO: Simulate trade execution

  } catch (err) {
    console.error('Error in arb bot loop:', err);
  }
}

setInterval(runBotLoop, 30000); // every 30 seconds
runBotLoop();

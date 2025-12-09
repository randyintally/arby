// index.js (Shyft-integrated FARTCOIN arb scanner)
require('dotenv').config();
const { getNormalizedPrices } = require('./shyft-scanner');

async function runBotLoop() {
  const now = new Date().toISOString();
  console.log(`[${now}] Starting FARTCOIN arbitrage scan...`);

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

    // TODO: Add price spread detection and trade simulation logic here

  } catch (err) {
    console.error('Error in arb bot loop:', err.message || err);
  }
}

setInterval(runBotLoop, 30000); // every 30 seconds
runBotLoop();

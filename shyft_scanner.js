// index.js (Shyft-powered FARTCOIN scanner)
require('dotenv').config();
const { getNormalizedPrices } = require('./shyft-scanner');

async function runBotLoop() {
  const time = new Date().toISOString();
  console.log(`[${time}] Starting FARTCOIN arbitrage scan...`);

  try {
    const prices = await getNormalizedPrices();
    if (!prices.length) {
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
    console.error('Error in arb bot loop:', err.message);
  }
}

setInterval(runBotLoop, 30000); // every 30 seconds
runBotLoop();

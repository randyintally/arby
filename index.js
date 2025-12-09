// index.js (enhanced with spread detection and Jupiter quote simulation)
require('dotenv').config();
const { getNormalizedPrices, simulateViaJupiter } = require('./helius-scanner');

const FARTCOIN_MINT = 'FART111111111111111111111111111111111111111'; // replace with real
const BASE_MINTS = {
  WSOL: 'So11111111111111111111111111111111111111112',
  USDC: 'Es9vMFrzaCERrVZHLTqdD9Mvb5A5kUvPaepnYkD4fEAh'
};

async function runBotLoop() {
  console.log('\nStarting FARTCOIN arbitrage scan...');

  try {
    const prices = await getNormalizedPrices();
    if (prices.length === 0) {
      console.log('No viable FARTCOIN pools with sufficient liquidity.');
      return;
    }

    console.log(`Found ${prices.length} viable pools:`);
    prices.forEach(p => {
      console.log(`→ ${p.baseSymbol}: ${p.price.toFixed(6)} (${p.liquidity.toFixed(2)} SOL liquidity)`);
    });

    // Detect best and worst price
    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const bestBuy = sorted[0];
    const bestSell = sorted[sorted.length - 1];

    const spread = ((bestSell.price - bestBuy.price) / bestBuy.price) * 100;
    console.log(`Price spread: ${spread.toFixed(2)}%`);

    if (spread > 1.0) {
      console.log(`Arbitrage opportunity detected! Buy from ${bestBuy.baseSymbol}, sell to ${bestSell.baseSymbol}`);

      const amount = 1000000; // 1 token in micro units, adjust as needed
      const simBuy = await simulateViaJupiter(bestBuy.baseToken, FARTCOIN_MINT, amount);
      const simSell = await simulateViaJupiter(FARTCOIN_MINT, bestSell.baseToken, amount);

      if (simBuy && simSell) {
        console.log(`→ Simulated Buy: ${simBuy.outAmount / 1e6} FARTCOIN`);
        console.log(`→ Simulated Sell: ${simSell.outAmount / 1e6} ${bestSell.baseSymbol}`);
        const estProfit = (simSell.outAmount - amount) / 1e6;
        console.log(`→ Estimated Profit (simulated): ${estProfit.toFixed(6)} ${bestSell.baseSymbol}`);
      } else {
        console.log('Simulation failed or route unavailable.');
      }
    } else {
      console.log('No profitable arbitrage opportunity found.');
    }

  } catch (err) {
    console.error('Error in arb bot loop:', err.message || err);
  }
}

setInterval(runBotLoop, 30000);
runBotLoop();

// jupiter-scanner.js
const axios = require('axios');

const FARTCOIN_MINT = "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";    // USDC (Solana)
const WSOL_MINT = "So11111111111111111111111111111111111111112";    // WSOL

const oneFartcoinRaw = 1 * 10 ** 9;  // 1 FARTCOIN

async function fetchQuote(outputMint) {
  const url = `https://api.jup.ag/v6/quote?inputMint=${FARTCOIN_MINT}&outputMint=${outputMint}&amount=${oneFartcoinRaw}&onlyDirectRoutes=true`;

  try {
    const { data } = await axios.get(url);
    if (!data.routePlan.length) {
      console.log(`No direct pool for FARTCOIN → ${outputMint}`);
      return;
    }

    const outAmount = Number(data.outAmount);
    const priceImpact = data.priceImpactPct;
    const platform = data.routePlan[0].swapInfo.label;
    const baseDecimals = outputMint === USDC_MINT ? 6 : 9;
    const price = (outAmount / 10 ** baseDecimals).toFixed(6);

    console.log(`💱 ${platform}: 1 FARTCOIN = ${price} ${outputMint === USDC_MINT ? 'USDC' : 'WSOL'} (impact: ${priceImpact}%)`);
  } catch (err) {
    console.error("Failed to fetch Jupiter quote:", err.message);
  }
}

async function runScanner() {
  console.log(`--- [${new Date().toLocaleTimeString()}] Scanning FARTCOIN prices ---`);
  await fetchQuote(USDC_MINT);
  await fetchQuote(WSOL_MINT);
  console.log('\n');
}

// Run every 30 seconds
setInterval(runScanner, 30_000);
runScanner();

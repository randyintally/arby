const http = require("http");
const { Connection, PublicKey } = require("@solana/web3.js");

// -------------------------
// Config
// -------------------------

// Public Solana RPC for now (replace with private later for speed)
const RPC_URL = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

// QBS mint
const QBS_MINT = new PublicKey("2BAKjB47KpQD64m3nWGWrNjC2ZTwWpumYakJVgavdXQa");

// WSOL mint (wrapped SOL)
const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

// Meteora QBS-WSOL pool (DAMM v2)
const METEORA_POOL = new PublicKey(
  "9yjDZufKkYftDgYNMWoWogZVKtUx1H9ur3LLwWTNCFiJ"
);

// Orca WSOL-QBS Whirlpool
const ORCA_POOL = new PublicKey(
  "DqGpLwvYHFupJqgQJtmGTMhX6UM1Uw9SgXL8qRWGXq72"
);

// -------------------------
// DigitalOcean Healthcheck Server
// -------------------------

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK\n");
});

server.listen(PORT, () => {
  console.log(`Healthcheck server listening on port ${PORT}`);
});

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to sum uiAmount from parsed token accounts
function sumUiAmount(tokenAccounts) {
  if (!tokenAccounts || !tokenAccounts.value) return 0;
  let total = 0;
  for (const acc of tokenAccounts.value) {
    try {
      const amountInfo = acc.account.data.parsed.info.tokenAmount;
      const uiAmount = amountInfo.uiAmount; // already adjusted for decimals
      if (typeof uiAmount === "number") {
        total += uiAmount;
      }
    } catch (e) {
      // ignore malformed accounts
    }
  }
  return total;
}

// -------------------------
// Price helpers
// -------------------------

async function getPoolBalances(poolPubkey) {
  // QBS balance in pool
  const qbsAccounts = await connection.getParsedTokenAccountsByOwner(
    poolPubkey,
    { mint: QBS_MINT }
  );

  // WSOL balance in pool
  const wsolAccounts = await connection.getParsedTokenAccountsByOwner(
    poolPubkey,
    { mint: WSOL_MINT }
  );

  const qbsTotal = sumUiAmount(qbsAccounts);
  const wsolTotal = sumUiAmount(wsolAccounts);

  return { qbsTotal, wsolTotal };
}

function computePrice(qbsTotal, wsolTotal) {
  if (qbsTotal <= 0 || wsolTotal <= 0) {
    return { solPerQbs: null, qbsPerSol: null };
  }
  const solPerQbs = wsolTotal / qbsTotal;
  const qbsPerSol = qbsTotal / wsolTotal;
  return { solPerQbs, qbsPerSol };
}

// -------------------------
// Main bot loop
// -------------------------
async function main() {
  console.log("Arby bot starting...");

  // One-time: sanity check QBS mint exists
  try {
    const mintInfo = await connection.getParsedAccountInfo(QBS_MINT);
    const exists = mintInfo && mintInfo.value !== null;
    console.log("QBS mint info:", exists ? "ok" : "not found");
  } catch (e) {
    console.log("Error reading QBS mint:", e.message);
  }

  while (true) {
    try {
      const slot = await connection.getSlot();
      console.log("\n========== New cycle @ slot", slot, "==========");

      // ----- Meteora pool -----
      let meteoraBalances = await getPoolBalances(METEORA_POOL);
      console.log(
        `Meteora pool balances -> QBS: ${meteoraBalances.qbsTotal}, WSOL: ${meteoraBalances.wsolTotal}`
      );
      const meteoraPrice = computePrice(
        meteoraBalances.qbsTotal,
        meteoraBalances.wsolTotal
      );
      console.log(
        `Meteora approx price: ${meteoraPrice.solPerQbs} SOL/QBS | ${meteoraPrice.qbsPerSol} QBS/SOL`
      );

      // ----- Orca pool -----
      let orcaBalances = await getPoolBalances(ORCA_POOL);
      console.log(
        `Orca pool balances    -> QBS: ${orcaBalances.qbsTotal}, WSOL: ${orcaBalances.wsolTotal}`
      );
      const orcaPrice = computePrice(
        orcaBalances.qbsTotal,
        orcaBalances.wsolTotal
      );
      console.log(
        `Orca approx price:    ${orcaPrice.solPerQbs} SOL/QBS | ${orcaPrice.qbsPerSol} QBS/SOL`
      );

      // ----- Arbitrage signal -----
      if (
        meteoraPrice.solPerQbs !== null &&
        orcaPrice.solPerQbs !== null &&
        meteoraPrice.solPerQbs > 0 &&
        orcaPrice.solPerQbs > 0
      ) {
        const diff = orcaPrice.solPerQbs - meteoraPrice.solPerQbs;
        const avg = (orcaPrice.solPerQbs + meteoraPrice.solPerQbs) / 2;
        const pct = (diff / avg) * 100;

        if (Math.abs(pct) < 0.1) {
          console.log("Spread < 0.1% → no real arb.");
        } else if (pct > 0) {
          console.log(
            `Arb signal: QBS is MORE expensive on Orca by ${pct.toFixed(
              3
            )}% → buy on Meteora, sell on Orca`
          );
        } else {
          console.log(
            `Arb signal: QBS is MORE expensive on Meteora by ${Math.abs(
              pct
            ).toFixed(3)}% → buy on Orca, sell on Meteora`
          );
        }
      } else {
        console.log(
          "Could not compute arb spread (one of the prices is null / zero)."
        );
      }
    } catch (e) {
      console.log("Error in main loop:", e.message);
    }

    console.log("Arby heartbeat:", new Date().toISOString());
    await sleep(10000); // wait 10 seconds
  }
}

main().catch((err) => {
  console.error("Bot crashed:", err);
});

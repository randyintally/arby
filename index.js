const http = require("http");
const { Connection, PublicKey } = require("@solana/web3.js");
const { getAccount, getMint } = require("@solana/spl-token");
const BN = require("bn.js");
const { CpAmm } = require("@meteora-ag/cp-amm-sdk");

// -------------------------
// Config
// -------------------------

// Public Solana RPC for now (replace with private for speed & fewer 429s)
const RPC_URL = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

// QBS mint
const QBS_MINT = new PublicKey("2BAKjB47KpQD64m3nWGWrNjC2ZTwWpumYakJVgavdXQa");

// WSOL mint
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

// Polling interval (ms). 10000 = 10s; increase if you hit 429s.
const LOOP_DELAY_MS = 20000;

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

// Sum uiAmount on Orca side (simple owner=mint trick)
function sumUiAmount(tokenAccounts) {
  if (!tokenAccounts || !tokenAccounts.value) return 0;
  let total = 0;
  for (const acc of tokenAccounts.value) {
    try {
      const amountInfo = acc.account.data.parsed.info.tokenAmount;
      const uiAmount = amountInfo.uiAmount;
      if (typeof uiAmount === "number") {
        total += uiAmount;
      }
    } catch (e) {
      // ignore bad accounts
    }
  }
  return total;
}

// -------------------------
// Meteora SDK setup
// -------------------------

const cpAmm = new CpAmm(connection);

let meteoraInitialized = false;
let meteoraQbsVault = null;
let meteoraWsolVault = null;
let qbsDecimals = null;
let wsolDecimals = null;

async function initMeteoraPool() {
  console.log("Initializing Meteora DAMM v2 pool via SDK...");

  const poolState = await cpAmm.fetchPoolState(METEORA_POOL);

  const tokenAMint = poolState.tokenAMint;
  const tokenBMint = poolState.tokenBMint;
  const tokenAVault = poolState.tokenAVault;
  const tokenBVault = poolState.tokenBVault;

  const tokenAMintStr = tokenAMint.toBase58();
  const tokenBMintStr = tokenBMint.toBase58();
  const qbsMintStr = QBS_MINT.toBase58();
  const wsolMintStr = WSOL_MINT.toBase58();

  if (tokenAMintStr === qbsMintStr && tokenBMintStr === wsolMintStr) {
    meteoraQbsVault = tokenAVault;
    meteoraWsolVault = tokenBVault;
    console.log("Meteora pool: tokenA = QBS, tokenB = WSOL");
  } else if (tokenAMintStr === wsolMintStr && tokenBMintStr === qbsMintStr) {
    meteoraQbsVault = tokenBVault;
    meteoraWsolVault = tokenAVault;
    console.log("Meteora pool: tokenA = WSOL, tokenB = QBS");
  } else {
    console.error(
      "Meteora pool mints do not match QBS/WSOL. tokenA:",
      tokenAMintStr,
      "tokenB:",
      tokenBMintStr
    );
    throw new Error("Meteora pool is not QBS-WSOL");
  }

  // Get mint decimals
  const qbsMintInfo = await getMint(connection, QBS_MINT);
  const wsolMintInfo = await getMint(connection, WSOL_MINT);
  qbsDecimals = qbsMintInfo.decimals;
  wsolDecimals = wsolMintInfo.decimals;

  console.log(
    `QBS decimals: ${qbsDecimals}, WSOL decimals: ${wsolDecimals}`
  );
  console.log(
    "Meteora QBS vault:",
    meteoraQbsVault.toBase58(),
    "WSOL vault:",
    meteoraWsolVault.toBase58()
  );

  meteoraInitialized = true;
}

// Read QBS/WSOL reserves from Meteora via vault accounts
async function getMeteoraPriceFromSdk() {
  if (!meteoraInitialized) {
    await initMeteoraPool();
  }

  const qbsVaultAccount = await getAccount(connection, meteoraQbsVault);
  const wsolVaultAccount = await getAccount(connection, meteoraWsolVault);

  // tokenAccount.amount is a bigint; wrap in BN
  const qbsRaw = new BN(qbsVaultAccount.amount.toString());
  const wsolRaw = new BN(wsolVaultAccount.amount.toString());

  const qbsDivisor = new BN(10).pow(new BN(qbsDecimals));
  const wsolDivisor = new BN(10).pow(new BN(wsolDecimals));

  const qbs = qbsRaw.div(qbsDivisor).toNumber();
  const wsol = wsolRaw.div(wsolDivisor).toNumber();

  console.log(
    `Meteora SDK vault balances -> QBS: ${qbs}, WSOL: ${wsol}`
  );

  if (qbs <= 0 || wsol <= 0) {
    return { solPerQbs: null, qbsPerSol: null };
  }

  const solPerQbs = wsol / qbs;
  const qbsPerSol = qbs / wsol;

  return { solPerQbs, qbsPerSol };
}

// -------------------------
// Orca side (as before)
// -------------------------

async function getOrcaPrice() {
  const qbsAccounts = await connection.getParsedTokenAccountsByOwner(
    ORCA_POOL,
    { mint: QBS_MINT }
  );

  const wsolAccounts = await connection.getParsedTokenAccountsByOwner(
    ORCA_POOL,
    { mint: WSOL_MINT }
  );

  const qbsTotal = sumUiAmount(qbsAccounts);
  const wsolTotal = sumUiAmount(wsolAccounts);

  console.log(
    `Orca pool balances    -> QBS: ${qbsTotal}, WSOL: ${wsolTotal}`
  );

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

  // Sanity check QBS mint
  try {
    const mintInfo = await connection.getParsedAccountInfo(QBS_MINT);
    const exists = mintInfo && mintInfo.value !== null;
    console.log("QBS mint info:", exists ? "ok" : "not found");
  } catch (e) {
    console.log("Error reading QBS mint:", e.message);
  }

  // Initialize Meteora pool via SDK once
  try {
    await initMeteoraPool();
  } catch (e) {
    console.error("Failed to init Meteora pool:", e.message);
  }

  while (true) {
    try {
      const slot = await connection.getSlot();
      console.log(`\n========== New cycle @ slot ${slot} ==========`);

      // ----- Meteora via SDK -----
      const meteoraPrice = await getMeteoraPriceFromSdk();
      console.log(
        `Meteora price: ${meteoraPrice.solPerQbs} SOL/QBS | ${meteoraPrice.qbsPerSol} QBS/SOL`
      );

      // ----- Orca -----
      const orcaPrice = await getOrcaPrice();
      console.log(
        `Orca price:    ${orcaPrice.solPerQbs} SOL/QBS | ${orcaPrice.qbsPerSol} QBS/SOL`
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
            ).toFixed(
              3
            )}% → buy on Orca, sell on Meteora`
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
    await sleep(LOOP_DELAY_MS);
  }
}

main().catch((err) => {
  console.error("Bot crashed:", err);
});

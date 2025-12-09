const http = require("http");
const { Connection } = require("@solana/web3.js");

// -------------------------
// Solana RPC
// -------------------------
const RPC_URL = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

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

// QBS token mint
const QBS_MINT = "2BAKjB47KpQD64m3nWGWrNjC2ZTwWpumYakJVgavdXQa";

// -------------------------
// Main bot loop
// -------------------------
async function main() {
  console.log("Arby bot starting...");

  while (true) {
    // Fetch Solana slot
    try {
      const slot = await connection.getSlot();
      console.log("Solana slot:", slot);
    } catch (e) {
      console.log("Solana RPC error:", e.message);
    }

    // Fetch QBS Mint Metadata
    try {
      const mintInfo = await connection.getParsedAccountInfo(QBS_MINT);
      console.log("QBS mint info:", mintInfo ? "ok" : "not found");
    } catch (e) {
      console.log("Error reading QBS mint:", e.message);
    }

    // Heartbeat
    console.log("Arby heartbeat:", new Date().toISOString());

    await sleep(10000); // wait 10 seconds
  }
}

main().catch((err) => {
  console.error("Bot crashed:", err);
});

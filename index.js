const http = require("http");
const { Connection } = require("@solana/web3.js");

// Basic Solana RPC (we can change this later)
const RPC_URL = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

// HTTP server just for DigitalOcean health checks
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

async function main() {
  console.log("Arby bot starting...");

  while (true) {
    try {
      const slot = await connection.getSlot();
      console.log("Solana slot:", slot);
    } catch (e) {
      console.log("Solana RPC error:", e.message);
    }

    console.log("Arby heartbeat:", new Date().toISOString());
    await sleep(10000); // 10 seconds
  }
}

main().catch((err) => {
  console.error("Bot crashed:", err);
});

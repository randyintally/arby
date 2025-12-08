const http = require("http");

console.log("Arby bot starting...");

// Simple HTTP server for DigitalOcean health checks
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK\n");
});

server.listen(PORT, () => {
  console.log(`Healthcheck server listening on port ${PORT}`);
});

// Little sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  while (true) {
    console.log("Arby heartbeat:", new Date().toISOString());
    await sleep(10000); // 10 seconds
  }
}

main().catch((err) => {
  console.error("Bot crashed:", err);
});

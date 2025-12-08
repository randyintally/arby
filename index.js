console.log("Arby bot starting...");

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

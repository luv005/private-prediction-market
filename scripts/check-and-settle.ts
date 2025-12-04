import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const MARKET_ID = "0xf9da306807d2c050aeb06e5afb2acf9c1c055e2ea9ff46b48a42683e709aecdf";

  const users = [
    "0x037948B6310C2966085497604d985e173cE3Dbf7",
    "0xB36131979917391F0FB5A472Ed21FA26b0168380"
  ];

  const [deployer] = await ethers.getSigners();
  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  console.log("=== Market Info ===");
  const market = await darkMatcher.getMarket(MARKET_ID);
  console.log("Question:", market[0]);
  console.log("Total Volume:", ethers.formatUnits(market[4], 6), "USDC");
  console.log("Resolved:", market[2]);
  console.log();

  console.log("=== Positions ===");
  for (const user of users) {
    const [yesShares, noShares, totalCost] = await darkMatcher.getPosition(user, MARKET_ID);
    const [available, locked] = await darkMatcher.getBalance(user);

    console.log(user.slice(0, 10) + "...:");
    console.log("  YES shares:", ethers.formatUnits(yesShares, 6));
    console.log("  NO shares:", ethers.formatUnits(noShares, 6));
    console.log("  Total cost:", ethers.formatUnits(totalCost, 6));
    console.log("  Balance - Available:", ethers.formatUnits(available, 6), "Locked:", ethers.formatUnits(locked, 6));
    console.log();
  }

  // Ask if should settle
  const args = process.argv.slice(2);
  if (args.includes("--settle-yes") || args.includes("--settle-no")) {
    const outcome = args.includes("--settle-yes");
    console.log(`\n=== Settling market with outcome: ${outcome ? "YES" : "NO"} ===`);

    const tx = await darkMatcher.resolveMarket(MARKET_ID, outcome);
    await tx.wait();
    console.log("Tx:", tx.hash);
    console.log("Market settled!");

    console.log("\n=== Final Balances ===");
    for (const user of users) {
      const [available, locked] = await darkMatcher.getBalance(user);
      console.log(user.slice(0, 10) + "...:");
      console.log("  Available:", ethers.formatUnits(available, 6), "USDC");
      console.log("  Locked:", ethers.formatUnits(locked, 6), "USDC");
    }
  } else {
    console.log("\nTo settle the market, run with --settle-yes or --settle-no");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

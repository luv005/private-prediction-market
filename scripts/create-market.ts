import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";

  const [deployer] = await ethers.getSigners();
  console.log("Creating market using:", deployer.address);

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  // Create market - expires in 1 year
  const question = "Will ETH be above $5000 by end of 2025?";
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

  console.log("Creating market:", question);
  const tx = await darkMatcher.createMarket(question, expiresAt);
  const receipt = await tx.wait();

  // Get market ID from event
  const event = receipt?.logs.find((log: any) => {
    try {
      const parsed = darkMatcher.interface.parseLog(log);
      return parsed?.name === "MarketCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = darkMatcher.interface.parseLog(event);
    const marketId = parsed?.args.marketId;
    console.log("\n✅ Market created!");
    console.log("Market ID:", marketId);
    console.log("Expires:", new Date(expiresAt * 1000).toISOString());
  }

  console.log("Tx:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

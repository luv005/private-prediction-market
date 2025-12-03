import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DarkMatcher to Oasis Sapphire Testnet...");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ROSE");

  // Deploy DarkMatcher
  const DarkMatcher = await ethers.getContractFactory("DarkMatcher");
  const darkMatcher = await DarkMatcher.deploy(deployer.address);

  await darkMatcher.waitForDeployment();
  const darkMatcherAddress = await darkMatcher.getAddress();

  console.log("\n✅ DarkMatcher deployed to:", darkMatcherAddress);

  // Set relayer (deployer for now)
  let tx = await darkMatcher.setRelayer(deployer.address);
  await tx.wait();
  console.log("✅ Relayer set to deployer");

  // Get encryption public key
  const encryptionPubKey = await darkMatcher.getEncryptionPublicKey();
  console.log("✅ Encryption public key:", encryptionPubKey);

  // Create a demo market
  const question = "Will ETH be above $5000 by end of 2025?";
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

  tx = await darkMatcher.createMarket(question, expiresAt);
  const receipt = await tx.wait();

  // Get market ID from event
  const marketCreatedEvent = receipt?.logs.find(
    (log: any) => log.fragment?.name === "MarketCreated"
  );
  const marketId = marketCreatedEvent?.args?.[0];

  console.log("\n✅ Demo market created:");
  console.log("   Question:", question);
  console.log("   Market ID:", marketId);
  console.log("   Expires:", new Date(expiresAt * 1000).toISOString());

  console.log("\n========================================");
  console.log("Deployment Summary (Sapphire Testnet)");
  console.log("========================================");
  console.log("DarkMatcher:", darkMatcherAddress);
  console.log("Encryption PubKey:", encryptionPubKey);
  console.log("Owner:", deployer.address);
  console.log("Relayer:", deployer.address);
  console.log("Demo Market ID:", marketId);
  console.log("\nNext steps:");
  console.log("1. Update .env with DARK_MATCHER_ADDRESS=" + darkMatcherAddress);
  console.log("2. Call liquidityPool.setDarkMatcher(" + darkMatcherAddress + ") on Base");
  console.log("3. If using LiquidityPool, call darkMatcher.setLiquidityPool(<address>)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

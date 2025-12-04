import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const LIQUIDITY_POOL_ADDRESS = process.env.LIQUIDITY_POOL_ADDRESS || "0x3afcc7D4EF809539BD0EaB0867D8E5FBc7B32e81";

  if (!LIQUIDITY_POOL_ADDRESS) {
    console.error("Please set LIQUIDITY_POOL_ADDRESS in .env");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  console.log("Setting LiquidityPool to:", LIQUIDITY_POOL_ADDRESS);
  const tx = await darkMatcher.setLiquidityPool(LIQUIDITY_POOL_ADDRESS);
  await tx.wait();

  console.log("✅ LiquidityPool set successfully!");
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

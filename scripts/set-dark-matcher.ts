import { ethers } from "hardhat";

async function main() {
  const LIQUIDITY_POOL_ADDRESS = process.env.LIQUIDITY_POOL_ADDRESS || "0x3afcc7D4EF809539BD0EaB0867D8E5FBc7B32e81";
  const DARK_MATCHER_ADDRESS = "0x1C97690160b4029AD485A5b39854506BC3344F82";

  if (!LIQUIDITY_POOL_ADDRESS) {
    console.error("Please set LIQUIDITY_POOL_ADDRESS in .env");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const liquidityPool = await ethers.getContractAt("LiquidityPool", LIQUIDITY_POOL_ADDRESS);

  console.log("Setting DarkMatcher to:", DARK_MATCHER_ADDRESS);
  const tx = await liquidityPool.setDarkMatcher(DARK_MATCHER_ADDRESS);
  await tx.wait();

  console.log("✅ DarkMatcher set successfully!");
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

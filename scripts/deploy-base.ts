import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying LiquidityPool to Base Sepolia...");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // USDC address on Base Sepolia (use mock for testing)
  // Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("\nUsing USDC address:", USDC_ADDRESS);

  // Deploy LiquidityPool
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy(
    USDC_ADDRESS,
    deployer.address // owner
  );

  await liquidityPool.waitForDeployment();
  const liquidityPoolAddress = await liquidityPool.getAddress();

  console.log("\n✅ LiquidityPool deployed to:", liquidityPoolAddress);

  // Set relayer (deployer for now)
  const tx = await liquidityPool.setRelayer(deployer.address);
  await tx.wait();
  console.log("✅ Relayer set to deployer");

  console.log("\n========================================");
  console.log("Deployment Summary (Base Sepolia)");
  console.log("========================================");
  console.log("LiquidityPool:", liquidityPoolAddress);
  console.log("USDC:", USDC_ADDRESS);
  console.log("Owner:", deployer.address);
  console.log("Relayer:", deployer.address);
  console.log("\nNext steps:");
  console.log("1. Deploy DarkMatcher to Sapphire Testnet");
  console.log("2. Call liquidityPool.setDarkMatcher(<address>)");
  console.log("3. Update .env with LIQUIDITY_POOL_ADDRESS=" + liquidityPoolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

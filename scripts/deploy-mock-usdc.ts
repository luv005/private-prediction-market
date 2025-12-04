import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockUSDC to Base Sepolia...");
  console.log("Deployer:", deployer.address);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();

  const address = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", address);

  // Mint 100,000 USDC to deployer
  const amount = ethers.parseUnits("100000", 6); // USDC has 6 decimals
  const tx = await mockUSDC.mint(deployer.address, amount);
  await tx.wait();

  console.log("✅ Minted 100,000 USDC to", deployer.address);
  console.log("\nUpdate your .env:");
  console.log(`USDC_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

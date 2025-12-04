import { ethers } from "hardhat";

async function main() {
  const MOCK_USDC_ADDRESS = "0x3d82B714401782464CE485789513679d74733B29";
  const TO_ADDRESS = "0xB36131979917391F0FB5A472Ed21FA26b0168380";
  const AMOUNT = ethers.parseUnits("10000", 6); // 10,000 USDC

  const [deployer] = await ethers.getSigners();
  console.log("Minting using:", deployer.address);

  const mockUSDC = await ethers.getContractAt("MockUSDC", MOCK_USDC_ADDRESS);

  console.log(`Minting ${ethers.formatUnits(AMOUNT, 6)} USDC to ${TO_ADDRESS}...`);
  const tx = await mockUSDC.mint(TO_ADDRESS, AMOUNT);
  await tx.wait();

  console.log("✅ USDC minted!");
  console.log("Tx:", tx.hash);

  // Check balance
  const balance = await mockUSDC.balanceOf(TO_ADDRESS);
  console.log(`New balance: ${ethers.formatUnits(balance, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

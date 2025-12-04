import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const USER_ADDRESS = "0x037948B6310C2966085497604d985e173cE3Dbf7"; // Your address
  const AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC

  const [deployer] = await ethers.getSigners();
  console.log("Crediting balance using:", deployer.address);

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  console.log(`Crediting ${ethers.formatUnits(AMOUNT, 6)} USDC to ${USER_ADDRESS}...`);
  const tx = await darkMatcher.creditBalance(USER_ADDRESS, AMOUNT);
  await tx.wait();

  console.log("✅ Balance credited!");
  console.log("Tx:", tx.hash);

  // Check balance
  const [available, locked] = await darkMatcher.getMyBalance();
  console.log(`Balance - Available: ${ethers.formatUnits(available, 6)} USDC`);
  console.log(`Balance - Locked: ${ethers.formatUnits(locked, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

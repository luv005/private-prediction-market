import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const USER_ADDRESS = "0x037948B6310C2966085497604d985e173cE3Dbf7";
  const AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC - same as credited

  const [deployer] = await ethers.getSigners();
  console.log("Debiting balance using:", deployer.address);

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  // Check current balance first
  const [available, locked] = await darkMatcher.getBalance(USER_ADDRESS);
  console.log(`Current balance - Available: ${ethers.formatUnits(available, 6)} USDC`);
  console.log(`Current balance - Locked: ${ethers.formatUnits(locked, 6)} USDC`);

  if (available < AMOUNT) {
    console.log(`Cannot debit ${ethers.formatUnits(AMOUNT, 6)} - insufficient balance`);
    return;
  }

  console.log(`\nDebiting ${ethers.formatUnits(AMOUNT, 6)} USDC from ${USER_ADDRESS}...`);
  const tx = await darkMatcher.debitBalance(USER_ADDRESS, AMOUNT);
  await tx.wait();

  console.log("✅ Balance debited!");
  console.log("Tx:", tx.hash);

  // Check new balance
  const [newAvailable, newLocked] = await darkMatcher.getBalance(USER_ADDRESS);
  console.log(`\nNew balance - Available: ${ethers.formatUnits(newAvailable, 6)} USDC`);
  console.log(`New balance - Locked: ${ethers.formatUnits(newLocked, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

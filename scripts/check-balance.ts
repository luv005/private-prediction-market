import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";

  // Check both addresses
  const addresses = [
    "0x037948B6310C2966085497604d985e173cE3Dbf7",
    "0xB36131979917391F0FB5A472Ed21FA26b0168380"
  ];

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  for (const addr of addresses) {
    const [available, locked] = await darkMatcher.getBalance(addr);
    console.log(`Balance for ${addr}:`);
    console.log(`  Available: ${ethers.formatUnits(available, 6)} USDC`);
    console.log(`  Locked: ${ethers.formatUnits(locked, 6)} USDC`);
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

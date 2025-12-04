import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const MARKET_ID = "0xede0ccf66b39f842767242fe8a5c077888d9c95cd84739785a83274d9b30f107";

  const users = [
    "0x037948B6310C2966085497604d985e173cE3Dbf7",
    "0xB36131979917391F0FB5A472Ed21FA26b0168380"
  ];

  const [deployer] = await ethers.getSigners();
  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  console.log("=== Before Settlement ===");
  for (const user of users) {
    const [available, locked] = await darkMatcher.getBalance(user);
    console.log(user.slice(0, 10) + "... - Available:", ethers.formatUnits(available, 6), "Locked:", ethers.formatUnits(locked, 6));
  }

  console.log("\n=== Settling market with outcome: NO ===");
  const tx = await darkMatcher.resolveMarket(MARKET_ID, false);
  await tx.wait();
  console.log("Tx:", tx.hash);
  console.log("Market settled!");

  console.log("\n=== After Settlement ===");
  for (const user of users) {
    const [available, locked] = await darkMatcher.getBalance(user);
    console.log(user.slice(0, 10) + "... - Available:", ethers.formatUnits(available, 6), "Locked:", ethers.formatUnits(locked, 6));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

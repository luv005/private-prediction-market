import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const MARKET_ID = "0xf9da306807d2c050aeb06e5afb2acf9c1c055e2ea9ff46b48a42683e709aecdf";

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

  console.log("\n=== Settling market with outcome: YES ===");
  const tx = await darkMatcher.resolveMarket(MARKET_ID, true);
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

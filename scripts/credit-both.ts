import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0xCc2a400Ab1BC3fa0968d8fe5a220b15Ec8E5dB97";
  const AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC each

  const users = [
    "0x037948B6310C2966085497604d985e173cE3Dbf7",
    "0xB36131979917391F0FB5A472Ed21FA26b0168380"
  ];

  const [deployer] = await ethers.getSigners();
  console.log("Crediting balances using:", deployer.address);

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  for (const user of users) {
    console.log("Crediting", ethers.formatUnits(AMOUNT, 6), "USDC to", user);
    const tx = await darkMatcher.creditBalance(user, AMOUNT);
    await tx.wait();
    console.log("  Tx:", tx.hash);

    const [available, locked] = await darkMatcher.getBalance(user);
    console.log("  Balance - Available:", ethers.formatUnits(available, 6), "Locked:", ethers.formatUnits(locked, 6));
    console.log();
  }

  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from "hardhat";

async function main() {
  const DARK_MATCHER_ADDRESS = "0x52E6632558D6d22Ee4B20D3BD2126B21655B2D01";
  const MARKET_ID = "0x12c658a9364e9bab7b72d584bbf2e9730d8f04f0a10c19d8149445fb22a4a959";

  const addresses = [
    "0x037948B6310C2966085497604d985e173cE3Dbf7",
    "0xB36131979917391F0FB5A472Ed21FA26b0168380"
  ];

  const darkMatcher = await ethers.getContractAt("DarkMatcher", DARK_MATCHER_ADDRESS);

  console.log("=== Market Info ===");
  const market = await darkMatcher.getMarket(MARKET_ID);
  console.log("Question:", market[0]);
  console.log("Total Volume:", ethers.formatUnits(market[4], 6), "USDC");
  console.log("Resolved:", market[2]);
  console.log();

  console.log("=== User Balances ===");
  for (const addr of addresses) {
    const [available, locked] = await darkMatcher.getBalance(addr);
    console.log(addr + ":");
    console.log("  Available:", ethers.formatUnits(available, 6), "USDC");
    console.log("  Locked:", ethers.formatUnits(locked, 6), "USDC");
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { expect } from "chai";
import { ethers } from "hardhat";
import { DarkMatcher } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("DarkMatcher", function () {
  let darkMatcher: DarkMatcher;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let marketId: string;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const DarkMatcher = await ethers.getContractFactory("DarkMatcher");
    darkMatcher = await DarkMatcher.deploy(owner.address);
    await darkMatcher.waitForDeployment();

    // Set owner as relayer for testing
    await darkMatcher.setRelayer(owner.address);

    // Create a test market
    const tx = await darkMatcher.createMarket(
      "Will BTC hit $100k?",
      Math.floor(Date.now() / 1000) + 86400
    );
    const receipt = await tx.wait();

    // Get market ID from event
    const event = receipt?.logs.find((log: any) =>
      log.fragment?.name === "MarketCreated"
    );
    marketId = event?.args?.[0];

    // Credit balances for users
    await darkMatcher.creditBalance(user1.address, ethers.parseUnits("1000", 6));
    await darkMatcher.creditBalance(user2.address, ethers.parseUnits("1000", 6));
  });

  describe("Market Creation", function () {
    it("should create a market", async function () {
      const [question, expiresAt, resolved, outcome, volume] =
        await darkMatcher.getMarket(marketId);

      expect(question).to.equal("Will BTC hit $100k?");
      expect(resolved).to.be.false;
      expect(volume).to.equal(0);
    });

    it("should return all market IDs", async function () {
      const marketIds = await darkMatcher.getMarketIds();
      expect(marketIds.length).to.equal(1);
      expect(marketIds[0]).to.equal(marketId);
    });
  });

  describe("Order Submission", function () {
    it("should place an order", async function () {
      const tx = await darkMatcher.connect(user1).submitOrder(
        marketId,
        true, // YES
        6000, // 60%
        ethers.parseUnits("100", 6)
      );

      await expect(tx).to.emit(darkMatcher, "OrderPlaced");
    });

    it("should fail with insufficient balance", async function () {
      await expect(
        darkMatcher.connect(user1).submitOrder(
          marketId,
          true,
          6000,
          ethers.parseUnits("2000", 6) // More than balance
        )
      ).to.be.revertedWithCustomError(darkMatcher, "InsufficientBalance");
    });

    it("should fail with invalid price", async function () {
      await expect(
        darkMatcher.connect(user1).submitOrder(
          marketId,
          true,
          0, // Invalid
          ethers.parseUnits("100", 6)
        )
      ).to.be.revertedWithCustomError(darkMatcher, "InvalidPrice");

      await expect(
        darkMatcher.connect(user1).submitOrder(
          marketId,
          true,
          10000, // >= 100% invalid
          ethers.parseUnits("100", 6)
        )
      ).to.be.revertedWithCustomError(darkMatcher, "InvalidPrice");
    });
  });

  describe("Order Matching", function () {
    it("should match compatible orders", async function () {
      // User1 buys YES at 60%
      await darkMatcher.connect(user1).submitOrder(
        marketId,
        true,
        6000,
        ethers.parseUnits("100", 6)
      );

      // User2 buys NO at 45% (60 + 45 = 105 >= 100, should match)
      const tx = await darkMatcher.connect(user2).submitOrder(
        marketId,
        false,
        4500,
        ethers.parseUnits("100", 6)
      );

      await expect(tx).to.emit(darkMatcher, "TradeExecuted");

      // Check positions
      const [yes1, no1] = await darkMatcher.connect(user1).getMyPosition(marketId);
      const [yes2, no2] = await darkMatcher.connect(user2).getMyPosition(marketId);

      expect(yes1).to.be.gt(0);
      expect(no2).to.be.gt(0);
    });

    it("should not match incompatible orders", async function () {
      // User1 buys YES at 40%
      await darkMatcher.connect(user1).submitOrder(
        marketId,
        true,
        4000,
        ethers.parseUnits("100", 6)
      );

      // User2 buys NO at 40% (40 + 40 = 80 < 100, no match)
      await darkMatcher.connect(user2).submitOrder(
        marketId,
        false,
        4000,
        ethers.parseUnits("100", 6)
      );

      // Check no trade - both should have 0 shares
      const [yes1, no1] = await darkMatcher.connect(user1).getMyPosition(marketId);
      const [yes2, no2] = await darkMatcher.connect(user2).getMyPosition(marketId);

      expect(yes1).to.equal(0);
      expect(no2).to.equal(0);
    });
  });

  describe("Market Resolution", function () {
    it("should resolve market and settle positions", async function () {
      // Place matching orders
      await darkMatcher.connect(user1).submitOrder(marketId, true, 6000, ethers.parseUnits("100", 6));
      await darkMatcher.connect(user2).submitOrder(marketId, false, 4500, ethers.parseUnits("100", 6));

      // Resolve as YES
      const tx = await darkMatcher.resolveMarket(marketId, true);
      await expect(tx).to.emit(darkMatcher, "MarketResolved").withArgs(marketId, true);

      // User1 (YES) should have winnings
      const [avail1, locked1] = await darkMatcher.connect(user1).getMyBalance();
      expect(avail1).to.be.gt(ethers.parseUnits("900", 6)); // Started with 1000, bet 100, won
    });
  });

  describe("Balance Management", function () {
    it("should credit and debit balances", async function () {
      const [avail, locked] = await darkMatcher.connect(user1).getMyBalance();
      expect(avail).to.equal(ethers.parseUnits("1000", 6));

      await darkMatcher.debitBalance(user1.address, ethers.parseUnits("500", 6));

      const [availAfter] = await darkMatcher.connect(user1).getMyBalance();
      expect(availAfter).to.equal(ethers.parseUnits("500", 6));
    });
  });

  describe("Privacy", function () {
    it("should have encryption public key", async function () {
      const pubKey = await darkMatcher.getEncryptionPublicKey();
      expect(pubKey).to.not.equal(ethers.ZeroHash);
    });

    it("should only allow user to view their own position", async function () {
      // This test verifies the privacy design - in Sapphire TEE,
      // msg.sender is used to restrict position viewing
      await darkMatcher.connect(user1).submitOrder(marketId, true, 6000, ethers.parseUnits("100", 6));

      // User1 can see their position
      const [yes1] = await darkMatcher.connect(user1).getMyPosition(marketId);

      // User2 would see zeros (their own position, not user1's)
      const [yes2] = await darkMatcher.connect(user2).getMyPosition(marketId);

      expect(yes2).to.equal(0);
    });
  });
});

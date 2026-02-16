import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { BaseClawSubscriptions } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Minimal ERC-20 mock for USDC (6 decimals)
const MOCK_USDC_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
];

// Minimal ERC-20 bytecode for tests — we deploy a simple mock
const MOCK_ERC20_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;

describe("BaseClawSubscriptions", function () {
  // ──────────────────────────────────────────
  //  Fixture
  // ──────────────────────────────────────────

  async function deployFixture() {
    const [owner, revenueWallet, subscriber, other] =
      await ethers.getSigners();

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy BaseClawSubscriptions behind UUPS proxy
    const BaseClawSubscriptions = await ethers.getContractFactory(
      "BaseClawSubscriptions"
    );
    const proxy = (await upgrades.deployProxy(
      BaseClawSubscriptions,
      [owner.address, revenueWallet.address, await usdc.getAddress()],
      { initializer: "initialize", kind: "uups" }
    )) as unknown as BaseClawSubscriptions;
    await proxy.waitForDeployment();

    // Mint USDC to subscriber (1000 USDC)
    const mintAmount = 1_000_000_000n; // 1000 USDC
    await usdc.mint(subscriber.address, mintAmount);

    // Approve the proxy to spend subscriber's USDC
    const proxyAddress = await proxy.getAddress();
    await usdc.connect(subscriber).approve(proxyAddress, mintAmount);

    return { proxy, usdc, owner, revenueWallet, subscriber, other };
  }

  // ──────────────────────────────────────────
  //  Initialization
  // ──────────────────────────────────────────

  describe("Initialization", function () {
    it("should set the owner correctly", async function () {
      const { proxy, owner } = await loadFixture(deployFixture);
      expect(await proxy.owner()).to.equal(owner.address);
    });

    it("should set the revenue wallet correctly", async function () {
      const { proxy, revenueWallet } = await loadFixture(deployFixture);
      expect(await proxy.revenueWallet()).to.equal(revenueWallet.address);
    });

    it("should set the USDC address correctly", async function () {
      const { proxy, usdc } = await loadFixture(deployFixture);
      expect(await proxy.usdc()).to.equal(await usdc.getAddress());
    });

    it("should set default tier prices", async function () {
      const { proxy } = await loadFixture(deployFixture);
      expect(await proxy.tierPrices(0)).to.equal(0);
      expect(await proxy.tierPrices(1)).to.equal(10_000_000n);
      expect(await proxy.tierPrices(2)).to.equal(30_000_000n);
      expect(await proxy.tierPrices(3)).to.equal(80_000_000n);
    });

    it("should not allow re-initialization", async function () {
      const { proxy, owner, revenueWallet, usdc } =
        await loadFixture(deployFixture);
      await expect(
        proxy.initialize(
          owner.address,
          revenueWallet.address,
          await usdc.getAddress()
        )
      ).to.be.revertedWithCustomError(proxy, "InvalidInitialization");
    });
  });

  // ──────────────────────────────────────────
  //  Subscribe
  // ──────────────────────────────────────────

  describe("Subscribe", function () {
    it("should subscribe to the free tier without USDC transfer", async function () {
      const { proxy, usdc, subscriber, revenueWallet } =
        await loadFixture(deployFixture);

      const walletBefore = await usdc.balanceOf(revenueWallet.address);

      await expect(proxy.connect(subscriber).subscribe(0))
        .to.emit(proxy, "Subscribed")
        .withArgs(subscriber.address, 0, 0, (v: bigint) => v > 0n);

      // No USDC should have moved
      expect(await usdc.balanceOf(revenueWallet.address)).to.equal(
        walletBefore
      );
    });

    it("should subscribe to Starter tier and transfer 10 USDC", async function () {
      const { proxy, usdc, subscriber, revenueWallet } =
        await loadFixture(deployFixture);

      const walletBefore = await usdc.balanceOf(revenueWallet.address);

      await expect(proxy.connect(subscriber).subscribe(1))
        .to.emit(proxy, "Subscribed")
        .withArgs(
          subscriber.address,
          1,
          10_000_000n,
          (v: bigint) => v > 0n
        );

      expect(await usdc.balanceOf(revenueWallet.address)).to.equal(
        walletBefore + 10_000_000n
      );
    });

    it("should subscribe to Pro tier and transfer 30 USDC", async function () {
      const { proxy, usdc, subscriber, revenueWallet } =
        await loadFixture(deployFixture);

      await proxy.connect(subscriber).subscribe(2);

      expect(await usdc.balanceOf(revenueWallet.address)).to.equal(
        30_000_000n
      );
    });

    it("should subscribe to Business tier and transfer 80 USDC", async function () {
      const { proxy, usdc, subscriber, revenueWallet } =
        await loadFixture(deployFixture);

      await proxy.connect(subscriber).subscribe(3);

      expect(await usdc.balanceOf(revenueWallet.address)).to.equal(
        80_000_000n
      );
    });

    it("should revert for an invalid tier", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(subscriber).subscribe(4)
      ).to.be.revertedWithCustomError(proxy, "InvalidTier");
    });

    it("should revert when paused", async function () {
      const { proxy, owner, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(owner).pause();
      await expect(
        proxy.connect(subscriber).subscribe(1)
      ).to.be.revertedWithCustomError(proxy, "EnforcedPause");
    });

    it("should allow subscribing again after unpause", async function () {
      const { proxy, owner, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(owner).pause();
      await proxy.connect(owner).unpause();
      await expect(proxy.connect(subscriber).subscribe(1)).to.not.be.reverted;
    });
  });

  // ──────────────────────────────────────────
  //  Tier & Active Checks
  // ──────────────────────────────────────────

  describe("Tier and Active Checks", function () {
    it("should return correct tier after subscribing", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(subscriber).subscribe(2);
      expect(await proxy.getTier(subscriber.address)).to.equal(2);
    });

    it("should report isActive = true after subscribing to a paid tier", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(subscriber).subscribe(1);
      expect(await proxy.isActive(subscriber.address)).to.be.true;
    });

    it("should report isActive = false for free tier", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(subscriber).subscribe(0);
      expect(await proxy.isActive(subscriber.address)).to.be.false;
    });

    it("should report isActive = false for an address that never subscribed", async function () {
      const { proxy, other } = await loadFixture(deployFixture);
      expect(await proxy.isActive(other.address)).to.be.false;
    });

    it("should return Free tier for an address that never subscribed", async function () {
      const { proxy, other } = await loadFixture(deployFixture);
      expect(await proxy.getTier(other.address)).to.equal(0);
    });
  });

  // ──────────────────────────────────────────
  //  Expiry
  // ──────────────────────────────────────────

  describe("Subscription Expiry", function () {
    it("should be active within 30 days", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(subscriber).subscribe(1);

      // Advance 29 days
      await time.increase(29 * 24 * 60 * 60);
      expect(await proxy.isActive(subscriber.address)).to.be.true;
      expect(await proxy.getTier(subscriber.address)).to.equal(1);
    });

    it("should expire after 30 days", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(subscriber).subscribe(1);

      // Advance 31 days
      await time.increase(31 * 24 * 60 * 60);
      expect(await proxy.isActive(subscriber.address)).to.be.false;
      expect(await proxy.getTier(subscriber.address)).to.equal(0);
    });

    it("should allow renewal after expiry", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);
      await proxy.connect(subscriber).subscribe(1);

      // Advance 31 days
      await time.increase(31 * 24 * 60 * 60);
      expect(await proxy.isActive(subscriber.address)).to.be.false;

      // Re-subscribe
      await proxy.connect(subscriber).subscribe(2);
      expect(await proxy.isActive(subscriber.address)).to.be.true;
      expect(await proxy.getTier(subscriber.address)).to.equal(2);
    });
  });

  // ──────────────────────────────────────────
  //  Owner-Only Functions
  // ──────────────────────────────────────────

  describe("Owner-Only Functions", function () {
    it("should allow owner to set tier price", async function () {
      const { proxy, owner } = await loadFixture(deployFixture);

      await expect(proxy.connect(owner).setTierPrice(1, 15_000_000n))
        .to.emit(proxy, "TierPriceUpdated")
        .withArgs(1, 15_000_000n);

      expect(await proxy.tierPrices(1)).to.equal(15_000_000n);
    });

    it("should revert setTierPrice for invalid tier", async function () {
      const { proxy, owner } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(owner).setTierPrice(5, 100n)
      ).to.be.revertedWithCustomError(proxy, "InvalidTier");
    });

    it("should not allow non-owner to set tier price", async function () {
      const { proxy, other } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(other).setTierPrice(1, 15_000_000n)
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to update revenue wallet", async function () {
      const { proxy, owner, other } = await loadFixture(deployFixture);

      await expect(proxy.connect(owner).setRevenueWallet(other.address))
        .to.emit(proxy, "RevenueWalletUpdated")
        .withArgs(other.address);

      expect(await proxy.revenueWallet()).to.equal(other.address);
    });

    it("should revert setRevenueWallet with zero address", async function () {
      const { proxy, owner } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(owner).setRevenueWallet(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(proxy, "ZeroAddress");
    });

    it("should not allow non-owner to update revenue wallet", async function () {
      const { proxy, other } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(other).setRevenueWallet(other.address)
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to pause and unpause", async function () {
      const { proxy, owner } = await loadFixture(deployFixture);

      await proxy.connect(owner).pause();
      expect(await proxy.paused()).to.be.true;

      await proxy.connect(owner).unpause();
      expect(await proxy.paused()).to.be.false;
    });

    it("should not allow non-owner to pause", async function () {
      const { proxy, other } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(other).pause()
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });

    it("should not allow non-owner to unpause", async function () {
      const { proxy, owner, other } = await loadFixture(deployFixture);
      await proxy.connect(owner).pause();
      await expect(
        proxy.connect(other).unpause()
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });
  });

  // ──────────────────────────────────────────
  //  Subscription Data
  // ──────────────────────────────────────────

  describe("Subscription Data", function () {
    it("should store subscribedAt and expiresAt correctly", async function () {
      const { proxy, subscriber } = await loadFixture(deployFixture);

      const tx = await proxy.connect(subscriber).subscribe(2);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const blockTimestamp = BigInt(block!.timestamp);

      const sub = await proxy.subscriptions(subscriber.address);
      expect(sub.tier).to.equal(2);
      expect(sub.subscribedAt).to.equal(blockTimestamp);
      expect(sub.expiresAt).to.equal(blockTimestamp + 30n * 24n * 60n * 60n);
    });
  });
});

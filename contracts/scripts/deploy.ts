import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Base Mainnet USDC
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
// Base Sepolia USDC (circle test token)
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("=== BaseClawSubscriptions Deployment ===");
  console.log("Deployer:", deployer.address);
  console.log("Chain ID:", chainId);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log();

  // Determine USDC address based on network
  let usdcAddress: string;
  if (chainId === 8453) {
    usdcAddress = BASE_USDC;
  } else if (chainId === 84532) {
    usdcAddress = BASE_SEPOLIA_USDC;
  } else {
    usdcAddress = process.env.USDC_ADDRESS || BASE_USDC;
  }

  const revenueWallet = process.env.REVENUE_WALLET || deployer.address;

  console.log("USDC address:", usdcAddress);
  console.log("Revenue wallet:", revenueWallet);
  console.log();

  // Deploy as UUPS proxy
  const BaseClawSubscriptions = await ethers.getContractFactory(
    "BaseClawSubscriptions"
  );

  console.log("Deploying proxy...");
  const proxy = await upgrades.deployProxy(
    BaseClawSubscriptions,
    [deployer.address, revenueWallet, usdcAddress],
    {
      initializer: "initialize",
      kind: "uups",
      txOverrides: {
        gasLimit: 3_000_000,
      },
    }
  );

  console.log("Waiting for deployment confirmation...");
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  console.log();
  console.log("✅ Proxy deployed to:", proxyAddress);

  try {
    const implementationAddress =
      await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("Implementation at:  ", implementationAddress);
    console.log();
    console.log("To verify on Basescan:");
    console.log(
      `  npx hardhat verify --network base ${implementationAddress}`
    );
  } catch (e) {
    console.log("(Could not read implementation address — proxy is still valid)");
  }

  console.log();
  console.log("🦀 Save this proxy address! You need it for your app.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

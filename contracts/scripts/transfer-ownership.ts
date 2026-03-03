import { ethers } from "hardhat";

const PROXY_ADDRESS = "0x79e045f1a50cf2940b73DE8Fd1d470dB7e7B8A46";
const NEW_OWNER = "0xa351aA3ccB57E4cCE1Fda23687d8867Dc04FFaf9";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Current signer:", signer.address);

  const contract = await ethers.getContractAt(
    "BaseClawSubscriptions",
    PROXY_ADDRESS
  );

  // Check current owner
  const currentOwner = await contract.owner();
  console.log("Current contract owner:", currentOwner);

  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("ERROR: Signer is NOT the current owner! Cannot transfer.");
    process.exit(1);
  }

  console.log("Transferring ownership to:", NEW_OWNER);
  const tx = await contract.transferOwnership(NEW_OWNER);
  console.log("TX hash:", tx.hash);
  await tx.wait();
  console.log("✅ Ownership transferred successfully!");

  // Verify
  const newOwner = await contract.owner();
  console.log("New owner:", newOwner);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

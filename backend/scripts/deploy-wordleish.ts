import { ethers } from 'hardhat';

async function main() {
  const Wordleish = await ethers.getContractFactory('Wordleish');
  const wordleish = await Wordleish.deploy();
  await wordleish.deployed();
  console.log(wordleish.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

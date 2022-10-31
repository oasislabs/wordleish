import { HardhatUserConfig } from 'hardhat/config';

import '@oasisprotocol/sapphire-hardhat';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-watcher';
import 'solidity-coverage';

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1337, // @see https://hardhat.org/metamask-issue.html
    },
    'emerald-testnet': {
      url: 'https://testnet.emerald.oasis.dev',
      chainId: 0xa515,
      accounts,
    },
    'emerald-mainnet': {
      url: 'https://emerald.oasis.dev',
      chainId: 0xa516,
      accounts,
    },
    'sapphire-testnet': {
      url: 'https://testnet.sapphire.oasis.dev',
      chainId: 0x5aff,
      accounts,
    },
    'sapphire-mainnet': {
      url: 'https://sapphire.oasis.dev',
      chainId: 0x5afe,
      accounts,
    },
  },
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts/'],
    },
    test: {
      tasks: ['test'],
      files: ['./contracts/', './test'],
    },
    coverage: {
      tasks: ['coverage'],
      files: ['./contracts/', './test'],
    },
  },
  mocha: {
    require: ['ts-node/register/files'],
    timeout: 20_000,
  },
};

export default config;

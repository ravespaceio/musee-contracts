import { task } from "hardhat/config";
import "solidity-coverage";
import "hardhat-docgen";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter"

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

const ETH_DERIVATION_PATH = "m/44'/52752'/0'/0/";

function getCoinMarketCapAPIKey(network:string): string {
	require("dotenv").config({ path: `.env.${network}` });
	return process.env.COINMARKETCAP_API || '';  
}

function getMnemonic(network:string) : string {
	require("dotenv").config({ path: `.env.${network}` });
	return process.env.MNEMONIC || '';
};

export default {
  networks: {
    hardhat: {
      hardfork: "london",
      allowUnlimitedContractSize: true,
      gasPrice: "auto",
      gas: "auto",
      blockGasLimit: 99999999999
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/e41faa24301e41d2a67002d07c758c2f",
      accounts: {
        mnemonic: getMnemonic("mainnet")
      },
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
    },
    goerli: {
      url: "https://goerli.infura.io/v3/e41faa24301e41d2a67002d07c758c2f",
      accounts: {
        mnemonic: getMnemonic("goerli")
      },
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/e41faa24301e41d2a67002d07c758c2f",
      accounts: {
        mnemonic: getMnemonic("ropsten")
      },
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/e41faa24301e41d2a67002d07c758c2f",
      accounts: {
        mnemonic: getMnemonic("rinkeby")
      },
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
      timeout: 600000
    }
  },
  solidity: { 
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    user1: {
      default: 1
    },
    user2: {
      default: 2
    },
    user3: {
      default: 3
    }
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
  gasReporter: {
    currency: 'EUR',
    coinmarketcap: getCoinMarketCapAPIKey("rinkeby")
  }
};

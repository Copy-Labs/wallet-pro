import browser from 'webextension-polyfill';
import {
  arbitrumSepolia,
  baseSepolia,
  hyperliquidEvmTestnet,
  optimismSepolia,
  polygonAmoy,
  polynomialSepolia,
  sepolia,
  shapeSepolia,
  soneiumMinato,
  unichainSepolia,
  zoraSepolia
} from "viem/chains"

export const MINIMUM_PASSWORD_LENGTH = 8;
export const NETWORK_TYPE_LIST = ['testnet', 'mainnet'];

// Blockchain symbol mapping
export const blockchainSymbolMapping: Record<number, string> = {
  1: "ETH",     // Ethereum Mainnet
  11155111: "ETH",  // Sepolia Testnet
  137: "MATIC", // Polygon Mainnet
  80001: "MATIC", // Polygon Mumbai (if supported)
  10: "ETH",   // Optimism Mainnet
  420: "ETH",  // Optimism Goerli (if supported)
  42161: "ETH", // Arbitrum One
  421613: "ETH", // Arbitrum Goerli (if supported)
  8453: "ETH",  // Base Mainnet
  84531: "ETH", // Base Goerli (deprecated)
  84532: "ETH", // Base Sepolia
}

export const IS_CHROME = /Chrome\//i.test(global.navigator?.userAgent);

export const IS_FIREFOX = /Firefox\//i.test(global.navigator?.userAgent);

export let IS_VIVALDI = false;
browser.tabs.onCreated.addListener((tab) => {
  if (tab && 'vivExtData' in tab) {
    IS_VIVALDI = true;
  }
});

export const IS_LINUX = /linux/i.test(global.navigator?.userAgent);

let chromeVersion: number | null = null;

if (IS_CHROME) {
  const matches = global.navigator?.userAgent.match(/Chrome\/(\d+[^.\s])/);
  if (matches && matches.length >= 2) {
    chromeVersion = Number(matches[1]);
  }
}

export const IS_AFTER_CHROME91 = IS_CHROME
  ? chromeVersion && chromeVersion >= 91
  : false;

export const IS_WINDOWS = /windows/i.test(global.navigator?.userAgent);

export const CHECK_METAMASK_INSTALLED_URL = {
  Chrome: 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/phishing.html',
  Firefox: '',
  Brave: '',
  Edge: '',
};

export const SAFE_RPC_METHODS = [
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_coinbase',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getEncryptionPublicKey',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getProof',
  'eth_getStorageAt',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getWork',
  'eth_hashrate',
  'eth_mining',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_protocolVersion',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_uninstallFilter',
  'wallet_requestPermissions',
  'wallet_revokePermissions',
  'wallet_getPermissions',
  'net_version',
];

export const MINIMUM_GAS_LIMIT = 21000;

export const SPONSORED_TESTNET_CHAINS_IDS = [
  arbitrumSepolia.id,
  baseSepolia.id,
  hyperliquidEvmTestnet.id,
  optimismSepolia.id,
  polygonAmoy.id,
  polynomialSepolia.id,
  sepolia.id,
  shapeSepolia.id,
  soneiumMinato.id,
  unichainSepolia.id,
  zoraSepolia.id
]

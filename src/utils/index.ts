import {CHECK_METAMASK_INSTALLED_URL, IS_CHROME} from "~config/constant";

const UI_TYPE = {
  Tab: 'index',
  Pop: 'popup',
  Notification: 'notification',
};

type UiTypeCheck = {
  isTab: boolean;
  isNotification: boolean;
  isPop: boolean;
};

export const getUiType = (): UiTypeCheck => {
  const { pathname } = window.location;
  return Object.entries(UI_TYPE).reduce((m, [key, value]) => {
    m[`is${key}`] = pathname === `/${value}.html`;

    return m;
  }, {} as UiTypeCheck);
};

export const getUITypeName = (): string => {
  const UIType = getUiType();

  if (UIType.isPop) return 'popup';
  if (UIType.isNotification) return 'notification';
  if (UIType.isTab) return 'tab';

  return '';
};

export const isStringOrNumber = (data) => {
  return typeof data === 'string' || typeof data === 'number';
};

export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const shortenAddress = (addr: string) => {
  return `${addr?.substring(0, 6)}...${addr?.substring(addr.length - 4)}`;
};

export const formatBalance = (balance: string) => {
  const num = parseFloat(balance)
  if (num === 0) return "0.0000"
  if (num < 0.0001) return "< 0.0001"
  return num.toFixed(6)
}

export function toDecimalPlace(value: number, places: number) {
  if (!Number(value)) return 0;

  // const number = 123.456;
  const formatted = Number(value).toFixed(places); // "123.46" as a string
  return parseFloat(formatted); // value as a number
}

export const fetchEthPrice = async () => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const data = await response.json();
    return (data as unknown as any).ethereum.usd;
  } catch (error) {
    console.error("Failed to fetch ETH price", error);
    return null;
  }
};

export const findTickerByName = (name: string): string | undefined => {
  /*
  const ethereumTicker = findTickerByName("Ethereum");
  console.log(ethereumTicker); // Output: "ETH"
  */
  // const token = Object.values(TokenDetailsMapping).find(
  //   (token) => token.name === name
  // );
  // return token?.ticker; // Return the ticker if found
};

export const toCamelCase = (input: string): string => {
  /*
  // Examples:
  console.log(toCamelCase("Base Sepolia")); // Output: "baseSepolia"
  console.log(toCamelCase("Ethereum Mainnet")); // Output: "ethereumMainnet"
  */
  return input
    .split(" ") // Split the string into words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase() // Lowercase the first word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Capitalize subsequent words
    )
    .join(""); // Join the words back into a single string
};

/* DATE AND TIME FORMATTING */
export const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export const formatAutoLockTimeout = (ms: number): string => {
  const minutes = Math.round(ms / (60 * 1000))
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

// Capitalize first letter of string
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}


/**
 *
 * @param origin (exchange.pancakeswap.finance)
 * @returns (pancakeswap)
 */
export const getOriginName = (origin: string) => {
  const matches = origin.replace(/https?:\/\//, '').match(/^([^.]+\.)?(\S+)\./);

  return matches ? matches[2] || origin : origin;
};

export const hashCode = (str: string) => {
  if (!str) return 0;
  let hash = 0,
    i,
    chr,
    len;
  if (str.length === 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export const isMetaMaskActive = async () => {
  let url = '';

  if (IS_CHROME) {
    url = CHECK_METAMASK_INSTALLED_URL.Chrome;
  }

  if (!url) return false;

  try {
    const res = await fetch(url);
    await res.text();

    return true;
  } catch (e) {
    return false;
  }
};

export const ellipsisOverflowedText = (
  str: string,
  length = 5,
  removeLastComma = false
) => {
  if (str.length <= length) return str;
  let cut = str.substring(0, length);
  if (removeLastComma) {
    if (cut.endsWith(',')) {
      cut = cut.substring(0, length - 1);
    }
  }
  return `${cut}...`;
};

/**
 * @description compare address is same, ignore case
 */
export const isSameAddress = (a: string, b: string) => {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

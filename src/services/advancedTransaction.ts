import { createPublicClient, http, isAddress, type Hash } from "viem";

export interface NormalizedTransaction {
  hash: Hash;
  from: string;
  to: string | null;
  value: string;
  blockNumber: bigint;
  timestamp: number;
  isInternal: boolean;
}

export interface TransactionFetchOptions {
  fromBlock?: bigint;
  toBlock?: bigint;
  includeInternal?: boolean;
  concurrency?: number;
  useCache?: boolean;
  onUpdate?: (txs: NormalizedTransaction[]) => void;
}

let db: any = null;

// Optional Dexie integration
async function initCache() {
  if (db) return db;
  try {
    const Dexie = (await import("dexie")).default;
    db = new Dexie("SmartWalletProDB");
    db.version(1).stores({
      transactions: "hash, address, chainId, blockNumber",
    });
    return db;
  } catch {
    console.warn("[Cache] Dexie not available, proceeding without cache");
    return null;
  }
}

/**
 * Drop-in, wallet-optimized transaction retriever
 * @param address User wallet address
 * @param chainId Network chain ID
 * @param rpcUrl RPC endpoint
 * @param opts Optional config
 */
export async function getTransactions(
  address: string,
  chainId: number,
  rpcUrl: string,
  opts: TransactionFetchOptions = {}
): Promise<NormalizedTransaction[]> {
  if (!isAddress(address)) throw new Error("Invalid address");

  const {
    fromBlock = 0n,
    toBlock,
    includeInternal = true,
    concurrency = 4,
    useCache = true,
    onUpdate,
  } = opts;

  const client = createPublicClient({
    transport: http(rpcUrl),
    chain: {
      id: chainId,
      name: "custom",
      nativeCurrency: {name: "ETH", symbol: "ETH", decimals: 18},
      rpcUrls: {
        default: {
          http: [rpcUrl],
          webSocket: []
        }
      }
    },
  });

  console.log("Advanced Transactions: ", client);

  const latestBlock = toBlock ?? await client.getBlockNumber();

  // --- Step 1: Try cache for instant UI display
  let cached: NormalizedTransaction[] = [];
  if (useCache) {
    const cache = await initCache();
    if (cache) {
      cached = await cache.transactions
        .where({ address, chainId })
        .toArray();
      if (cached.length && onUpdate) onUpdate(cached);
    }
  }

  // --- Step 2: Fetch recent transactions in parallel (fast mode)
  // Using 10-block ranges for Alchemy Free tier compatibility (max 10 blocks)
  const step = 10n;
  const ranges: [bigint, bigint][] = [];
  try {
    for (let i = latestBlock; i > fromBlock; i -= step) {
      ranges.push([i - step, i]);
    }
    console.log("[AdvancedTransactions] fetchRange::ranges", ranges, latestBlock, fromBlock);
  } catch (e) {
    console.error("[AdvancedTransactions] fetchRange::Error", e);
  }

  const results: NormalizedTransaction[] = [];
  const limit = concurrency;

  async function fetchRange([start, end]: [bigint, bigint]) {
    const logs = await client.getLogs({
      address: address as `0x${string}`,
      fromBlock: start,
      toBlock: end,
    });

    console.log("[AdvancedTransactions] fetchRange::Logs", logs);

    const txs = logs.map((log) => ({
      hash: log.transactionHash!,
      from: log.address,
      to: null,
      value: "0",
      blockNumber: log.blockNumber,
      timestamp: 0,
      isInternal: false,
    }));

    results.push(...txs);
    if (onUpdate) onUpdate([...cached, ...results]);

    // Optional internal txs
    if (includeInternal) {
      try {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "trace_filter",
            params: [{
              fromBlock: `0x${start.toString(16)}`,
              toBlock: `0x${end.toString(16)}`,
              // fromAddress: [address],
              toAddress: [address],
            }],
          }),
        });
        const json = await res.json();
        if (json.result?.length) {
          json.result.forEach((t: any) =>
            results.push({
              hash: t.transactionHash,
              from: t.action?.from,
              to: t.action?.to,
              value: t.action?.value ?? "0x0",
              blockNumber: BigInt(t.blockNumber ?? 0),
              timestamp: 0,
              isInternal: true,
            })
          );
        }
      } catch {
        // silently ignore if trace unsupported
      }
    }
  }

  const pool = [];
  for (const range of ranges) {
    pool.push(fetchRange(range));
    if (pool.length >= limit) {
      await Promise.all(pool);
      pool.length = 0;
    }
  }
  await Promise.all(pool);

  // --- Step 3: Fetch block timestamps
  const blockNumbers = [...new Set(results.map(tx => tx.blockNumber))];
  const blockMap = new Map<bigint, number>();
  await Promise.all(blockNumbers.map(async (bn) => {
    try {
      const block = await client.getBlock({ blockNumber: bn });
      blockMap.set(bn, Number(block.timestamp));
    } catch {
      blockMap.set(bn, 0);
    }
  }));

  const finalTxs = results.map(tx => ({
    ...tx,
    timestamp: blockMap.get(tx.blockNumber) ?? 0,
  }));

  // --- Step 4: Save to cache
  if (useCache && db) {
    await db.transactions.bulkPut(
      finalTxs.map((tx) => ({
        ...tx,
        address,
        chainId,
      }))
    );
  }

  console.log("advanced Tx", cached, finalTxs);

  return [...cached, ...finalTxs];
}

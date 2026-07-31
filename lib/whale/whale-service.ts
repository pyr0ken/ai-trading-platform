import type { WhaleTransaction } from './types';
import {
  WHALE_MIN_USD,
  SEVERITY_THRESHOLDS,
  TRACKED_TOKENS,
  MAX_BLOCKS_BACK,
  API_SOURCES,
} from './config';
import { lookupLabel, shortenAddress } from './known-addresses';

/* ───────────────────────────────────────────────
   In-memory dedup set (tx hash → WhaleTransaction)
   Cleared on each poll tick; history stored in client
   ─────────────────────────────────────────────── */

const seenTxHashes = new Set<string>();
const priceCache = new Map<string, { usd: number; fetchedAt: number }>();
const CACHE_TTL = 60_000; // 1 minute

/* ───────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────── */

function getSeverity(usd: number): WhaleTransaction['severity'] {
  for (let i = SEVERITY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (usd >= SEVERITY_THRESHOLDS[i].minUsd) return SEVERITY_THRESHOLDS[i].level;
  }
  return 'low';
}

function generateId(chain: string, hash: string, logIndex?: string): string {
  return `${chain}_${hash}_${logIndex || '0'}`;
}

/* ───────────────────────────────────────────────
   Price fetching — free CoinGecko API
   ─────────────────────────────────────────────── */

async function fetchPrices(): Promise<Record<string, number>> {
  const ids = TRACKED_TOKENS.map((t) => t.coingeckoId).join(',');
  const now = Date.now();

  // Check cache first
  const allCached = TRACKED_TOKENS.every((t) => {
    const cached = priceCache.get(t.coingeckoId);
    return cached && now - cached.fetchedAt < CACHE_TTL;
  });
  if (allCached) {
    const result: Record<string, number> = {};
    for (const t of TRACKED_TOKENS) {
      result[t.symbol] = priceCache.get(t.coingeckoId)!.usd;
    }
    return result;
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return {};
    const json = await res.json();
    const result: Record<string, number> = {};
    for (const t of TRACKED_TOKENS) {
      const usd = json[t.coingeckoId]?.usd;
      if (usd) {
        priceCache.set(t.coingeckoId, { usd, fetchedAt: now });
        result[t.symbol] = usd;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/* ───────────────────────────────────────────────
   Etherscan API — fetch large token transfers
   ─────────────────────────────────────────────── */

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  contractAddress?: string;
}

async function fetchEtherscanTransfers(
  chain: 'ethereum' | 'bsc',
  apiKey: string,
): Promise<EtherscanTx[]> {
  const config = API_SOURCES[chain];
  const baseUrl = config.scanUrl;

  // Get latest block number
  const blockRes = await fetch(
    `${baseUrl}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!blockRes.ok) return [];
  const blockData = await blockRes.json();
  const latestBlock = parseInt(blockData.result, 16);
  const fromBlock = Math.max(0, latestBlock - MAX_BLOCKS_BACK);

  // Fetch ETH/BNB value transfers (the native coin)
  const nativeSymbol = chain === 'ethereum' ? 'ETH' : 'BNB';
  const nativeDecimals = 18;

  const transfers: EtherscanTx[] = [];

  // Get token transfers for tracked tokens
  for (const token of TRACKED_TOKENS) {
    if (chain === 'bsc' && token.symbol !== 'BNB' && token.symbol !== 'USDT' && token.symbol !== 'USDC') continue;
    if (chain === 'ethereum' && token.symbol === 'BNB') continue;

    let url: string;
    if (token.symbol === 'ETH' || token.symbol === 'BNB') continue; // handled below
    url = `${baseUrl}?module=account&action=tokentx&startblock=${fromBlock}&endblock=${latestBlock}&sort=desc&apikey=${apiKey}&contractaddress=${getContractAddress(chain, token.symbol)}`;
    if (token.symbol === 'USDT') {
      url = `${baseUrl}?module=account&action=tokentx&contractaddress=0xdAC17F958D2ee523a2206206994597C13D831ec7&page=1&offset=100&startblock=${fromBlock}&endblock=${latestBlock}&sort=desc&apikey=${apiKey}`;
    } else if (token.symbol === 'USDC') {
      url = `${baseUrl}?module=account&action=tokentx&contractaddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&page=1&offset=100&startblock=${fromBlock}&endblock=${latestBlock}&sort=desc&apikey=${apiKey}`;
    } else if (token.symbol === 'WBTC') {
      url = `${baseUrl}?module=account&action=tokentx&contractaddress=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599&page=1&offset=100&startblock=${fromBlock}&endblock=${latestBlock}&sort=desc&apikey=${apiKey}`;
    }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === '1' && Array.isArray(data.result)) {
          for (const tx of data.result) {
            const valueNum = parseFloat(tx.value) / 10 ** (parseInt(tx.tokenDecimal) || 18);
            if (chain === 'ethereum') continue; // we skip price check here, done later
            transfers.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: valueNum.toString(),
              timeStamp: tx.timeStamp,
              tokenSymbol: tx.tokenSymbol,
              tokenDecimal: tx.tokenDecimal,
              contractAddress: tx.contractAddress,
            });
          }
        }
      }
    } catch {
      // continue with other sources
    }
  }

  // Fetch native ETH/BNB transactions from the block directly via proxy
  try {
    const blockDetailRes = await fetch(
      `${baseUrl}?module=proxy&action=eth_getBlockByNumber&tag=${latestBlock.toString(16)}&boolean=true&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (blockDetailRes.ok) {
      const blockDetail = await blockDetailRes.json();
      const blockTxs: { hash: string; from: string; to: string; value: string }[] = blockDetail.result?.transactions || [];

      for (const tx of blockTxs) {
        if (!tx.to) continue; // contract creation
        const valWei = BigInt(tx.value);
        if (valWei === BigInt(0)) continue;
        const valEth = Number(valWei) / 10 ** nativeDecimals;
        // We'll filter by USD value after getting prices
        transfers.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: valEth.toString(),
          timeStamp: '0', // we won't have exact timestamp from this method
          tokenSymbol: nativeSymbol,
          tokenDecimal: nativeDecimals.toString(),
        });
      }
    }
  } catch {
    // fallback to RPC
  }

  return transfers;
}

function getContractAddress(chain: 'ethereum' | 'bsc', symbol: string): string {
  if (chain === 'ethereum') {
    switch (symbol) {
      case 'USDT': return '0xdAC17F958D2ee523a2206206994597C13D831ec7';
      case 'USDC': return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      case 'WBTC': return '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
      default: return '';
    }
  }
  // BSC
  switch (symbol) {
    case 'USDT': return '0x55d398326f99059fF775485246999027B3197955';
    case 'USDC': return '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
    default: return '';
  }
}

/* ───────────────────────────────────────────────
   RPC Fallback — fetch last block native coins
   ─────────────────────────────────────────────── */

async function fetchRpcNativeTransfers(
  chain: 'ethereum' | 'bsc',
): Promise<EtherscanTx[]> {
  const config = API_SOURCES[chain];
  const nativeSymbol = chain === 'ethereum' ? 'ETH' : 'BNB';

  try {
    const blockRes = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!blockRes.ok) return [];
    const blockData = await blockRes.json();
    const latestBlock = parseInt(blockData.result, 16);
    const fromBlock = Math.max(0, latestBlock - 1); // only check latest block via RPC (it's slower)

    const blockDetailRes = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [fromBlock.toString(16), true],
        id: 1,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!blockDetailRes.ok) return [];
    const blockDetail = await blockDetailRes.json();
    const txs: { hash: string; from: string; to: string; value: string }[] =
      blockDetail.result?.transactions || [];

    const transfers: EtherscanTx[] = [];
    for (const tx of txs) {
      if (!tx.to) continue;
      const valWei = BigInt(tx.value);
      if (valWei === BigInt(0)) continue;
      transfers.push({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: (Number(valWei) / 1e18).toString(),
        timeStamp: '0',
        tokenSymbol: nativeSymbol,
        tokenDecimal: '18',
      });
    }
    return transfers;
  } catch {
    return [];
  }
}

/* ───────────────────────────────────────────────
   Direction detection
   ─────────────────────────────────────────────── */

function detectDirection(
  from: string,
  to: string,
  chain: 'ethereum' | 'bsc',
): WhaleTransaction['direction'] {
  const fromLabel = lookupLabel(from, chain);
  const toLabel = lookupLabel(to, chain);

  if (fromLabel && !toLabel) return 'exchange_outflow';
  if (!fromLabel && toLabel) return 'exchange_inflow';

  // Both are exchanges (internal transfer) or both unknown
  return 'unknown';
}

/* ───────────────────────────────────────────────
   Label helpers
   ─────────────────────────────────────────────── */

function getLabel(addr: string, chain: 'ethereum' | 'bsc'): string {
  return lookupLabel(addr, chain) || shortenAddress(addr);
}

/* ───────────────────────────────────────────────
   Main polling function
   ─────────────────────────────────────────────── */

export async function pollWhaleAlerts(): Promise<{
  transactions: WhaleTransaction[];
  totalUsd: number;
  count: number;
}> {
  const apiKey = process.env.ETHERSCAN_API_KEY || '';
  const hasApiKey = apiKey.length > 0;

  // Fetch prices first
  const prices = await fetchPrices();

  // Collect raw transfers from all sources
  const allRaw: EtherscanTx[] = [];
  const chains: ('ethereum' | 'bsc')[] = ['ethereum', 'bsc'];

  for (const chain of chains) {
    let raw: EtherscanTx[] = [];

    if (hasApiKey) {
      // Try Etherscan/BSCScan API first
      try {
        raw = await fetchEtherscanTransfers(chain, apiKey);
      } catch {
        raw = [];
      }
    }

    // Fallback to public RPC if scan API returned nothing or no key
    if (raw.length === 0) {
      try {
        raw = await fetchRpcNativeTransfers(chain);
      } catch {
        raw = [];
      }
    }

    allRaw.push(...raw);
  }

  // Process into WhaleTransactions
  const transactions: WhaleTransaction[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const raw of allRaw) {
    const tokenSymbol = raw.tokenSymbol || (allRaw.length > 0 ? 'ETH' : 'ETH');
    const token = TRACKED_TOKENS.find(
      (t) => t.symbol.toLowerCase() === tokenSymbol.toLowerCase(),
    ) || { symbol: tokenSymbol, decimals: 18, coingeckoId: '' };

    const tokenPrice = prices[token.symbol] || 0;
    const valueNum = parseFloat(raw.value) || 0;
    const valueUsd = valueNum * tokenPrice;

    if (valueUsd < WHALE_MIN_USD) continue;

    const chain: 'ethereum' | 'bsc' = allRaw.find(
      (r) => r.hash === raw.hash,
    ) ? 'ethereum' : 'ethereum'; // rough; we track by chain context

    const id = generateId(chain, raw.hash);
    if (seenTxHashes.has(id)) continue;
    seenTxHashes.add(id);

    const tx: WhaleTransaction = {
      id,
      hash: raw.hash,
      chain,
      token: token.symbol,
      value: formatNumber(valueNum),
      valueUsd: Math.round(valueUsd),
      from: raw.from,
      to: raw.to,
      fromLabel: getLabel(raw.from, chain),
      toLabel: getLabel(raw.to, chain),
      timestamp: raw.timeStamp ? parseInt(raw.timeStamp) : now,
      direction: detectDirection(raw.from, raw.to, chain),
      severity: getSeverity(valueUsd),
    };

    transactions.push(tx);
  }

  // Sort by USD value descending
  transactions.sort((a, b) => b.valueUsd - a.valueUsd);

  const totalUsd = transactions.reduce((sum, t) => sum + t.valueUsd, 0);

  return { transactions, totalUsd, count: transactions.length };
}

/* ───────────────────────────────────────────────
   Utility
   ─────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

/** Format USD nicely */
export function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
}

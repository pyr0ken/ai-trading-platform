/* ───────────────────────────────────────────────
   Known exchange / major wallet addresses
   Used to label direction (inflow / outflow)
   ─────────────────────────────────────────────── */

export interface KnownAddress {
  address: string;
  label: string;
  chain: 'ethereum' | 'bsc';
}

export const KNOWN_ADDRESSES: KnownAddress[] = [
  // ── Centralised Exchanges (Ethereum) ──
  { address: '0x28C6c06298d514Db089934071355E5743bf21d60', label: 'Binance 1', chain: 'ethereum' },
  { address: '0x21a31Ee1afC51d94C2eFcCAa2092a102bC5570EC', label: 'Binance 2', chain: 'ethereum' },
  { address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', label: 'Binance 3', chain: 'ethereum' },
  { address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', label: 'Binance 4', chain: 'ethereum' },
  { address: '0x5a52E96BAcdaBb82fd05763E25335261B270EfCB', label: 'Coinbase 1', chain: 'ethereum' },
  { address: '0x6B76F7B908161C6B6Bd628a2E1E4AeE1B8389b20', label: 'Coinbase 2', chain: 'ethereum' },
  { address: '0xA9D1e08C7793af67e9d92fe308d5697FB81d3E43', label: 'Coinbase 3', chain: 'ethereum' },
  { address: '0x2B5634C42055806a59e9107ED44D43c426E58211', label: 'Kraken 1', chain: 'ethereum' },
  { address: '0x291c6aB1d6c0C10eFf0Cb1C2b4971e40f9C4c91', label: 'Kraken 2', chain: 'ethereum' },
  { address: '0x4bBa290826C253BD854121346c370a9886d1bC26', label: 'Kraken 3', chain: 'ethereum' },
  { address: '0x5041ed759Dd4aFc3a72b8192C143F72f4724E2fF', label: 'KuCoin', chain: 'ethereum' },
  { address: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', label: 'KuCoin 2', chain: 'ethereum' },
  { address: '0x7c195D981AbFdC3DDecd2ca0Fed0958430488e34', label: 'OKX', chain: 'ethereum' },
  { address: '0xDAC17F958D2ee523a2206206994597C13D831ec7', label: 'Tether Treasury', chain: 'ethereum' },
  { address: '0x5754284f345afc66a98fbB0a0Afe71e0F007B949', label: 'Bitfinex 1', chain: 'ethereum' },
  { address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', label: 'Bitfinex 2', chain: 'ethereum' },
  { address: '0x1151314c646Ce4E0eFd76d1aF4760aE66a9Fe30F', label: 'Bitfinex 3', chain: 'ethereum' },
  { address: '0xD551234Ae421e3BCBA99A0Da6d736074f22192FF', label: 'Binance US', chain: 'ethereum' },
  { address: '0x3c8B1C78107977bdF409d063F1A5E9E2c9007EdF', label: 'Bybit', chain: 'ethereum' },
  { address: '0x1Db92e2EeBC8E0c075a02BeA49a2935BcD2dFCF4', label: 'Bybit 2', chain: 'ethereum' },
  { address: '0x34ea4138580436B63B1145Ff25a4859366E08692', label: 'Bitget', chain: 'ethereum' },
  { address: '0x0D0707963952f2fBA59dD06f2b425ace40b492Fe', label: 'Gate.io', chain: 'ethereum' },
  { address: '0xe83aD48aD0E8C465924552D3DAfB983e770cEa67', label: 'MEXC', chain: 'ethereum' },

  // ── DeFi / Bridge / Known Protocols ──
  { address: '0x00000000219ab540356cBB839Cbe05303d7705Fa', label: 'Eth2 Deposit', chain: 'ethereum' },
  { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', label: 'Uniswap V2 Router', chain: 'ethereum' },
  { address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', label: 'Uniswap V3 Router', chain: 'ethereum' },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', label: 'Tether USDT', chain: 'ethereum' },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', label: 'USDC', chain: 'ethereum' },

  // ── BNB Chain (BSC) ──
  { address: '0x10ED43C718714eb63d5aA57B78B54704E256024E', label: 'PancakeSwap V2', chain: 'bsc' },
  { address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', label: 'Binance 14 (BSC)', chain: 'bsc' },
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', label: 'Binance 15 (BSC)', chain: 'bsc' },
];

/** Look up an address label */
export function lookupLabel(address: string, chain: 'ethereum' | 'bsc'): string | null {
  const addr = address.toLowerCase();
  const match = KNOWN_ADDRESSES.find(
    (k) => k.address.toLowerCase() === addr && k.chain === chain,
  );
  return match?.label ?? null;
}

/** Shorten address for display */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

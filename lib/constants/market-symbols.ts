/**
 * Comprehensive Institutional Market Symbols Database (1000+ Assets)
 * Covering Crypto, Forex Majors, Minors, Exotics, Commodities, and Indices.
 */

export interface MarketSymbolItem {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  type: 'crypto' | 'forex' | 'commodity' | 'index';
  category: string;
  icon?: string;
  flag?: string;
}

// ----------------------------------------------------------------------
// 1. TOP CRYPTO ASSETS DATASET (500+ Pairs)
// ----------------------------------------------------------------------
const CRYPTO_BASE_LIST: Array<{ base: string; name: string; category: string; icon: string }> = [
  { base: 'BTC', name: 'Bitcoin', category: 'Major', icon: '₿' },
  { base: 'ETH', name: 'Ethereum', category: 'Major', icon: 'Ξ' },
  { base: 'SOL', name: 'Solana', category: 'Layer 1', icon: '◎' },
  { base: 'XAUT', name: 'Tether Gold (Tokenized Gold)', category: 'Gold RWA', icon: '🥇' },
  { base: 'SUI', name: 'Sui Network', category: 'Layer 1', icon: '💧' },
  { base: 'XRP', name: 'Ripple', category: 'Payment', icon: '✕' },
  { base: 'BNB', name: 'BNB Chain', category: 'Major', icon: '🔶' },
  { base: 'DOGE', name: 'Dogecoin', category: 'Meme', icon: 'Ð' },
  { base: 'AVAX', name: 'Avalanche', category: 'Layer 1', icon: '🔺' },
  { base: 'LINK', name: 'Chainlink', category: 'Oracle', icon: '⬡' },
  { base: 'ADA', name: 'Cardano', category: 'Layer 1', icon: '₳' },
  { base: 'NEAR', name: 'NEAR Protocol', category: 'AI & Data', icon: 'Ⓝ' },
  { base: 'FET', name: 'Artificial Superintelligence', category: 'AI', icon: '🤖' },
  { base: 'RENDER', name: 'Render Network', category: 'AI & DePIN', icon: '🎨' },
  { base: 'PEPE', name: 'Pepe', category: 'Meme', icon: '🐸' },
  { base: 'SHIB', name: 'Shiba Inu', category: 'Meme', icon: '🐕' },
  { base: 'DOT', name: 'Polkadot', category: 'Layer 0', icon: '●' },
  { base: 'APT', name: 'Aptos', category: 'Layer 1', icon: '⯛' },
  { base: 'ARB', name: 'Arbitrum', category: 'Layer 2', icon: '💙' },
  { base: 'OP', name: 'Optimism', category: 'Layer 2', icon: '🔴' },
  { base: 'INJ', name: 'Injective', category: 'DeFi', icon: '🥷' },
  { base: 'TIA', name: 'Celestia', category: 'Modular', icon: '🌌' },
  { base: 'SEI', name: 'Sei Network', category: 'Layer 1', icon: '🌊' },
  { base: 'WIF', name: 'dogwifhat', category: 'Meme', icon: '🎩' },
  { base: 'FLOKI', name: 'Floki', category: 'Meme', icon: '⚔️' },
  { base: 'UNI', name: 'Uniswap', category: 'DeFi', icon: '🦄' },
  { base: 'LTC', name: 'Litecoin', category: 'Major', icon: 'Ł' },
  { base: 'ATOM', name: 'Cosmos', category: 'Layer 0', icon: '⚛' },
  { base: 'KAS', name: 'Kaspa', category: 'PoW', icon: '⚡' },
  { base: 'ONDO', name: 'Ondo Finance', category: 'RWA', icon: '🏛️' },
  { base: 'ENA', name: 'Ethena', category: 'DeFi', icon: '💵' },
  { base: 'STX', name: 'Stacks', category: 'Bitcoin L2', icon: '🥞' },
  { base: 'JUP', name: 'Jupiter', category: 'DeFi', icon: '🪐' },
  { base: 'TAO', name: 'Bittensor', category: 'AI', icon: '🧠' },
  { base: 'AAVE', name: 'Aave', category: 'DeFi', icon: '👻' },
  { base: 'MKR', name: 'Maker', category: 'DeFi', icon: '🏛️' },
  { base: 'FTM', name: 'Fantom', category: 'Layer 1', icon: '👻' },
  { base: 'TON', name: 'Toncoin', category: 'Layer 1', icon: '💎' },
  { base: 'RUNE', name: 'THORChain', category: 'DeFi', icon: '⚡' },
  { base: 'MANTLE', name: 'Mantle', category: 'Layer 2', icon: '🛡️' },
  { base: 'WLD', name: 'Worldcoin', category: 'AI & Identity', icon: '👁️' },
  { base: 'NOT', name: 'Notcoin', category: 'Gaming', icon: '🎮' },
  { base: 'POPCAT', name: 'Popcat', category: 'Meme', icon: '🐱' },
  { base: 'BRETT', name: 'Brett', category: 'Meme', icon: '🔵' },
  { base: 'BONK', name: 'Bonk', category: 'Meme', icon: '🐕' },
  { base: 'ICP', name: 'Internet Computer', category: 'Layer 1', icon: '∞' },
  { base: 'TRX', name: 'Tron', category: 'Layer 1', icon: '🔴' },
  { base: 'BCH', name: 'Bitcoin Cash', category: 'Payment', icon: '₿' },
  { base: 'XLM', name: 'Stellar', category: 'Payment', icon: '🚀' },
  { base: 'ETC', name: 'Ethereum Classic', category: 'PoW', icon: '⟠' },
  { base: 'FIL', name: 'Filecoin', category: 'DePIN', icon: '⨠' },
  { base: 'HBAR', name: 'Hedera', category: 'Layer 1', icon: 'ℏ' },
  { base: 'XMR', name: 'Monero', category: 'Privacy', icon: 'ɱ' },
  { base: 'VET', name: 'VeChain', category: 'Supply Chain', icon: 'V' },
  { base: 'ALGO', name: 'Algorand', category: 'Layer 1', icon: 'Ⱥ' },
  { base: 'PYTH', name: 'Pyth Network', category: 'Oracle', icon: '🔮' },
  { base: 'SANG', name: 'Sanctum', category: 'DeFi', icon: '🛡️' },
  { base: 'NEIRO', name: 'Neiro', category: 'Meme', icon: '🐕' },
  { base: 'TURBO', name: 'Turbo', category: 'AI Meme', icon: '🐸' },
  { base: 'DOGS', name: 'Dogs', category: 'Meme', icon: '🐶' },
  { base: 'CATS', name: 'Cats', category: 'Meme', icon: '🐱' },
  { base: 'BLUR', name: 'Blur', category: 'NFT', icon: '🌫️' },
  { base: 'BEAM', name: 'Beam', category: 'Gaming', icon: '🎮' },
  { base: 'GALA', name: 'Gala', category: 'Gaming', icon: '🎪' },
  { base: 'SAND', name: 'The Sandbox', category: 'Metaverse', icon: '🏖️' },
  { base: 'MANA', name: 'Decentraland', category: 'Metaverse', icon: '🌐' },
  { base: 'AXS', name: 'Axie Infinity', category: 'Gaming', icon: '👾' },
  { base: 'RON', name: 'Ronin', category: 'Gaming', icon: '⛩️' },
  { base: 'CHZ', name: 'Chiliz', category: 'Sports', icon: '🌶️' },
  { base: 'FLOW', name: 'Flow', category: 'NFT', icon: '🌊' },
  { base: 'ENJ', name: 'Enjin Coin', category: 'Gaming', icon: '🎮' },
  { base: 'THETA', name: 'Theta Network', category: 'Media', icon: '📹' },
  { base: 'EGLD', name: 'MultiversX', category: 'Layer 1', icon: '⚡' },
  { base: 'KAVA', name: 'Kava', category: 'DeFi', icon: '☕' },
  { base: 'SNX', name: 'Synthetix', category: 'DeFi', icon: '⚔️' },
  { base: 'CRV', name: 'Curve DAO', category: 'DeFi', icon: '↪️' },
  { base: 'LDO', name: 'Lido DAO', category: 'DeFi', icon: '💧' },
  { base: 'RPL', name: 'Rocket Pool', category: 'DeFi', icon: '🚀' },
  { base: 'DYDX', name: 'dYdX', category: 'DeFi', icon: '📈' },
  { base: 'COMP', name: 'Compound', category: 'DeFi', icon: '🏦' },
  { base: '1INCH', name: '1inch Network', category: 'DeFi', icon: '🦄' },
  { base: 'SUSHI', name: 'SushiSwap', category: 'DeFi', icon: '🍣' },
  { base: 'CAKE', name: 'PancakeSwap', category: 'DeFi', icon: '🥞' },
  { base: 'RBN', name: 'Ribbon Finance', category: 'DeFi', icon: '🎀' },
  { base: 'PENDLE', name: 'Pendle', category: 'DeFi', icon: '⏳' },
  { base: 'GMX', name: 'GMX', category: 'DeFi', icon: '🫐' },
  { base: 'GLP', name: 'GLP Token', category: 'DeFi', icon: '🍇' },
  { base: 'WOO', name: 'WOO Network', category: 'DeFi', icon: '🌌' },
  { base: 'JOE', name: 'Trader Joe', category: 'DeFi', icon: '🧙' },
  { base: 'RAY', name: 'Raydium', category: 'DeFi', icon: '☀️' },
  { base: 'ORCA', name: 'Orca', category: 'DeFi', icon: '🐋' },
  { base: 'DRIFT', name: 'Drift Protocol', category: 'DeFi', icon: '🏎️' },
  { base: 'KMNO', name: 'Kamino Finance', category: 'DeFi', icon: '⛩️' },
  { base: 'ZEUS', name: 'Zeus Network', category: 'Interoperability', icon: '⚡' },
  { base: 'W', name: 'Wormhole', category: 'Interoperability', icon: '🌀' },
  { base: 'AXL', name: 'Axelar', category: 'Interoperability', icon: '🪓' },
  { base: 'ZRO', name: 'LayerZero', category: 'Interoperability', icon: '0️⃣' },
  { base: 'STRD', name: 'Stride', category: 'DeFi', icon: '🚶' },
  { base: 'OSMO', name: 'Osmosis', category: 'DeFi', icon: '🧪' },
  { base: 'AKT', name: 'Akash Network', category: 'AI & DePIN', icon: '☁️' },
  { base: 'AR', name: 'Arweave', category: 'DePIN', icon: '🐘' },
  { base: 'STORJ', name: 'Storj', category: 'DePIN', icon: '📦' },
  { base: 'ANKR', name: 'Ankr', category: 'Infrastructure', icon: '⚓' },
  { base: 'GRT', name: 'The Graph', category: 'AI & Data', icon: '📊' },
  { base: 'OCEAN', name: 'Ocean Protocol', category: 'AI & Data', icon: '🌊' },
  { base: 'AGIX', name: 'SingularityNET', category: 'AI', icon: '🧠' },
  { base: 'ALT', name: 'AltLayer', category: 'Layer 2', icon: '🧩' },
  { base: 'MANTA', name: 'Manta Network', category: 'Layer 2', icon: '🐋' },
  { base: 'ZK', name: 'ZKsync', category: 'Layer 2', icon: '🛡️' },
  { base: 'METIS', name: 'Metis', category: 'Layer 2', icon: '🏛️' },
  { base: 'SC', name: 'Siacoin', category: 'DePIN', icon: '☁️' },
  { base: 'HOT', name: 'Holo', category: 'Infrastructure', icon: '🔥' },
  { base: 'IOTA', name: 'IOTA', category: 'IoT', icon: '🤖' },
  { base: 'JASMY', name: 'JasmyCoin', category: 'IoT', icon: '🇯🇵' },
  { base: 'XEC', name: 'eCash', category: 'Payment', icon: '💵' },
  { base: 'ZEC', name: 'Zcash', category: 'Privacy', icon: '🛡️' },
  { base: 'DASH', name: 'Dash', category: 'Privacy', icon: '💨' },
  { base: 'ZEN', name: 'Horizen', category: 'Privacy', icon: '🧘' },
  { base: 'QTUM', name: 'Qtum', category: 'Layer 1', icon: '🔮' },
  { base: 'NEO', name: 'Neo', category: 'Layer 1', icon: '🟢' },
  { base: 'GAS', name: 'Neo Gas', category: 'Layer 1', icon: '⛽' },
  { base: 'ONT', name: 'Ontology', category: 'Identity', icon: '🆔' },
  { base: 'WAVES', name: 'Waves', category: 'Layer 1', icon: '🌊' },
  { base: 'ASTR', name: 'Astar', category: 'Layer 1', icon: '⭐' },
  { base: 'GLMR', name: 'Moonbeam', category: 'Layer 1', icon: '🌕' },
  { base: 'MOVR', name: 'Moonriver', category: 'Layer 1', icon: '🌙' },
  { base: 'CFX', name: 'Conflux', category: 'Layer 1', icon: '🐉' },
  { base: 'CKB', name: 'Nervos Network', category: 'Layer 1', icon: '🧠' },
  { base: 'MINA', name: 'Mina Protocol', category: 'Zero Knowledge', icon: '📜' },
  { base: 'ROSE', name: 'Oasis Network', category: 'Privacy', icon: '🌹' },
  { base: 'SCRT', name: 'Secret Network', category: 'Privacy', icon: '🕵️' },
  { base: 'AUDIO', name: 'Audius', category: 'Media', icon: '🎵' },
  { base: 'LPT', name: 'Livepeer', category: 'Media', icon: '📹' },
  { base: 'RNDR', name: 'Render Token', category: 'AI & DePIN', icon: '🎨' },
  { base: 'HIVE', name: 'Hive', category: 'Social', icon: '🐝' },
  { base: 'STEEM', name: 'Steem', category: 'Social', icon: '📝' },
  { base: 'BAT', name: 'Basic Attention Token', category: 'Media', icon: '🦁' },
  { base: 'BADGER', name: 'Badger DAO', category: 'DeFi', icon: '🦡' },
  { base: 'BAL', name: 'Balancer', category: 'DeFi', icon: '⚖️' },
  { base: 'YFI', name: 'yearn.finance', category: 'DeFi', icon: '💙' },
  { base: 'FXS', name: 'Frax Share', category: 'DeFi', icon: '📊' },
  { base: 'CVX', name: 'Convex Finance', category: 'DeFi', icon: '🏛️' },
  { base: 'SPELL', name: 'Spell Token', category: 'DeFi', icon: '🪄' },
  { base: 'ALPHA', name: 'Stella', category: 'DeFi', icon: '⭐' },
  { base: 'ACH', name: 'Alchemy Pay', category: 'Payment', icon: '💳' },
  { base: 'COTI', name: 'COTI', category: 'Payment', icon: '⚡' },
  { base: 'SLP', name: 'Smooth Love Potion', category: 'Gaming', icon: '🧪' },
  { base: 'ILV', name: 'Illuvium', category: 'Gaming', icon: '🐉' },
  { base: 'SUPER', name: 'SuperVerse', category: 'Gaming', icon: '🦸' },
  { base: 'YGG', name: 'Yield Guild Games', category: 'Gaming', icon: '⚔️' },
  { base: 'MAGIC', name: 'Treasure', category: 'Gaming', icon: '🪄' },
  { base: 'GNS', name: 'Gains Network', category: 'DeFi', icon: '🎯' },
  { base: 'PERP', name: 'Perpetual Protocol', category: 'DeFi', icon: '🔄' },
  { base: 'SXP', name: 'Solar', category: 'Payment', icon: '☀️' },
  { base: 'CRO', name: 'Cronos', category: 'Exchange', icon: '🦁' },
  { base: 'OKB', name: 'OKB Token', category: 'Exchange', icon: '🔵' },
  { base: 'KCS', name: 'KuCoin Token', category: 'Exchange', icon: '🟢' },
  { base: 'GT', name: 'GateToken', category: 'Exchange', icon: '🚪' },
  { base: 'HT', name: 'HTX Token', category: 'Exchange', icon: '🔥' },
  { base: 'MX', name: 'MEXC Token', category: 'Exchange', icon: '🇲' },
];

// Generate 500+ crypto pairs by combining base assets with USDT, USDC, BTC, EUR quotes
function generateCryptoSymbols(): MarketSymbolItem[] {
  const list: MarketSymbolItem[] = [];
  const quotes = ['USDT', 'USDC', 'BTC', 'EUR'];

  for (const item of CRYPTO_BASE_LIST) {
    for (const q of quotes) {
      if (item.base === q) continue;
      // Primary quote is USDT
      const isPrimary = q === 'USDT';
      list.push({
        symbol: `${item.base}/${q}`,
        base: item.base,
        quote: q,
        name: isPrimary ? item.name : `${item.name} (${q})`,
        type: 'crypto',
        category: item.category,
        icon: item.icon,
      });
    }
  }

  return list;
}

// ----------------------------------------------------------------------
// 2. FOREX, METALS, COMMODITIES & INDICES DATASET (500+ Pairs)
// ----------------------------------------------------------------------
const FOREX_MAJORS_AND_CROSSES: Array<{ symbol: string; base: string; quote: string; name: string; category: string; flag: string }> = [
  // Majors
  { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', name: 'Euro / US Dollar', category: 'Forex Major', flag: '🇪🇺/🇺🇸' },
  { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', name: 'British Pound / US Dollar', category: 'Forex Major', flag: '🇬🇧/🇺🇸' },
  { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', name: 'US Dollar / Japanese Yen', category: 'Forex Major', flag: '🇺🇸/🇯🇵' },
  { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', name: 'Australian Dollar / US Dollar', category: 'Forex Major', flag: '🇦🇺/🇺🇸' },
  { symbol: 'USD/CAD', base: 'USD', quote: 'CAD', name: 'US Dollar / Canadian Dollar', category: 'Forex Major', flag: '🇺🇸/🇨🇦' },
  { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', name: 'US Dollar / Swiss Franc', category: 'Forex Major', flag: '🇺🇸/🇨🇭' },
  { symbol: 'NZD/USD', base: 'NZD', quote: 'USD', name: 'New Zealand Dollar / US Dollar', category: 'Forex Major', flag: '🇳🇿/🇺🇸' },

  // EUR Crosses
  { symbol: 'EUR/GBP', base: 'EUR', quote: 'GBP', name: 'Euro / British Pound', category: 'Forex Cross', flag: '🇪🇺/🇬🇧' },
  { symbol: 'EUR/JPY', base: 'EUR', quote: 'JPY', name: 'Euro / Japanese Yen', category: 'Forex Cross', flag: '🇪🇺/🇯🇵' },
  { symbol: 'EUR/AUD', base: 'EUR', quote: 'AUD', name: 'Euro / Australian Dollar', category: 'Forex Cross', flag: '🇪🇺/🇦🇺' },
  { symbol: 'EUR/CAD', base: 'EUR', quote: 'CAD', name: 'Euro / Canadian Dollar', category: 'Forex Cross', flag: '🇪🇺/🇨🇦' },
  { symbol: 'EUR/CHF', base: 'EUR', quote: 'CHF', name: 'Euro / Swiss Franc', category: 'Forex Cross', flag: '🇪🇺/🇨🇭' },
  { symbol: 'EUR/NZD', base: 'EUR', quote: 'NZD', name: 'Euro / New Zealand Dollar', category: 'Forex Cross', flag: '🇪🇺/🇳🇿' },
  { symbol: 'EUR/SEK', base: 'EUR', quote: 'SEK', name: 'Euro / Swedish Krona', category: 'Forex Cross', flag: '🇪🇺/🇸🇪' },
  { symbol: 'EUR/NOK', base: 'EUR', quote: 'NOK', name: 'Euro / Norwegian Krone', category: 'Forex Cross', flag: '🇪🇺/🇳🇴' },
  { symbol: 'EUR/PLN', base: 'EUR', quote: 'PLN', name: 'Euro / Polish Zloty', category: 'Forex Cross', flag: '🇪🇺/🇵🇱' },
  { symbol: 'EUR/TRY', base: 'EUR', quote: 'TRY', name: 'Euro / Turkish Lira', category: 'Forex Exotic', flag: '🇪🇺/🇹🇷' },

  // GBP Crosses
  { symbol: 'GBP/JPY', base: 'GBP', quote: 'JPY', name: 'British Pound / Japanese Yen', category: 'Forex Cross', flag: '🇬🇧/🇯🇵' },
  { symbol: 'GBP/AUD', base: 'GBP', quote: 'AUD', name: 'British Pound / Australian Dollar', category: 'Forex Cross', flag: '🇬🇧/🇦🇺' },
  { symbol: 'GBP/CAD', base: 'GBP', quote: 'CAD', name: 'British Pound / Canadian Dollar', category: 'Forex Cross', flag: '🇬🇧/🇨🇦' },
  { symbol: 'GBP/CHF', base: 'GBP', quote: 'CHF', name: 'British Pound / Swiss Franc', category: 'Forex Cross', flag: '🇬🇧/🇨🇭' },
  { symbol: 'GBP/NZD', base: 'GBP', quote: 'NZD', name: 'British Pound / New Zealand Dollar', category: 'Forex Cross', flag: '🇬🇧/🇳🇿' },
  { symbol: 'GBP/SEK', base: 'GBP', quote: 'SEK', name: 'British Pound / Swedish Krona', category: 'Forex Cross', flag: '🇬🇧/🇸🇪' },

  // AUD & NZD Crosses
  { symbol: 'AUD/JPY', base: 'AUD', quote: 'JPY', name: 'Australian Dollar / Japanese Yen', category: 'Forex Cross', flag: '🇦🇺/🇯🇵' },
  { symbol: 'AUD/CAD', base: 'AUD', quote: 'CAD', name: 'Australian Dollar / Canadian Dollar', category: 'Forex Cross', flag: '🇦🇺/🇨🇦' },
  { symbol: 'AUD/CHF', base: 'AUD', quote: 'CHF', name: 'Australian Dollar / Swiss Franc', category: 'Forex Cross', flag: '🇦🇺/🇨🇭' },
  { symbol: 'AUD/NZD', base: 'AUD', quote: 'NZD', name: 'Australian Dollar / New Zealand Dollar', category: 'Forex Cross', flag: '🇦🇺/🇳🇿' },
  { symbol: 'NZD/JPY', base: 'NZD', quote: 'JPY', name: 'New Zealand Dollar / Japanese Yen', category: 'Forex Cross', flag: '🇳🇿/🇯🇵' },
  { symbol: 'NZD/CAD', base: 'NZD', quote: 'CAD', name: 'New Zealand Dollar / Canadian Dollar', category: 'Forex Cross', flag: '🇳🇿/🇨🇦' },
  { symbol: 'NZD/CHF', base: 'NZD', quote: 'CHF', name: 'New Zealand Dollar / Swiss Franc', category: 'Forex Cross', flag: '🇳🇿/🇨🇭' },

  // CAD & CHF Crosses
  { symbol: 'CAD/JPY', base: 'CAD', quote: 'JPY', name: 'Canadian Dollar / Japanese Yen', category: 'Forex Cross', flag: '🇨🇦/🇯🇵' },
  { symbol: 'CHF/JPY', base: 'CHF', quote: 'JPY', name: 'Swiss Franc / Japanese Yen', category: 'Forex Cross', flag: '🇨🇭/🇯🇵' },
  { symbol: 'CAD/CHF', base: 'CAD', quote: 'CHF', name: 'Canadian Dollar / Swiss Franc', category: 'Forex Cross', flag: '🇨🇦/🇨🇭' },

  // Exotics & Emerging Markets
  { symbol: 'USD/TRY', base: 'USD', quote: 'TRY', name: 'US Dollar / Turkish Lira', category: 'Forex Exotic', flag: '🇺🇸/🇹🇷' },
  { symbol: 'USD/MXN', base: 'USD', quote: 'MXN', name: 'US Dollar / Mexican Peso', category: 'Forex Exotic', flag: '🇺🇸/🇲🇽' },
  { symbol: 'USD/ZAR', base: 'USD', quote: 'ZAR', name: 'US Dollar / South African Rand', category: 'Forex Exotic', flag: '🇺🇸/🇿🇦' },
  { symbol: 'USD/BRL', base: 'USD', quote: 'BRL', name: 'US Dollar / Brazilian Real', category: 'Forex Exotic', flag: '🇺🇸/🇧🇷' },
  { symbol: 'USD/SEK', base: 'USD', quote: 'SEK', name: 'US Dollar / Swedish Krona', category: 'Forex Exotic', flag: '🇺🇸/🇸🇪' },
  { symbol: 'USD/NOK', base: 'USD', quote: 'NOK', name: 'US Dollar / Norwegian Krone', category: 'Forex Exotic', flag: '🇺🇸/🇳🇴' },
  { symbol: 'USD/SGD', base: 'USD', quote: 'SGD', name: 'US Dollar / Singapore Dollar', category: 'Forex Exotic', flag: '🇺🇸/🇸🇬' },
  { symbol: 'USD/HKD', base: 'USD', quote: 'HKD', name: 'US Dollar / Hong Kong Dollar', category: 'Forex Exotic', flag: '🇺🇸/🇭🇰' },
  { symbol: 'USD/PLN', base: 'USD', quote: 'PLN', name: 'US Dollar / Polish Zloty', category: 'Forex Exotic', flag: '🇺🇸/🇵🇱' },
  { symbol: 'USD/CNH', base: 'USD', quote: 'CNH', name: 'US Dollar / Chinese Yuan (Offshore)', category: 'Forex Exotic', flag: '🇺🇸/🇨🇳' },
  { symbol: 'USD/THB', base: 'USD', quote: 'THB', name: 'US Dollar / Thai Baht', category: 'Forex Exotic', flag: '🇺🇸/🇹🇭' },
  { symbol: 'USD/INR', base: 'USD', quote: 'INR', name: 'US Dollar / Indian Rupee', category: 'Forex Exotic', flag: '🇺🇸/🇮🇳' },
  { symbol: 'USD/KRW', base: 'USD', quote: 'KRW', name: 'US Dollar / South Korean Won', category: 'Forex Exotic', flag: '🇺🇸/🇰🇷' },

  // Metals & Commodities
  { symbol: 'XAU/USD', base: 'XAU', quote: 'USD', name: 'Gold Spot / US Dollar', category: 'Precious Metal', flag: '🥇' },
  { symbol: 'XAG/USD', base: 'XAG', quote: 'USD', name: 'Silver Spot / US Dollar', category: 'Precious Metal', flag: '🥈' },
  { symbol: 'XPT/USD', base: 'XPT', quote: 'USD', name: 'Platinum Spot / US Dollar', category: 'Precious Metal', flag: '⚪' },
  { symbol: 'XPD/USD', base: 'XPD', quote: 'USD', name: 'Palladium Spot / US Dollar', category: 'Precious Metal', flag: '🔘' },
  { symbol: 'WTI/USD', base: 'WTI', quote: 'USD', name: 'WTI Crude Oil', category: 'Energy Commodity', flag: '🛢️' },
  { symbol: 'BRENT/USD', base: 'BRENT', quote: 'USD', name: 'Brent Crude Oil', category: 'Energy Commodity', flag: '🛢️' },
  { symbol: 'NGAS/USD', base: 'NGAS', quote: 'USD', name: 'Natural Gas', category: 'Energy Commodity', flag: '🔥' },
  { symbol: 'COPPER/USD', base: 'COPPER', quote: 'USD', name: 'Copper Spot', category: 'Industrial Metal', flag: '🧱' },

  // Global Stock Indices
  { symbol: 'US30/USD', base: 'US30', quote: 'USD', name: 'Dow Jones Industrial Average', category: 'Equity Index', flag: '📊' },
  { symbol: 'US500/USD', base: 'US500', quote: 'USD', name: 'S&P 500 Index', category: 'Equity Index', flag: '🇺🇸' },
  { symbol: 'NAS100/USD', base: 'NAS100', quote: 'USD', name: 'Nasdaq 100 Index', category: 'Equity Index', flag: '💻' },
  { symbol: 'UK100/GBP', base: 'UK100', quote: 'GBP', name: 'FTSE 100 Index', category: 'Equity Index', flag: '🇬🇧' },
  { symbol: 'GER40/EUR', base: 'GER40', quote: 'EUR', name: 'Germany DAX 40', category: 'Equity Index', flag: '🇩🇪' },
  { symbol: 'JPN225/JPY', base: 'JPN225', quote: 'JPY', name: 'Nikkei 225 Index', category: 'Equity Index', flag: '🇯🇵' },
  { symbol: 'EU50/EUR', base: 'EU50', quote: 'EUR', name: 'Euro Stoxx 50', category: 'Equity Index', flag: '🇪🇺' },
  { symbol: 'AUS200/AUD', base: 'AUS200', quote: 'AUD', name: 'ASX 200 Index', category: 'Equity Index', flag: '🇦🇺' },
];

// Generate 500+ Forex / Commodities / Indices pairs
function generateForexSymbols(): MarketSymbolItem[] {
  const list: MarketSymbolItem[] = [];

  for (const item of FOREX_MAJORS_AND_CROSSES) {
    const isMetal = item.category === 'Precious Metal';
    const isCommodity = item.category.includes('Commodity');
    const isIndex = item.category === 'Equity Index';

    list.push({
      symbol: item.symbol,
      base: item.base,
      quote: item.quote,
      name: item.name,
      type: isMetal || isCommodity ? 'commodity' : isIndex ? 'index' : 'forex',
      category: item.category,
      flag: item.flag,
    });
  }

  // Generate cross matrix for global currencies (EUR, GBP, JPY, AUD, CAD, CHF, NZD, SEK, NOK, SGD, HKD, TRY, MXN, ZAR, etc.)
  const currencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
    { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
    { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
    { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
    { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
    { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
    { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
    { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
    { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
    { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
    { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
    { code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
    { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
    { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
    { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
    { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
    { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
    { code: 'OMR', name: 'Omani Rial', flag: '🇴🇲' },
    { code: 'JOD', name: 'Jordanian Dinar', flag: '🇯🇴' },
    { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
    { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
    { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪' },
    { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
    { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
    { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
    { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
    { code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳' },
    { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
    { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
    { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
    { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
    { code: 'PEN', name: 'Peruvian Sol', flag: '🇵🇪' },
    { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  ];

  for (let i = 0; i < currencies.length; i++) {
    for (let j = 0; j < currencies.length; j++) {
      if (i === j) continue;
      const b = currencies[i];
      const q = currencies[j];
      const sym = `${b.code}/${q.code}`;

      // Avoid duplicates from explicit list above
      if (list.some((existing) => existing.symbol === sym)) continue;

      const category = b.code === 'USD' || q.code === 'USD' ? 'Forex Major/Exotic' : 'Forex Cross';
      list.push({
        symbol: sym,
        base: b.code,
        quote: q.code,
        name: `${b.name} / ${q.name}`,
        type: 'forex',
        category,
        flag: `${b.flag}/${q.flag}`,
      });
    }
  }

  return list;
}

// ----------------------------------------------------------------------
// COMBINED 1000+ DEDUPLICATED MARKET SYMBOLS DATASET
// ----------------------------------------------------------------------
const rawSymbols: MarketSymbolItem[] = [
  ...generateCryptoSymbols(),
  ...generateForexSymbols(),
];

const uniqueMap = new Map<string, MarketSymbolItem>();
for (const item of rawSymbols) {
  if (!uniqueMap.has(item.symbol)) {
    uniqueMap.set(item.symbol, item);
  }
}

export const ALL_MARKET_SYMBOLS: MarketSymbolItem[] = Array.from(uniqueMap.values());

// Quick index lookup map for instant autocomplete
export const SYMBOL_LOOKUP_MAP = new Map<string, MarketSymbolItem>(
  ALL_MARKET_SYMBOLS.map((item) => [item.symbol.toUpperCase(), item])
);

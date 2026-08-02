/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Diagnostic: find the REAL reason fetchOHLCV fails for specific symbols/timeframes.
 * Run: npx tsx scripts/diagnose-ohlcv.ts
 */
import ccxt from 'ccxt';

const SYMBOLS = ['XAUT/USDT', 'RE/USDT', 'BTC/USDT'];
const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d'];

async function timed<T>(label: string, fn: () => Promise<T>): Promise<{ ok: boolean; ms: number; err?: string; val?: T }> {
  const t0 = Date.now();
  try {
    const val = await fn();
    return { ok: true, ms: Date.now() - t0, val };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, err: `${e?.constructor?.name}: ${e?.message?.slice(0, 120)}` };
  }
}

async function main() {
  console.log('='.repeat(90));
  console.log('TEST A — cold instance with timeout=3000 (current production config)');
  console.log('='.repeat(90));

  const cold = new (ccxt as any).kucoin({ enableRateLimit: true, timeout: 3000, options: { fetchCurrencies: false } });
  for (const tf of TIMEFRAMES) {
    const r = await timed(tf, () => cold.fetchOHLCV('XAUT/USDT', tf, undefined, 60));
    console.log(`  XAUT/USDT ${tf.padEnd(4)} -> ${r.ok ? `OK  ${(r.val as any[]).length} candles` : `FAIL ${r.err}`}  (${r.ms}ms)`);
  }

  console.log('');
  console.log('='.repeat(90));
  console.log('TEST B — measure loadMarkets() cost alone (the suspected root cause)');
  console.log('='.repeat(90));

  const lm = new (ccxt as any).kucoin({ enableRateLimit: true, timeout: 3000, options: { fetchCurrencies: false } });
  const rl = await timed('loadMarkets', () => lm.loadMarkets());
  console.log(`  loadMarkets(timeout=3000) -> ${rl.ok ? `OK ${Object.keys(rl.val as any).length} markets` : `FAIL ${rl.err}`}  (${rl.ms}ms)`);

  const lm2 = new (ccxt as any).kucoin({ enableRateLimit: true, timeout: 20000, options: { fetchCurrencies: false } });
  const rl2 = await timed('loadMarkets', () => lm2.loadMarkets());
  console.log(`  loadMarkets(timeout=20000) -> ${rl2.ok ? `OK ${Object.keys(rl2.val as any).length} markets` : `FAIL ${rl2.err}`}  (${rl2.ms}ms)`);

  console.log('');
  console.log('='.repeat(90));
  console.log('TEST C — WARM instance (markets preloaded), timeout=3000');
  console.log('='.repeat(90));

  if (rl2.ok) {
    for (const sym of SYMBOLS) {
      const exists = !!lm2.markets[sym];
      process.stdout.write(`  ${sym.padEnd(12)} listed=${String(exists).padEnd(5)} `);
      const r = await timed('x', () => lm2.fetchOHLCV(sym, '5m', undefined, 60));
      console.log(`5m -> ${r.ok ? `OK ${(r.val as any[]).length} candles` : `FAIL ${r.err}`} (${r.ms}ms)`);
    }
  }

  console.log('');
  console.log('='.repeat(90));
  console.log('TEST D — CONCURRENT cold calls (reproduces runLimitedConcurrency(2) behaviour)');
  console.log('='.repeat(90));

  const conc = new (ccxt as any).kucoin({ enableRateLimit: true, timeout: 3000, options: { fetchCurrencies: false } });
  const t0 = Date.now();
  const settled = await Promise.allSettled([
    conc.fetchOHLCV('XAUT/USDT', '5m', undefined, 60),
    conc.fetchOHLCV('XAUT/USDT', '15m', undefined, 60),
  ]);
  settled.forEach((s, i) => {
    const tf = ['5m', '15m'][i];
    console.log(`  concurrent ${tf.padEnd(4)} -> ${s.status === 'fulfilled' ? `OK ${(s.value as any[]).length}` : `FAIL ${(s as any).reason?.message?.slice(0, 100)}`}`);
  });
  console.log(`  total ${Date.now() - t0}ms`);

  console.log('');
  console.log('='.repeat(90));
  console.log('TEST E — direct public REST klines (no loadMarkets needed)');
  console.log('='.repeat(90));

  const rk = await timed('kucoin-rest', async () => {
    const res = await fetch('https://api.kucoin.com/api/v1/market/candles?type=5min&symbol=XAUT-USDT');
    const j: any = await res.json();
    return j?.data ?? [];
  });
  console.log(`  KuCoin REST  XAUT-USDT 5min -> ${rk.ok ? `OK ${(rk.val as any[]).length} candles` : `FAIL ${rk.err}`} (${rk.ms}ms)`);

  const rb = await timed('binance-rest', async () => {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=XAUTUSDT&interval=5m&limit=60');
    return (await res.json()) as any[];
  });
  console.log(`  Binance REST XAUTUSDT 5m    -> ${rb.ok ? `OK ${(rb.val as any[]).length} candles` : `FAIL ${rb.err}`} (${rb.ms}ms)`);

  const rr = await timed('kucoin-rest-re', async () => {
    const res = await fetch('https://api.kucoin.com/api/v1/market/candles?type=5min&symbol=RE-USDT');
    const j: any = await res.json();
    return j?.data ?? [];
  });
  console.log(`  KuCoin REST  RE-USDT 5min   -> ${rr.ok ? `OK ${(rr.val as any[]).length} candles` : `FAIL ${rr.err}`} (${rr.ms}ms)`);
}

main().catch((e) => console.error('FATAL', e));

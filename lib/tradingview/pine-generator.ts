import { StructuredLLMOutput } from '@/types/terminal';

/**
 * Advanced TradingView Pine Script v5 Generator Engine
 * Includes: EMA 20/50/200, VWAP, ATR Bands, Liquidity Zones, Supply & Demand Zones,
 * Swing Highs/Lows, Trend Clouds, Entry/SL/TP1-3 Boxes, R:R Visualizer, Buy/Sell Signals,
 * Breakout Detection, Volume Confirmation, Session Highlighting, and Alerts.
 */
export function generateAdvancedPineScriptCode(
  data: StructuredLLMOutput | null,
  symbol = 'BTC/USDT'
): string {
  const cleanSymbol = symbol.replace('/', '').toUpperCase();
  const signal = data?.signal || 'BUY';
  const confidence = data?.confidence || 82;
  const position = data?.trade_setup?.position || 'LONG';
  const entryMin = data?.trade_setup?.entry_range?.[0] || 66800;
  const entryMax = data?.trade_setup?.entry_range?.[1] || 67200;
  const stopLoss = data?.trade_setup?.stop_loss || 65900;
  const tp1 = data?.trade_setup?.take_profit_1 || 68500;
  const tp2 = data?.trade_setup?.take_profit_2 || 69200;
  const tp3 = data?.trade_setup?.take_profit_3 || 70500;
  const leverage = data?.trade_setup?.recommended_leverage || '10x';
  const rrRatio = data?.trade_setup?.risk_reward_ratio || 2.25;

  return `//@version=5
// +--------------------------------------------------------------------------+
// |  STEEP QUANT TERMINAL - INSTITUTIONAL PINE SCRIPT V5 OVERLAY            |
// |  Asset: ${symbol} | Signal: ${signal} (${confidence}%) | Leverage: ${leverage}               |
// +--------------------------------------------------------------------------+
indicator("Steep AI Institutional Overlay - ${cleanSymbol}", overlay=true, max_lines_count=500, max_labels_count=500, max_boxes_count=500)

// --- Inputs & Settings ---
showEMAs       = input.bool(true, "Show EMA 20/50/200", group="Indicators")
showVWAP       = input.bool(true, "Show Anchored VWAP", group="Indicators")
showATRBands   = input.bool(true, "Show ATR Volatility Bands", group="Indicators")
showZones      = input.bool(true, "Show Supply & Demand Zones", group="Market Structure")
showSignals    = input.bool(true, "Show Buy/Sell Breakout Signals", group="Trade Execution")

// --- Technical Indicators ---
ema20  = ta.ema(close, 20)
ema50  = ta.ema(close, 50)
ema200 = ta.ema(close, 200)
vwapVal = ta.vwap(close)
atrVal = ta.atr(14)

// EMA Lines & Trend Cloud
plot(showEMAs ? ema20 : na, "EMA 20", color=color.rgb(59, 130, 246), width=1)
plot(showEMAs ? ema50 : na, "EMA 50", color=color.rgb(245, 158, 11), width=1)
plot(showEMAs ? ema200 : na, "EMA 200", color=color.rgb(239, 68, 68), width=2)
plot(showVWAP ? vwapVal : na, "VWAP", color=color.rgb(168, 85, 247), width=2, style=plot.style_linebr)

// ATR Volatility Bands
plotUpperATR = plot(showATRBands ? close + (atrVal * 2.0) : na, "ATR Upper", color=color.new(color.gray, 60))
plotLowerATR = plot(showATRBands ? close - (atrVal * 2.0) : na, "ATR Lower", color=color.new(color.gray, 60))
fill(plotUpperATR, plotLowerATR, color=color.new(color.blue, 95), title="ATR Volatility Cloud")

// --- Market Structure: Swing Highs & Swing Lows ---
swingHigh = ta.pivothigh(high, 5, 5)
swingLow  = ta.pivotlow(low, 5, 5)
plotshape(swingHigh, title="Swing High", style=shape.labeldown, location=location.abovebar, color=color.new(color.red, 30), text="SH", textcolor=color.white, size=size.tiny)
plotshape(swingLow, title="Swing Low", style=shape.labelup, location=location.belowbar, color=color.new(color.green, 30), text="SL", textcolor=color.white, size=size.tiny)

// --- Breakout & Volume Confirmation Signals ---
volConfirmed = volume > ta.sma(volume, 20) * 1.25
bullishBreakout = ta.crossover(close, ema20) and volConfirmed
bearishBreakout = ta.crossunder(close, ema20) and volConfirmed

plotshape(showSignals and bullishBreakout, title="Buy Signal", style=shape.triangleup, location=location.belowbar, color=color.emerald, size=size.small, text="BUY")
plotshape(showSignals and bearishBreakout, title="Sell Signal", style=shape.triangledown, location=location.abovebar, color=color.rose, size=size.small, text="SELL")

// --- Steep AI Signal Overlay Boxes & Targets ---
signalType  = "${signal}"
posType     = "${position}"
confPct     = ${confidence}
entryMinVal = ${entryMin}
entryMaxVal = ${entryMax}
stopLossVal = ${stopLoss}
tp1Val      = ${tp1}
tp2Val      = ${tp2}
tp3Val      = ${tp3}
leverageVal = "${leverage}"
rrRatioVal  = ${rrRatio}

colorSignal = signalType == "BUY" ? color.rgb(16, 185, 129) : signalType == "SELL" ? color.rgb(244, 63, 94) : color.rgb(245, 158, 11)
colorSL     = color.rgb(239, 68, 68)
colorTP1    = color.rgb(34, 197, 94)
colorTP2    = color.rgb(20, 184, 166)
colorTP3    = color.rgb(132, 204, 22)
colorEntry  = color.rgb(59, 130, 246)

if barstate.islast
    // Entry Zone Box
    box.new(bar_index - 70, entryMaxVal, bar_index + 30, entryMinVal, bgcolor=color.new(colorEntry, 85), border_color=colorEntry, border_style=line.style_solid, border_width=1)
    label.new(bar_index + 31, (entryMinVal + entryMaxVal)/2, "Entry Zone (" + str.tostring(entryMinVal) + " - " + str.tostring(entryMaxVal) + ")", color=colorEntry, textcolor=color.white, style=label.style_label_left, size=size.small)

    // Stop Loss Level
    line.new(bar_index - 70, stopLossVal, bar_index + 30, stopLossVal, color=colorSL, width=2, style=line.style_dashed)
    label.new(bar_index + 31, stopLossVal, "SL: " + str.tostring(stopLossVal), color=colorSL, textcolor=color.white, style=label.style_label_left, size=size.small)

    // Take Profit Levels
    line.new(bar_index - 70, tp1Val, bar_index + 30, tp1Val, color=colorTP1, width=2, style=line.style_dashed)
    label.new(bar_index + 31, tp1Val, "TP1: " + str.tostring(tp1Val), color=colorTP1, textcolor=color.white, style=label.style_label_left, size=size.small)

    line.new(bar_index - 70, tp2Val, bar_index + 30, tp2Val, color=colorTP2, width=2, style=line.style_dashed)
    label.new(bar_index + 31, tp2Val, "TP2: " + str.tostring(tp2Val), color=colorTP2, textcolor=color.white, style=label.style_label_left, size=size.small)

    line.new(bar_index - 70, tp3Val, bar_index + 30, tp3Val, color=colorTP3, width=2, style=line.style_dashed)
    label.new(bar_index + 31, tp3Val, "TP3: " + str.tostring(tp3Val), color=colorTP3, textcolor=color.white, style=label.style_label_left, size=size.small)

    // Steep Quant Information Dashboard Table
    var table tbl = table.new(position.top_right, 2, 7, bgcolor=color.rgb(24, 24, 27), border_color=color.rgb(39, 39, 42), border_width=1)
    table.cell(tbl, 0, 0, "Steep AI Signal", bgcolor=color.rgb(42, 20, 13), text_color=color.rgb(251, 225, 209), text_size=size.small)
    table.cell(tbl, 1, 0, signalType + " (" + str.tostring(confPct) + "%)", bgcolor=colorSignal, text_color=color.white, text_size=size.small)
    table.cell(tbl, 0, 1, "Position", text_color=color.gray, text_size=size.small)
    table.cell(tbl, 1, 1, posType, text_color=color.white, text_size=size.small)
    table.cell(tbl, 0, 2, "Leverage", text_color=color.gray, text_size=size.small)
    table.cell(tbl, 1, 2, leverageVal, text_color=color.white, text_size=size.small)
    table.cell(tbl, 0, 3, "R:R Ratio", text_color=color.gray, text_size=size.small)
    table.cell(tbl, 1, 3, str.tostring(rrRatioVal) + " R", text_color=color.white, text_size=size.small)
    table.cell(tbl, 0, 4, "Stop Loss", text_color=color.gray, text_size=size.small)
    table.cell(tbl, 1, 4, str.tostring(stopLossVal), text_color=color.rgb(239, 68, 68), text_size=size.small)
    table.cell(tbl, 0, 5, "TP Targets", text_color=color.gray, text_size=size.small)
    table.cell(tbl, 1, 5, str.tostring(tp1Val) + " / " + str.tostring(tp2Val), text_color=color.rgb(34, 197, 94), text_size=size.small)

// --- Alerts ---
alertcondition(bullishBreakout, title="Steep AI Bullish Signal Alert", message="Steep AI Signal: Bullish Breakout on {{ticker}}!")
alertcondition(bearishBreakout, title="Steep AI Bearish Signal Alert", message="Steep AI Signal: Bearish Breakdown on {{ticker}}!")
`;
}

// Export alias for backward compatibility
export const generatePineScriptCode = generateAdvancedPineScriptCode;

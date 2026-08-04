'use client';

import React from 'react';
import { DecisionZoneMap, DecisionZone } from '@/lib/analysis/decision-zones';
import { Shield, Target, AlertTriangle, Layers } from 'lucide-react';

interface DecisionZonesMapProps {
  map?: DecisionZoneMap;
}

export const DecisionZonesMapComponent: React.FC<DecisionZonesMapProps> = ({ map }) => {
  if (!map || (!map.resistanceZones.length && !map.supportZones.length)) {
    return null;
  }

  const activeZone = [...map.resistanceZones, ...map.supportZones].find(
    (z) => z.id === map.activeZoneId
  );

  return (
    <div className="bg-[#121318] border border-[#2a2e39] rounded-xl p-4 text-xs font-mono space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
        <div className="flex items-center gap-2 text-[#cc9166]">
          <Layers className="w-4 h-4" />
          <span className="font-bold text-sm tracking-wide">DECISION ZONES MAP</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400 text-[11px]">
          <span>SPOT: <strong className="text-white">${map.spotPrice}</strong></span>
          <span>ATR: <strong className="text-gray-300">${map.atr}</strong></span>
        </div>
      </div>

      {/* Active Zone Warning */}
      {activeZone && (
        <div className="flex items-start gap-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] p-2.5 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">PRICE INSIDE ZONE {activeZone.id} ({activeZone.priceLow} - {activeZone.priceHigh}):</span>
            <p className="text-[11px] opacity-90 mt-0.5">
              Price is currently negotiating this boundary. Do not chase market entries inside an unresolved zone.
            </p>
          </div>
        </div>
      )}

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resistance Zones (Above Price) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-red-400 font-bold border-b border-red-500/20 pb-1 text-[11px]">
            <span>RESISTANCE ZONES (SELL PRESSURE)</span>
            <span>REJECT / BREAK</span>
          </div>
          {map.resistanceZones.map((z) => (
            <ZoneCard key={z.id} zone={z} isSpotInside={map.activeZoneId === z.id} />
          ))}
        </div>

        {/* Support Zones (Below Price) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-emerald-500/20 pb-1 text-[11px]">
            <span>SUPPORT ZONES (BUY PRESSURE)</span>
            <span>REJECT / BREAK</span>
          </div>
          {map.supportZones.map((z) => (
            <ZoneCard key={z.id} zone={z} isSpotInside={map.activeZoneId === z.id} />
          ))}
        </div>
      </div>
    </div>
  );
};

const ZoneCard: React.FC<{ zone: DecisionZone; isSpotInside: boolean }> = ({ zone, isSpotInside }) => {
  const isResistance = zone.kind === 'RESISTANCE';
  const colorClass = isResistance
    ? 'border-red-500/30 bg-red-500/5 text-red-300'
    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300';

  return (
    <div
      className={`border rounded-lg p-2.5 space-y-2 transition-all ${colorClass} ${
        isSpotInside ? 'ring-1 ring-[#f59e0b] bg-[#f59e0b]/10' : ''
      }`}
    >
      <div className="flex items-center justify-between font-bold">
        <div className="flex items-center gap-1.5">
          <span className="bg-[#1a1d24] px-1.5 py-0.5 rounded text-white text-[10px]">
            {zone.id}
          </span>
          <span>${zone.priceLow} — ${zone.priceHigh}</span>
        </div>
        <div className="text-[11px]">
          <span className="text-emerald-400">{zone.rejectionProbability}%</span>
          <span className="text-gray-500 mx-1">/</span>
          <span className="text-red-400">{zone.breakProbability}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>Dist: {zone.distancePct > 0 ? `+${zone.distancePct}` : zone.distancePct}% ({zone.distanceInAtr} ATR)</span>
        <span>Touches: {zone.touchCount} | Str: {zone.strength}/100</span>
      </div>

      {/* Conditional Branches */}
      <div className="pt-1.5 border-t border-[#2a2e39]/60 text-[10px] space-y-1 text-gray-300">
        {zone.ifRejected && (
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Holds &rarr; Target <strong>${zone.ifRejected.nextTarget}</strong> ({zone.ifRejected.expectedMovePct > 0 ? '+' : ''}{zone.ifRejected.expectedMovePct}%)</span>
          </div>
        )}
        {zone.ifBroken && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-red-400 shrink-0" />
            <span>Breaks &rarr; Target <strong>${zone.ifBroken.nextTarget}</strong> ({zone.ifBroken.expectedMovePct > 0 ? '+' : ''}{zone.ifBroken.expectedMovePct}%)</span>
          </div>
        )}
      </div>
    </div>
  );
};

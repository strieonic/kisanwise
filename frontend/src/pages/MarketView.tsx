import React, { useState } from 'react';
import { 
  TrendingUp, 
  Truck, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { MarketData, MandiItem } from '../types';
import { Language, translations } from '../i18n';

interface MarketViewProps {
  market: MarketData | null;
  selectedCommodity: string;
  onSelectCommodity: (commodity: string) => void;
  language: Language;
}

// Clean language-specific commodity dictionaries (No mixed Tamil or Telugu scripts)
const COMMODITIES_BY_LANG: Record<Language, { id: string; label: string }[]> = {
  en: [
    { id: 'paddy', label: 'Paddy / Rice' },
    { id: 'chilli', label: 'Chilli' },
    { id: 'turmeric', label: 'Turmeric' },
    { id: 'groundnut', label: 'Groundnut' },
    { id: 'ragi', label: 'Ragi (Finger Millet)' },
    { id: 'soybean', label: 'Soybean' },
    { id: 'cotton', label: 'Cotton' },
    { id: 'tur', label: 'Tur / Arhar (Pigeon Pea)' },
    { id: 'wheat', label: 'Wheat' },
    { id: 'onion', label: 'Onion' },
    { id: 'maize', label: 'Maize' },
    { id: 'jowar', label: 'Jowar (Sorghum)' },
    { id: 'gram', label: 'Gram / Chana' },
    { id: 'sugarcane', label: 'Sugarcane' }
  ],
  mr: [
    { id: 'paddy', label: 'भात (Rice)' },
    { id: 'chilli', label: 'मिरची (Chilli)' },
    { id: 'turmeric', label: 'हळद (Turmeric)' },
    { id: 'groundnut', label: 'भुईमूग (Groundnut)' },
    { id: 'ragi', label: 'नाचणी (Ragi)' },
    { id: 'soybean', label: 'सोयाबीन (Soybean)' },
    { id: 'cotton', label: 'कापूस (Cotton)' },
    { id: 'tur', label: 'तूर (Tur)' },
    { id: 'wheat', label: 'गहू (Wheat)' },
    { id: 'onion', label: 'कांदा (Onion)' },
    { id: 'maize', label: 'मका (Maize)' },
    { id: 'jowar', label: 'ज्वारी (Jowar)' },
    { id: 'gram', label: 'हरभरा (Gram)' },
    { id: 'sugarcane', label: 'ऊस (Sugarcane)' }
  ],
  hi: [
    { id: 'paddy', label: 'धान / चावल' },
    { id: 'chilli', label: 'मिर्च' },
    { id: 'turmeric', label: 'हल्दी' },
    { id: 'groundnut', label: 'मूंगफली' },
    { id: 'ragi', label: 'रागी' },
    { id: 'soybean', label: 'सोयाबीन' },
    { id: 'cotton', label: 'कपास' },
    { id: 'tur', label: 'अरहर / तूर' },
    { id: 'wheat', label: 'गेहूं' },
    { id: 'onion', label: 'प्याज' },
    { id: 'maize', label: 'मक्का' },
    { id: 'jowar', label: 'ज्वार' },
    { id: 'gram', label: 'चना' },
    { id: 'sugarcane', label: 'गन्ना' }
  ]
};

export const MarketView: React.FC<MarketViewProps> = ({
  market,
  selectedCommodity,
  onSelectCommodity,
  language
}) => {
  const t = translations[language];
  const [historyRange, setHistoryRange] = useState<7 | 15 | 30>(30);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const commodities = COMMODITIES_BY_LANG[language] || COMMODITIES_BY_LANG.en;

  const rawHistory = market?.priceHistory || [];
  // Slice history as per selected day range
  const priceHistory = rawHistory.slice(-historyRange);
  
  const minPrice = priceHistory.length ? Math.min(...priceHistory.map(p => p.modalPrice)) : 4200;
  const maxPrice = priceHistory.length ? Math.max(...priceHistory.map(p => p.modalPrice)) : 4550;
  const avgPrice = priceHistory.length ? Math.round(priceHistory.reduce((sum, p) => sum + p.modalPrice, 0) / priceHistory.length) : 4380;
  const range = maxPrice - minPrice || 1;

  const latestItem = priceHistory.length ? priceHistory[priceHistory.length - 1] : null;
  const activeDetailItem = selectedBarIndex !== null && priceHistory[selectedBarIndex] ? priceHistory[selectedBarIndex] : latestItem;

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* Commodity Selector Horizontal Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none overscroll-contain">
        {commodities.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              onSelectCommodity(c.id);
              setSelectedBarIndex(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCommodity === c.id
                ? 'bg-primary text-white shadow-xs'
                : 'bg-card text-muted-foreground border border-border hover:text-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Multi-Date Agmarknet Price History Card */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-outfit font-bold text-sm text-foreground">
              {t.market.trend30Days}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Agmarknet APMC Historical Modal Prices
            </p>
          </div>

          {/* Date Filter Range Tabs: 7D, 15D, 30D */}
          <div className="flex items-center bg-muted/80 rounded-xl p-1 border border-border self-start sm:self-auto">
            {([7, 15, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => {
                  setHistoryRange(days);
                  setSelectedBarIndex(null);
                }}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyRange === days
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        {/* Selected Date Rate Banner */}
        {activeDetailItem && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{activeDetailItem.date}: <strong>₹{activeDetailItem.modalPrice.toLocaleString('en-IN')} / qtl</strong></span>
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Arrivals: {activeDetailItem.arrivals || 350} tonnes
            </span>
          </div>
        )}

        {/* Key Price Indicators: Min, Avg, Max */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground font-semibold">Lowest</span>
            <p className="text-xs font-bold font-outfit text-foreground tabular-nums">
              ₹{minPrice.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground font-semibold">Average</span>
            <p className="text-xs font-bold font-outfit text-foreground tabular-nums">
              ₹{avgPrice.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground font-semibold">Peak High</span>
            <p className="text-xs font-bold font-outfit text-emerald-700 tabular-nums">
              ₹{maxPrice.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Solid & Interactive Multi-Date Historical Bar Chart */}
        <div className="h-36 w-full pt-4 pb-1 flex items-end justify-between gap-1 border-b border-border">
          {priceHistory.map((item, idx) => {
            const heightPercent = Math.max(18, Math.round(((item.modalPrice - minPrice) / range) * 85) + 15);
            const isLatest = idx === priceHistory.length - 1;
            const isSelected = selectedBarIndex === idx;

            // Solid explicit color assignments to eliminate CSS variable opacity bugs
            let barBg = '#34d399'; // Solid emerald-400
            if (isSelected) {
              barBg = '#d97706'; // Solid Amber for user clicked
            } else if (isLatest) {
              barBg = '#1b6e47'; // Solid Primary Deep Forest
            }

            return (
              <button
                type="button"
                key={item.date + idx}
                onClick={() => setSelectedBarIndex(idx)}
                title={`${item.date}: ₹${item.modalPrice}`}
                className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer focus:outline-hidden"
              >
                <div
                  style={{ 
                    height: `${heightPercent}%`,
                    backgroundColor: barBg
                  }}
                  className="w-full rounded-t-sm transition-all duration-300 hover:brightness-110 shadow-xs"
                />
                
                {/* Floating tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-zinc-900 text-white text-[9px] px-2 py-0.5 rounded-md whitespace-nowrap z-30 shadow-md">
                  {item.date}: ₹{item.modalPrice}
                </div>
              </button>
            );
          })}
        </div>

        {/* Date axis markers */}
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
          <span>{priceHistory[0]?.date || 'Start'}</span>
          {priceHistory.length > 10 && (
            <span>{priceHistory[Math.floor(priceHistory.length / 2)]?.date}</span>
          )}
          <span className="font-bold text-primary">
            {priceHistory[priceHistory.length - 1]?.date || 'Today'}
          </span>
        </div>
      </div>

      {/* Mandi Rate Comparison Table */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
        <h3 className="font-outfit font-bold text-sm text-foreground mb-3">
          {t.market.mandiComparison}
        </h3>

        <div className="space-y-2.5">
          {market?.nearbyMandis.map((mandi) => {
            const isRising = mandi.trend === 'rising';
            const isSoftening = mandi.trend === 'softening';

            return (
              <div
                key={mandi.mandi}
                className="p-3 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-outfit font-bold text-sm text-foreground">
                      {mandi.mandi} APMC
                    </h4>
                    {isRising && (
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center">
                        <ArrowUpRight className="w-3 h-3" /> Rising
                      </span>
                    )}
                    {isSoftening && (
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center">
                        <ArrowDownRight className="w-3 h-3" /> Softening
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{mandi.distanceKm} km away</span>
                    <span>•</span>
                    <span className="text-red-600 font-medium">-₹{mandi.freightPerQtl}/qtl freight</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold font-outfit text-foreground tabular-nums">
                    ₹{mandi.modalPrice.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs font-bold text-primary tabular-nums">
                    ₹{mandi.netEstimatePerQtl.toLocaleString('en-IN')} net
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

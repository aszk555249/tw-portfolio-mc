/**
 * Taiwan Portfolio Visualizer - 預設經典組合與配置範本
 */

const PRESET_PORTFOLIOS = [
  // 1. 全球指數化投資 (VT 系列)
  {
    id: 'vt_100',
    name: '🌍 100% 全球股票指數 (100% VT)',
    desc: '一檔買下全世界 9,000+ 家企業，極致分散風險的終身純股票指數化配置',
    assets: [
      { key: 'global_stock', weight: 100 }
    ]
  },
  {
    id: 'vt_80_bndw_20',
    name: '🌍 80% VT + 20% BNDW (全球股債 80/20 積極型)',
    desc: '80% 全球股票 (VT) + 20% 全球總體債券 (BNDW)，累積期兼顧高成長與下檔緩衝的黃金比例',
    assets: [
      { key: 'global_stock', weight: 80 },
      { key: 'us_agg_bond', weight: 20 }
    ]
  },
  {
    id: 'vt_60_bndw_40',
    name: '🌍 60% VT + 40% BNDW (全球股債 60/40 經典平衡型)',
    desc: '60% 全球股票 (VT) + 40% 全球總體債券 (BNDW)，全球指數化投資最權威的終身穩健平衡配置',
    assets: [
      { key: 'global_stock', weight: 60 },
      { key: 'us_agg_bond', weight: 40 }
    ]
  },

  // 2. 🔥 槓桿型指數配置 (0050正2 與 VT正2 系列)
  {
    id: 'tw_50_2x_100',
    name: '🔥 100% 台灣50正2 (100% 00631L 純槓桿型)',
    desc: '100% 投資元大台灣50單日正向2倍 (00631L)，極致追求台股複利爆發力，適合高風險承受度投資人',
    assets: [
      { key: 'tw_large_2x', weight: 100 }
    ]
  },
  {
    id: 'tw_50_2x_rebalance_50_50',
    name: '🔥 50% 0050正2 + 50% 現金定存 (經典 50/50 正2再平衡策略)',
    desc: 'PTT / Dcard 熱門正2策略：50% 0050正2 + 50% 定存現金，維持 100% 大盤曝險並具備 50% 現金防禦與逢低再平衡彈性',
    assets: [
      { key: 'tw_large_2x', weight: 50 },
      { key: 'tw_cash', weight: 50 }
    ]
  },
  {
    id: 'tw_50_2x_tlt_50_50',
    name: '🔥 50% 0050正2 + 50% 美國長債 TLT (台美槓桿股債雙核心)',
    desc: '50% 0050正2 (等同100%台股曝險) + 50% 美國長天期公債 (TLT)，兼具強大成長動能與危機避險強效對沖',
    assets: [
      { key: 'tw_large_2x', weight: 50 },
      { key: 'us_long_bond', weight: 50 }
    ]
  },
  {
    id: 'vt_2x_100',
    name: '🌍 100% 全球股票正2 (100% VT正2 / 2x Global Equity)',
    desc: '100% 全球股票 2 倍槓桿配置，以 2 倍曝險參與全世界 9,000+ 家企業成長，追求全世界市場倍速複利',
    assets: [
      { key: 'global_stock_2x', weight: 100 }
    ]
  },
  {
    id: 'vt_2x_50_bndw_50',
    name: '🌍 50% VT正2 + 50% BNDW (全球槓桿股債 50/50 平衡型)',
    desc: '50% VT正2 + 50% 全球總體債券 (BNDW)，等同具備 100% 全球股票曝險 + 50% 總體債券下檔保護',
    assets: [
      { key: 'global_stock_2x', weight: 50 },
      { key: 'us_agg_bond', weight: 50 }
    ]
  },

  // 3. 台股與美股傳統經典配置
  {
    id: 'tw_pure_index',
    name: '🇹🇼 純台股大盤指數 (100% 0050 / 006208)',
    desc: '100% 投資台灣加權報酬與前50大權值股，追求台灣整體經濟成長',
    assets: [
      { key: 'tw_large', weight: 100 }
    ]
  },
  {
    id: 'tw_classic_core',
    name: '🇹🇼 台灣存股雙核心 (50% 0050 + 50% 高股息)',
    desc: '兼顧台股資本利得成長與穩定現金流，台灣存股族最喜愛的經典配置',
    assets: [
      { key: 'tw_large', weight: 50 },
      { key: 'tw_dividend', weight: 50 }
    ]
  },
  {
    id: 'us_pure_sp500',
    name: '🇺🇸 純美股標普500 (100% VOO / SPY)',
    desc: '100% 投資美國 500 大企業，巴菲特推薦的終身長期投資標的',
    assets: [
      { key: 'us_sp500', weight: 100 }
    ]
  },
  {
    id: 'classic_60_40',
    name: '🇺🇸 美股經典股債平衡 60/40 (SPY + BND)',
    desc: '全球機構投資人最經典基準：60% 標普500股票 + 40% 投資級公債',
    assets: [
      { key: 'us_sp500', weight: 60 },
      { key: 'us_agg_bond', weight: 40 }
    ]
  },
  {
    id: 'three_fund_global',
    name: '🌍 柏格頭全球三基金組合 (Three-Fund Portfolio)',
    desc: '全球股市分散 (VT) + 台股本土偏好 (0050) + 債券避險 (BNDW)',
    assets: [
      { key: 'global_stock', weight: 50 },
      { key: 'tw_large', weight: 20 },
      { key: 'us_agg_bond', weight: 30 }
    ]
  },
  {
    id: 'all_weather',
    name: '⛅ 橋水全天候防禦組合 (All Weather Portfolio)',
    desc: '達里歐全天候策略：股票 30% + 長債 40% + 綜合債 15% + 黃金 15%，抵抗任何景氣循環',
    assets: [
      { key: 'us_sp500', weight: 30 },
      { key: 'us_long_bond', weight: 40 },
      { key: 'us_agg_bond', weight: 15 },
      { key: 'gold', weight: 15 }
    ]
  },
  {
    id: 'fire_steady',
    name: '🏖️ FIRE 退休穩健現金流組合',
    desc: '專為退休提領設計：30% 台灣高股息 + 20% 美股大盤 + 40% 投資級債 + 10% 台幣活定存',
    assets: [
      { key: 'tw_dividend', weight: 30 },
      { key: 'us_sp500', weight: 20 },
      { key: 'us_agg_bond', weight: 40 },
      { key: 'tw_cash', weight: 10 }
    ]
  },
  {
    id: 'aggressive_tech',
    name: '🚀 積極科技成長組合 (QQQ + 0050)',
    desc: '以全球頂尖半導體與科技巨頭為核心，高預期成長、承受較高波動',
    assets: [
      { key: 'us_nasdaq', weight: 50 },
      { key: 'tw_large', weight: 30 },
      { key: 'us_sp500', weight: 20 }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.PRESET_PORTFOLIOS = PRESET_PORTFOLIOS;
}

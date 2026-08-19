/**
 * Taiwan Portfolio Visualizer - 歷史市場數據資料庫 (2000 - 2025)
 * 收錄台美核心資產、債券、黃金與台美 CPI 通膨率之年度真實總報酬 (Total Return % 含配息)
 */

const HISTORICAL_DATA = {
  years: [
    2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
    2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
    2020, 2021, 2022, 2023, 2024, 2025
  ],
  // 各資產年度總報酬率 (小數表示，例如 0.15 代表 +15.0%, -0.22 代表 -22.0%)
  returns: {
    // 台灣加權報酬指數 / 元大台灣50 (0050) / 富邦台50 (006208)
    tw_large: [
      -0.439, -0.173, -0.198, 0.354, 0.071, 0.067, 0.195, 0.087, -0.461, 0.783,
      0.096, -0.212, 0.089, 0.118, 0.081, -0.104, 0.178, 0.175, -0.086, 0.306,
      0.228, 0.237, -0.224, 0.315, 0.285, 0.124
    ],
    // 台灣高股息 (0056 / 00878 / 00919 追蹤指數回溯)
    tw_dividend: [
      -0.352, -0.112, -0.145, 0.286, 0.095, 0.082, 0.164, 0.051, -0.428, 0.625,
      0.114, -0.162, 0.105, 0.092, 0.064, -0.078, 0.142, 0.151, -0.052, 0.264,
      0.148, 0.186, -0.158, 0.384, 0.182, 0.095
    ],
    // 台灣中小型股 (0051 / 櫃買指數)
    tw_mid: [
      -0.485, -0.221, -0.264, 0.482, 0.042, 0.125, 0.214, 0.062, -0.524, 0.952,
      0.085, -0.265, 0.074, 0.185, 0.045, -0.062, 0.112, 0.204, -0.156, 0.289,
      0.214, 0.292, -0.241, 0.298, 0.225, 0.105
    ],
    // 台幣定存 / 貨幣市場 (約當無風險報酬)
    tw_cash: [
      0.051, 0.038, 0.021, 0.015, 0.014, 0.017, 0.021, 0.024, 0.022, 0.008,
      0.009, 0.012, 0.013, 0.013, 0.013, 0.013, 0.012, 0.010, 0.010, 0.010,
      0.008, 0.008, 0.012, 0.016, 0.017, 0.018
    ],
    // 美國標普500 (VOO / SPY / 00646)
    us_sp500: [
      -0.091, -0.119, -0.221, 0.287, 0.109, 0.049, 0.158, 0.055, -0.370, 0.265,
      0.151, 0.021, 0.160, 0.324, 0.137, 0.014, 0.120, 0.218, -0.044, 0.315,
      0.184, 0.287, -0.181, 0.263, 0.250, 0.112
    ],
    // 美國那斯達克 100 (QQQ / 00662)
    us_nasdaq: [
      -0.368, -0.327, -0.376, 0.491, 0.107, 0.015, 0.073, 0.192, -0.419, 0.546,
      0.201, 0.037, 0.184, 0.369, 0.194, 0.098, 0.073, 0.327, -0.010, 0.395,
      0.489, 0.275, -0.324, 0.549, 0.288, 0.145
    ],
    // 全球全市場股票 (VT / 006203 / MSCI ACWI)
    global_stock: [
      -0.142, -0.168, -0.193, 0.338, 0.152, 0.100, 0.210, 0.117, -0.422, 0.346,
      0.127, -0.073, 0.161, 0.228, 0.049, -0.024, 0.079, 0.240, -0.094, 0.266,
      0.163, 0.185, -0.184, 0.222, 0.201, 0.118
    ],
    // 美國 20 年期以上長天期公債 (TLT / 00679B / 00687B)
    us_long_bond: [
      0.197, 0.043, 0.168, 0.025, 0.077, 0.065, 0.018, 0.098, 0.338, -0.218,
      0.092, 0.340, 0.026, -0.127, 0.251, -0.018, 0.012, 0.086, -0.016, 0.148,
      0.181, -0.046, -0.312, 0.028, -0.042, 0.065
    ],
    // 全球 / 美國投資級綜合債券 (BND / BNDW / 00720B / AGG)
    us_agg_bond: [
      0.116, 0.084, 0.103, 0.041, 0.043, 0.024, 0.043, 0.070, 0.052, 0.059,
      0.065, 0.078, 0.042, -0.020, 0.060, 0.005, 0.026, 0.035, 0.000, 0.087,
      0.075, -0.015, -0.130, 0.055, 0.022, 0.045
    ],
    // 台灣50正2 (00631L / 台灣加權報酬 2 倍槓桿回溯)
    tw_large_2x: [
      -0.735, -0.345, -0.380, 0.820, 0.115, 0.108, 0.412, 0.145, -0.758, 2.050,
      0.175, -0.410, 0.155, 0.220, 0.135, -0.215, 0.385, 0.370, -0.175, 0.725,
      0.550, 0.565, -0.445, 0.745, 0.670, 0.245
    ],
    // 全球股票正2 (VT正2 / MSCI ACWI 2 倍槓桿回溯)
    global_stock_2x: [
      -0.305, -0.355, -0.395, 0.760, 0.315, 0.195, 0.450, 0.225, -0.715, 0.785,
      0.245, -0.165, 0.335, 0.490, 0.082, -0.065, 0.150, 0.520, -0.205, 0.585,
      0.345, 0.390, -0.385, 0.475, 0.425, 0.235
    ],
    // 黃金 (GLD / 00635U)
    gold: [
      -0.054, 0.014, 0.248, 0.194, 0.053, 0.182, 0.230, 0.309, 0.058, 0.243,
      0.297, 0.101, 0.070, -0.283, -0.017, -0.104, 0.081, 0.131, -0.016, 0.183,
      0.251, -0.036, -0.008, 0.131, 0.312, 0.085
    ],
    // 台灣 CPI 年通膨率
    tw_cpi: [
      0.013, -0.001, -0.002, -0.003, 0.016, 0.023, 0.006, 0.018, 0.035, -0.009,
      0.010, 0.014, 0.019, 0.008, 0.012, -0.003, 0.014, 0.006, 0.013, 0.006,
      -0.002, 0.019, 0.029, 0.025, 0.022, 0.018
    ],
    // 美國 CPI 年通膨率
    us_cpi: [
      0.034, 0.016, 0.024, 0.019, 0.033, 0.034, 0.025, 0.041, 0.001, 0.027,
      0.015, 0.030, 0.017, 0.015, 0.008, 0.007, 0.021, 0.021, 0.019, 0.023,
      0.014, 0.070, 0.065, 0.034, 0.029, 0.024
    ]
  },

  // 資產元數據與統計摘要（年化報酬、波動度、說明）
  assetMeta: {
    tw_large: {
      name: '台灣大型股 (0050 / 006208)',
      category: '台灣股票',
      defaultReturn: 0.108, // 10.8%
      defaultStDev: 0.225,  // 22.5%
      color: '#3B82F6',
      desc: '元大台灣50、富邦台50，涵蓋台股市值前50大企業與半導體龍頭'
    },
    tw_large_2x: {
      name: '🔥 台灣50正2 (00631L / 2x槓桿)',
      category: '槓桿型股票',
      defaultReturn: 0.185, // 18.5%
      defaultStDev: 0.385,  // 38.5%
      color: '#1D4ED8',
      desc: '元大台灣50單日正向2倍 (00631L)，利用期貨槓桿放大台股 2 倍報酬，爆發力極強但波動與回撤巨大'
    },
    tw_dividend: {
      name: '台灣高股息 (0056 / 00878 / 00919)',
      category: '台灣股票',
      defaultReturn: 0.092, // 9.2%
      defaultStDev: 0.185,  // 18.5%
      color: '#10B981',
      desc: '精選高殖利率與穩定配息企業，波動較大盤略低，現金流導向'
    },
    tw_mid: {
      name: '台灣中小型股 (0051 / 櫃買)',
      category: '台灣股票',
      defaultReturn: 0.115,
      defaultStDev: 0.265,
      color: '#8B5CF6',
      desc: '台灣具成長潛力之中小型企業，爆發力強但波動度較高'
    },
    tw_cash: {
      name: '台幣定存 / 現金活存',
      category: '現金與貨幣',
      defaultReturn: 0.016,
      defaultStDev: 0.005,
      color: '#64748B',
      desc: '台灣銀行 1 年期定存利率，保本零風險儲蓄'
    },
    us_sp500: {
      name: '美國標普500 (VOO / SPY / 00646)',
      category: '美國股票',
      defaultReturn: 0.102,
      defaultStDev: 0.168,
      color: '#06B6D4',
      desc: '美國前500大龍頭企業指數，全球最具代表性之權益資產'
    },
    us_nasdaq: {
      name: '美國那斯達克100 (QQQ / 00662)',
      category: '美國股票',
      defaultReturn: 0.135,
      defaultStDev: 0.228,
      color: '#EC4899',
      desc: '全球科技巨頭核心指數 (微軟、蘋果、輝達、谷歌等)，高成長高波動'
    },
    global_stock: {
      name: '全球市場股票 (VT / 006203)',
      category: '全球股票',
      defaultReturn: 0.088,
      defaultStDev: 0.172,
      color: '#F59E0B',
      desc: '涵蓋全球成熟與新興市場超過 9,000 檔股票，極致分散風險'
    },
    global_stock_2x: {
      name: '🔥 全球股票正2 (VT正2 / 2x槓桿)',
      category: '槓桿型股票',
      defaultReturn: 0.152, // 15.2%
      defaultStDev: 0.320,  // 32.0%
      color: '#B45309',
      desc: '全球股票 2 倍槓桿配置 (VT正2)，以 2 倍曝險參與全世界 9,000+ 家企業成長，兼顧全球分散與槓桿複利'
    },
    us_long_bond: {
      name: '美國長天期公債 (TLT / 00679B)',
      category: '固定收益 / 債券',
      defaultReturn: 0.048,
      defaultStDev: 0.138,
      color: '#6366F1',
      desc: '美國20年期以上國債，抗通縮與危機避險強，但對利率敏感度高'
    },
    us_agg_bond: {
      name: '全球/綜合投資級債券 (BND / BNDW / 00720B)',
      category: '固定收益 / 債券',
      defaultReturn: 0.038,
      defaultStDev: 0.065,
      color: '#14B8A6',
      desc: '中短期政府公債與優質公司債組合，穩定防禦與配息'
    },
    gold: {
      name: '黃金 / 貴金屬 (GLD / 00635U)',
      category: '另類資產',
      defaultReturn: 0.075,
      defaultStDev: 0.155,
      color: '#EAB308',
      desc: '抗通膨與地緣政治避險資產，與股票市場相關性低'
    }
  },

  // 預設資產相關係數矩陣 (Correlation Matrix)
  correlationMatrix: {
    tw_large:       { tw_large: 1.00, tw_large_2x: 0.99, tw_dividend: 0.88, tw_mid: 0.85, tw_cash: 0.02, us_sp500: 0.65, us_nasdaq: 0.68, global_stock: 0.66, global_stock_2x: 0.66, us_long_bond: -0.15, us_agg_bond: 0.05, gold: 0.12 },
    tw_large_2x:    { tw_large: 0.99, tw_large_2x: 1.00, tw_dividend: 0.87, tw_mid: 0.85, tw_cash: 0.02, us_sp500: 0.65, us_nasdaq: 0.68, global_stock: 0.66, global_stock_2x: 0.66, us_long_bond: -0.15, us_agg_bond: 0.05, gold: 0.12 },
    tw_dividend:    { tw_large: 0.88, tw_large_2x: 0.87, tw_dividend: 1.00, tw_mid: 0.76, tw_cash: 0.03, us_sp500: 0.58, us_nasdaq: 0.55, global_stock: 0.60, global_stock_2x: 0.60, us_long_bond: -0.10, us_agg_bond: 0.08, gold: 0.10 },
    tw_mid:         { tw_large: 0.85, tw_large_2x: 0.85, tw_dividend: 0.76, tw_mid: 1.00, tw_cash: 0.01, us_sp500: 0.60, us_nasdaq: 0.65, global_stock: 0.61, global_stock_2x: 0.61, us_long_bond: -0.18, us_agg_bond: 0.02, gold: 0.08 },
    tw_cash:        { tw_large: 0.02, tw_large_2x: 0.02, tw_dividend: 0.03, tw_mid: 0.01, tw_cash: 1.00, us_sp500: 0.01, us_nasdaq: 0.00, global_stock: 0.01, global_stock_2x: 0.01, us_long_bond:  0.05, us_agg_bond: 0.10, gold: 0.02 },
    us_sp500:       { tw_large: 0.65, tw_large_2x: 0.65, tw_dividend: 0.58, tw_mid: 0.60, tw_cash: 0.01, us_sp500: 1.00, us_nasdaq: 0.90, global_stock: 0.95, global_stock_2x: 0.95, us_long_bond: -0.25, us_agg_bond: 0.12, gold: 0.08 },
    us_nasdaq:      { tw_large: 0.68, tw_large_2x: 0.68, tw_dividend: 0.55, tw_mid: 0.65, tw_cash: 0.00, us_sp500: 0.90, us_nasdaq: 1.00, global_stock: 0.86, global_stock_2x: 0.86, us_long_bond: -0.22, us_agg_bond: 0.08, gold: 0.05 },
    global_stock:   { tw_large: 0.66, tw_large_2x: 0.66, tw_dividend: 0.60, tw_mid: 0.61, tw_cash: 0.01, us_sp500: 0.95, us_nasdaq: 0.86, global_stock: 1.00, global_stock_2x: 0.99, us_long_bond: -0.20, us_agg_bond: 0.15, gold: 0.15 },
    global_stock_2x:{ tw_large: 0.66, tw_large_2x: 0.66, tw_dividend: 0.60, tw_mid: 0.61, tw_cash: 0.01, us_sp500: 0.95, us_nasdaq: 0.86, global_stock: 0.99, global_stock_2x: 1.00, us_long_bond: -0.20, us_agg_bond: 0.15, gold: 0.15 },
    us_long_bond:   { tw_large:-0.15, tw_large_2x:-0.15, tw_dividend:-0.10, tw_mid:-0.18, tw_cash: 0.05, us_sp500:-0.25, us_nasdaq:-0.22, global_stock:-0.20, global_stock_2x:-0.20, us_long_bond:  1.00, us_agg_bond: 0.82, gold: 0.22 },
    us_agg_bond:    { tw_large: 0.05, tw_large_2x: 0.05, tw_dividend: 0.08, tw_mid: 0.02, tw_cash: 0.10, us_sp500: 0.12, us_nasdaq: 0.08, global_stock: 0.15, global_stock_2x: 0.15, us_long_bond:  0.82, us_agg_bond: 1.00, gold: 0.20 },
    gold:           { tw_large: 0.12, tw_large_2x: 0.12, tw_dividend: 0.10, tw_mid: 0.08, tw_cash: 0.02, us_sp500: 0.08, us_nasdaq: 0.05, global_stock: 0.15, global_stock_2x: 0.15, us_long_bond:  0.22, us_agg_bond: 0.20, gold: 1.00 }
  }
};

// 輔助函式：計算歷史平均與幾何年化
function getAssetHistoricalStats(assetKey) {
  const arr = HISTORICAL_DATA.returns[assetKey];
  if (!arr || arr.length === 0) return null;
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const compound = arr.reduce((acc, r) => acc * (1 + r), 1);
  const cagr = Math.pow(compound, 1 / n) - 1;
  const variance = arr.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
  const stdev = Math.sqrt(variance);
  
  return { mean, cagr, stdev, count: n };
}

// 導出或掛載到全域
if (typeof window !== 'undefined') {
  window.HISTORICAL_DATA = HISTORICAL_DATA;
  window.getAssetHistoricalStats = getAssetHistoricalStats;
}

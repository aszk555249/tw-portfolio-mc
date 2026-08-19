/**
 * Taiwan Portfolio Visualizer - 蒙地卡羅模擬核心運算引擎 (Monte Carlo Engine)
 * 完整實作 Portfolio Visualizer 核心架構：
 * 1. 存活率逐年曲線 (Portfolio Survival Rate over Time)
 * 2. 完整量化績效矩陣 (Performance Summary: TWRR, CAGR, Volatility, Sharpe, Sortino, Drawdowns, SWR, PWR)
 * 3. 內扣管理費用扣除 (Fee Structure / Expense Ratio)
 * 4. 報酬順序風險壓力測試 (Sequence of Returns Risk Adjustment)
 * 5. 多時期自訂現金流排程與實質通膨折算
 */

class MonteCarloEngine {
  constructor() {}

  /**
   * 執行完整蒙地卡羅模擬
   * @param {Object} config 模擬設定參數
   * @returns {Object} 模擬統計結果、百分位數曲線、存活率曲線、績效矩陣、分佈直方圖與明細
   */
  static runSimulation(config) {
    const {
      initialInvestment = 1000000,   // 初始本金
      years = 30,                    // 投資/提領年期
      trials = 2000,                 // 模擬次數
      model = 'parametric',          // 'parametric' 或 'bootstrap'
      rebalanceFrequency = 'annual', // 'annual', 'never'
      
      // 內扣管理費 / 費用結構 (每年扣除比例，例如 0.003 代表 0.3%)
      expenseRatio = 0.0,

      // 報酬順序風險 (Sequence of Returns Risk)
      // 'none' (標準隨機) 或 'stress_early' (前2~3年遭遇極端熊市考驗)
      sequenceRisk = 'none',

      // 通膨設定
      inflationModel = 'constant',   // 'constant' 或 'bootstrap'
      inflationRate = 0.02,          // 固定年通膨率
      adjustForInflation = true,     // 是否以實質購買力呈現

      // 現金流設定模式: 'simple' 或 'advanced'
      cashflowPlannerMode = 'simple',

      // 簡易模式參數
      cashflowMode = 'accumulation',
      retirementStartYear = 21,
      contributionAmount = 20000,
      contributionFrequency = 'monthly',
      contributionGrowthRate = 0.02,
      withdrawalType = 'fixed_amount',
      withdrawalRate = 0.04,
      customWithdrawalAmount = 0,
      withdrawalAdjustInflation = true,
      minEndingBalance = 0,

      // 進階多時期排程
      cashflowStages = [],

      // 資產配置清單
      assets = []
    } = config;

    // 1. 正規化資產權重
    const totalWeight = assets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
    if (totalWeight <= 0) {
      throw new Error('資產權重總和必須大於 0');
    }
    const normalizedAssets = assets.map(a => ({
      key: a.key,
      weight: (parseFloat(a.weight) || 0) / totalWeight,
      expectedReturn: parseFloat(a.expectedReturn ?? HISTORICAL_DATA.assetMeta[a.key]?.defaultReturn ?? 0.08),
      stdev: parseFloat(a.stdev ?? HISTORICAL_DATA.assetMeta[a.key]?.defaultStDev ?? 0.18)
    }));

    // 2. 建立 Cholesky 分解矩陣 (用於 parametric 模型)
    let choleskyMatrix = null;
    if (model === 'parametric') {
      choleskyMatrix = this._buildCholeskyMatrix(normalizedAssets);
    }

    // 3. 準備模擬資料容器
    const nominalTrajectories = new Array(trials);
    const realTrajectories = new Array(trials);
    const yearlyCashflowsNominal = new Array(trials);
    const yearlyCashflowsReal = new Array(trials);
    
    // 量化統計專用數列
    const trialTWRRNominal = new Array(trials);
    const trialTWRRReal = new Array(trials);
    const trialMeanReturns = new Array(trials);
    const trialVolatilities = new Array(trials);
    const trialSharpeRatios = new Array(trials);
    const trialSortinoRatios = new Array(trials);
    const maxDrawdownsWithCashflow = new Array(trials);
    const maxDrawdownsPureAsset = new Array(trials);
    const trialSWR = new Array(trials); // 安全提領率
    const trialPWR = new Array(trials); // 永續提領率

    const endingNominalBalances = new Array(trials);
    const endingRealBalances = new Array(trials);
    const ruinYears = [];

    // 逐年存活計數 (用於繪製 Portfolio Survival 曲線)
    const survivedCountByYear = new Array(years + 1).fill(0);
    survivedCountByYear[0] = trials;

    const histYearCount = HISTORICAL_DATA.years.length;
    const riskFreeRate = 0.015; // 基準無風險利率 (台幣定存約 1.5%)

    // 4. 開始蒙地卡羅 Trials 迴圈
    for (let t = 0; t < trials; t++) {
      const trialNominal = [initialInvestment];
      const trialReal = [initialInvestment];
      const trialCashflowNom = [0];
      const trialCashflowReal = [0];

      let currentNominal = initialInvestment;
      let pureAssetIndex = 1000.0; // 純資產淨值指數 (用於計算排除現金流之最大回撤)
      let peakNominal = initialInvestment;
      let peakPureAsset = 1000.0;
      
      let maxDDWithCashflow = 0;
      let maxDDPureAsset = 0;
      let cumInflation = 1.0;
      let isRuined = false;
      let ruinedYear = null;

      const annualPortfolioReturns = [];
      const annualRealReturns = [];

      let withdrawalStates = {};
      let prevSimpleWithdrawal = (customWithdrawalAmount > 0) ? customWithdrawalAmount : (initialInvestment * withdrawalRate);
      let currentAssetHoldings = normalizedAssets.map(a => currentNominal * a.weight);

      for (let y = 1; y <= years; y++) {
        // --- A. 決定當年各資產報酬率與通膨率 ---
        let assetReturns = [];
        let yearInflation = inflationRate;

        if (model === 'bootstrap') {
          let randIdx = Math.floor(Math.random() * histYearCount);
          
          // Bug5 Fix: 壓力測試年份索引改為動態查找，避免資料異動時指向錯誤年份
          if (sequenceRisk === 'stress_early' && y <= 2) {
            const idx2008 = HISTORICAL_DATA.years.indexOf(2008);
            const idx2000 = HISTORICAL_DATA.years.indexOf(2000);
            randIdx = y === 1 ? (idx2008 >= 0 ? idx2008 : 8) : (idx2000 >= 0 ? idx2000 : 0);
          }

          assetReturns = normalizedAssets.map(a => {
            const histArr = HISTORICAL_DATA.returns[a.key];
            return histArr ? histArr[randIdx] : (a.expectedReturn || 0.08);
          });
          if (inflationModel === 'bootstrap') {
            yearInflation = HISTORICAL_DATA.returns.tw_cpi[randIdx];
          }
        } else {
          const z = this._generateStandardNormalVector(normalizedAssets.length);
          const correlatedZ = this._multiplyCholesky(choleskyMatrix, z);
          assetReturns = normalizedAssets.map((a, idx) => {
            let drift = a.expectedReturn - 0.5 * Math.pow(a.stdev, 2);
            let diffusion = a.stdev * correlatedZ[idx];

            // 報酬順序壓力測試：前 2 年遭遇 -2 個標準差衝擊
            if (sequenceRisk === 'stress_early' && y <= 2) {
              diffusion = -2.0 * a.stdev;
            }

            return Math.exp(drift + diffusion) - 1;
          });
          if (inflationModel === 'bootstrap') {
            const randIdx = Math.floor(Math.random() * histYearCount);
            yearInflation = HISTORICAL_DATA.returns.tw_cpi[randIdx];
          }
        }

        cumInflation *= (1 + yearInflation);

        // --- B. 計算投資組合加權報酬率 (扣除管理費率) ---
        let portfolioGrossReturn = 0;
        for (let i = 0; i < normalizedAssets.length; i++) {
          portfolioGrossReturn += normalizedAssets[i].weight * assetReturns[i];
        }
        const portfolioNetReturn = portfolioGrossReturn - expenseRatio;
        const portfolioRealReturn = (1 + portfolioNetReturn) / (1 + yearInflation) - 1;

        annualPortfolioReturns.push(portfolioNetReturn);
        annualRealReturns.push(portfolioRealReturn);

        // 更新純資產波動指數 (不含現金流，純反映市場漲跌)
        pureAssetIndex *= (1 + portfolioNetReturn);
        if (pureAssetIndex > peakPureAsset) {
          peakPureAsset = pureAssetIndex;
        } else if (peakPureAsset > 0) {
          const dd = (peakPureAsset - pureAssetIndex) / peakPureAsset;
          if (dd > maxDDPureAsset) maxDDPureAsset = dd;
        }

        // --- C. Bug1 Fix: 先套用報酬率讓資產成長，再處理現金流 ---
        // 正確財務順序：年初資產 × 本年報酬率 → 年底加/扣現金流
        if (currentNominal > 0) {
          if (rebalanceFrequency === 'annual') {
            currentNominal *= (1 + portfolioNetReturn);
          } else {
            // Bug3 Fix: 不再平衡模式，各資產個別成長後，整體費用率只扣一次
            let newTotal = 0;
            for (let i = 0; i < currentAssetHoldings.length; i++) {
              currentAssetHoldings[i] = Math.max(0, currentAssetHoldings[i]) * (1 + assetReturns[i]);
              newTotal += currentAssetHoldings[i];
            }
            // 整體扣除費用率（非各資產重複各扣一次，修正重複計算 Bug）
            const afterFeeTotal = newTotal * (1 - expenseRatio);
            const feeScale = newTotal > 0 ? (afterFeeTotal / newTotal) : 1;
            for (let i = 0; i < currentAssetHoldings.length; i++) {
              currentAssetHoldings[i] *= feeScale;
            }
            currentNominal = afterFeeTotal;
          }
        }

        // --- D. Bug1 Fix: 報酬率套用後，再處理現金流 ---
        let netCashflowNominal = 0;

        if (currentNominal <= 0) {
          // 資產已歸零：標記破產並鎖定
          if (!isRuined) {
            isRuined = true;
            ruinedYear = y;
          }
          currentNominal = 0;
        } else {
          if (cashflowPlannerMode === 'advanced') {
            // 進階多時期排程
            cashflowStages.forEach((stage, sIdx) => {
              if (currentNominal <= 0) return;

              if (stage.type === 'periodic_contribution') {
                if (y >= stage.startYear && y <= stage.endYear) {
                  const stageYearOffset = y - stage.startYear;
                  const growthFactor = Math.pow(1 + (stage.growthRate || 0), stageYearOffset);
                  const baseAmt = stage.amount || 0;
                  const annualContrib = (stage.frequency === 'monthly' ? baseAmt * 12 : baseAmt) * growthFactor;
                  netCashflowNominal += annualContrib;
                }
              } else if (stage.type === 'lump_sum_in') {
                if (y === stage.year) {
                  netCashflowNominal += (stage.amount || 0);
                }
              } else if (stage.type === 'lump_sum_out') {
                if (y === stage.year) {
                  netCashflowNominal -= (stage.amount || 0);
                }
              } else if (stage.type === 'periodic_withdrawal') {
                if (y >= stage.startYear && y <= stage.endYear) {
                  const wKey = `stage_${sIdx}`;
                  if (!withdrawalStates[wKey]) {
                    withdrawalStates[wKey] = {
                      initialBalance: currentNominal,
                      prevWithdrawal: (stage.customAmount > 0) ? stage.customAmount : (currentNominal * (stage.rate || 0.04)),
                      initialRate: stage.rate || 0.04
                    };
                  }
                  const wState = withdrawalStates[wKey];
                  let withdrawalAmt = 0;
                  const startYearBalance = currentNominal;

                  switch (stage.withdrawalType) {
                    case 'fixed_amount': {
                      withdrawalAmt = stage.adjustInflation !== false 
                        ? (wState.prevWithdrawal * (y === stage.startYear ? 1 : (1 + yearInflation)))
                        : wState.prevWithdrawal;
                      break;
                    }
                    case 'fixed_percentage': {
                      withdrawalAmt = startYearBalance * (stage.rate || 0.04);
                      break;
                    }
                    case 'guyton_klinger': {
                      let targetW = wState.prevWithdrawal * (1 + yearInflation);
                      const currentWBR = targetW / (startYearBalance || 1);
                      if (currentWBR > wState.initialRate * 1.2 && y < stage.endYear - 3) {
                        targetW *= 0.90;
                      } else if (currentWBR < wState.initialRate * 0.8) {
                        targetW *= 1.10;
                      }
                      withdrawalAmt = targetW;
                      break;
                    }
                    default:
                      withdrawalAmt = startYearBalance * (stage.rate || 0.04);
                  }

                  wState.prevWithdrawal = withdrawalAmt;
                  netCashflowNominal -= withdrawalAmt;
                }
              }
            });

            currentNominal += netCashflowNominal;
            if (currentNominal < 0) {
              currentNominal = 0;
              if (!isRuined) {
                isRuined = true;
                ruinedYear = y;
              }
            }
          } else {
            // 標準生命週期模式 (累積期 → 退休提領期)
            const rStartYear = typeof retirementStartYear !== 'undefined' 
              ? retirementStartYear 
              : (cashflowMode === 'withdrawal' ? 1 : 999);

            if (y < rStartYear) {
              // 階段 1：定期定額累積期
              const annualGrowthFactor = Math.pow(1 + contributionGrowthRate, y - 1);
              const annualContrib = (contributionFrequency === 'monthly' 
                ? contributionAmount * 12 
                : contributionAmount) * annualGrowthFactor;
              netCashflowNominal = annualContrib;
              currentNominal += netCashflowNominal;
            } else {
              // 階段 2：退休提領期
              const startYearBalance = currentNominal;
              if (y === rStartYear) {
                // Bug2 Fix: 退休開始年才依當時本金設定提領金額，而非用初始本金
                prevSimpleWithdrawal = (customWithdrawalAmount > 0) 
                  ? customWithdrawalAmount 
                  : (startYearBalance * withdrawalRate);
              }

              const baseRate = withdrawalRate > 0 
                ? withdrawalRate 
                : (customWithdrawalAmount > 0 && startYearBalance > 0 ? (customWithdrawalAmount / startYearBalance) : 0.04);

              let currentWithdrawal = 0;
              switch (withdrawalType) {
                case 'fixed_amount': {
                  currentWithdrawal = withdrawalAdjustInflation 
                    ? (prevSimpleWithdrawal * (y === rStartYear ? 1 : (1 + yearInflation)))
                    : prevSimpleWithdrawal;
                  break;
                }
                case 'fixed_percentage': {
                  currentWithdrawal = startYearBalance * baseRate;
                  break;
                }
                case 'guyton_klinger': {
                  let targetW = prevSimpleWithdrawal * (1 + yearInflation);
                  const currentWBR = targetW / (startYearBalance || 1);
                  if (currentWBR > baseRate * 1.2 && y < years - 3) {
                    targetW *= 0.90;
                  } else if (currentWBR < baseRate * 0.8) {
                    targetW *= 1.10;
                  }
                  currentWithdrawal = targetW;
                  break;
                }
                case 'floor_ceiling': {
                  let baseW = prevSimpleWithdrawal * (1 + yearInflation);
                  const pctW = startYearBalance * baseRate;
                  currentWithdrawal = Math.max(baseW * 0.95, Math.min(baseW * 1.05, pctW));
                  break;
                }
                default:
                  currentWithdrawal = startYearBalance * baseRate;
              }

              prevSimpleWithdrawal = currentWithdrawal;
              netCashflowNominal = -currentWithdrawal;
              currentNominal += netCashflowNominal;
              if (currentNominal < 0) {
                currentNominal = 0;
                if (!isRuined) {
                  isRuined = true;
                  ruinedYear = y;
                }
              }
            }

            // 不再平衡模式：按比例將現金流分配到各資產持倉
            if (rebalanceFrequency === 'never' && netCashflowNominal !== 0) {
              const preTotal = currentAssetHoldings.reduce((s, h) => s + h, 0);
              if (preTotal > 0) {
                for (let i = 0; i < currentAssetHoldings.length; i++) {
                  const share = currentAssetHoldings[i] / preTotal;
                  currentAssetHoldings[i] = Math.max(0, currentAssetHoldings[i] + netCashflowNominal * share);
                }
              }
            }
          }
        }

        // 更新含現金流的最大回撤（現金流套用後才做，反映真實投資人帳戶曲線）
        if (currentNominal > peakNominal) {
          peakNominal = currentNominal;
        } else if (peakNominal > 0) {
          const dd = (peakNominal - currentNominal) / peakNominal;
          if (dd > maxDDWithCashflow) maxDDWithCashflow = dd;
        }

        // Bug6 Fix: 存活率計算 — 一旦破產就永久記錄為已滅失，避免市場反彈後誤計為存活
        if (currentNominal > (minEndingBalance || 0) && !isRuined) {
          survivedCountByYear[y]++;
        }

        const realValue = currentNominal / cumInflation;
        const realCashflow = netCashflowNominal / cumInflation;

        trialNominal.push(Math.round(currentNominal));
        trialReal.push(Math.round(realValue));
        trialCashflowNom.push(Math.round(netCashflowNominal));
        trialCashflowReal.push(Math.round(realCashflow));
      }

      // 儲存軌跡
      nominalTrajectories[t] = trialNominal;
      realTrajectories[t] = trialReal;
      yearlyCashflowsNominal[t] = trialCashflowNom;
      yearlyCashflowsReal[t] = trialCashflowReal;
      maxDrawdownsWithCashflow[t] = maxDDWithCashflow;
      maxDrawdownsPureAsset[t] = maxDDPureAsset;
      endingNominalBalances[t] = trialNominal[years];
      endingRealBalances[t] = trialReal[years];
      if (isRuined) ruinYears.push(ruinedYear);

      // 計算本條軌跡的專業量化指標 (TWRR, Sharpe, Sortino, SWR, PWR)
      const twrrNom = Math.pow(
        annualPortfolioReturns.reduce((acc, r) => acc * (1 + r), 1),
        1 / years
      ) - 1;
      const twrrReal = Math.pow(
        annualRealReturns.reduce((acc, r) => acc * (1 + r), 1),
        1 / years
      ) - 1;
      
      const meanNom = annualPortfolioReturns.reduce((a, b) => a + b, 0) / years;
      const varianceNom = annualPortfolioReturns.reduce(
        (sum, r) => sum + Math.pow(r - meanNom, 2), 0
      ) / (years - 1 || 1);
      const volNom = Math.sqrt(varianceNom);

      // 下檔標準差 (Downside Deviation for Sortino)
      const downsideVar = annualPortfolioReturns.reduce(
        (sum, r) => sum + Math.pow(Math.min(0, r - riskFreeRate), 2), 0
      ) / (years || 1);
      const downsideVol = Math.sqrt(downsideVar) || 1e-4;

      const sharpe = volNom > 0 ? (meanNom - riskFreeRate) / volNom : 0;
      const sortino = (meanNom - riskFreeRate) / downsideVol;

      // Bug4 Fix: SWR 改用年金公式 r / (1 - (1+r)^(-n))，比原本的線性估算更精確
      // 此為「本金在 n 年內完全消耗」的理論最大提領率（不考慮序列風險等實務因素）
      let estimatedSWR;
      if (Math.abs(twrrReal) < 1e-5) {
        // 零實質報酬：SWR = 1/n（均勻消耗本金）
        estimatedSWR = 1 / years;
      } else {
        estimatedSWR = twrrReal / (1 - Math.pow(1 + twrrReal, -years));
      }
      estimatedSWR = Math.max(0.001, Math.min(estimatedSWR, 0.50));

      // PWR (永續提領率)：長期實質報酬率即永續可提領比例
      const estimatedPWR = Math.max(0, twrrReal);

      trialTWRRNominal[t] = twrrNom;
      trialTWRRReal[t] = twrrReal;
      trialMeanReturns[t] = meanNom;
      trialVolatilities[t] = volNom;
      trialSharpeRatios[t] = sharpe;
      trialSortinoRatios[t] = sortino;
      trialSWR[t] = estimatedSWR;
      trialPWR[t] = estimatedPWR;
    }

    // 5. 彙整所有統計資料與生成績效矩陣
    return this._aggregateResults({
      years,
      trials,
      adjustForInflation,
      nominalTrajectories,
      realTrajectories,
      yearlyCashflowsNominal,
      yearlyCashflowsReal,
      survivedCountByYear,
      endingNominalBalances,
      endingRealBalances,
      ruinYears,
      initialInvestment,
      minEndingBalance,
      trialTWRRNominal,
      trialTWRRReal,
      trialMeanReturns,
      trialVolatilities,
      trialSharpeRatios,
      trialSortinoRatios,
      maxDrawdownsWithCashflow,
      maxDrawdownsPureAsset,
      trialSWR,
      trialPWR
    });
  }

  static _aggregateResults(data) {
    const {
      years,
      trials,
      adjustForInflation,
      nominalTrajectories,
      realTrajectories,
      yearlyCashflowsNominal,
      yearlyCashflowsReal,
      survivedCountByYear,
      endingNominalBalances,
      endingRealBalances,
      ruinYears,
      initialInvestment,
      minEndingBalance,
      trialTWRRNominal,
      trialTWRRReal,
      trialMeanReturns,
      trialVolatilities,
      trialSharpeRatios,
      trialSortinoRatios,
      maxDrawdownsWithCashflow,
      maxDrawdownsPureAsset,
      trialSWR,
      trialPWR
    } = data;

    const activeTrajectories = adjustForInflation ? realTrajectories : nominalTrajectories;
    const activeEnding = adjustForInflation ? endingRealBalances : endingNominalBalances;

    // 1. 逐年資產百分位數軌跡
    const percentileYears = [];
    for (let y = 0; y <= years; y++) {
      const yearValues = activeTrajectories.map(traj => traj[y]).sort((a, b) => a - b);
      percentileYears.push({
        year: y,
        p10: this._quantile(yearValues, 0.10),
        p25: this._quantile(yearValues, 0.25),
        p50: this._quantile(yearValues, 0.50),
        p75: this._quantile(yearValues, 0.75),
        p90: this._quantile(yearValues, 0.90)
      });
    }

    // 2. 存活率逐年曲線 (Portfolio Survival Rate %)
    const survivalCurve = [];
    for (let y = 1; y <= years; y++) {
      const rate = (survivedCountByYear[y] / trials) * 100;
      survivalCurve.push({
        year: y,
        rate: Math.round(rate * 100) / 100
      });
    }

    // 3. 完整績效矩陣 (Performance Summary 10th, 25th, 50th, 75th, 90th Percentiles)
    const sortedTWRRNom = [...trialTWRRNominal].sort((a, b) => a - b);
    const sortedTWRRReal = [...trialTWRRReal].sort((a, b) => a - b);
    const sortedNominalEnd = [...endingNominalBalances].sort((a, b) => a - b);
    const sortedRealEnd = [...endingRealBalances].sort((a, b) => a - b);
    const sortedMeanNom = [...trialMeanReturns].sort((a, b) => a - b);
    const sortedVolNom = [...trialVolatilities].sort((a, b) => a - b);
    const sortedSharpe = [...trialSharpeRatios].sort((a, b) => a - b);
    const sortedSortino = [...trialSortinoRatios].sort((a, b) => a - b);
    
    // 注意：回撤越深為負值，排序後取對應分位數
    const sortedDDWithCF = [...maxDrawdownsWithCashflow].sort((a, b) => a - b);
    const sortedDDPure = [...maxDrawdownsPureAsset].sort((a, b) => a - b);
    const sortedSWR = [...trialSWR].sort((a, b) => a - b);
    const sortedPWR = [...trialPWR].sort((a, b) => a - b);

    const quantiles = [0.10, 0.25, 0.50, 0.75, 0.90];

    const performanceMatrix = {
      twrrNominal: quantiles.map(q => this._quantileFloat(sortedTWRRNom, q)),
      twrrReal: quantiles.map(q => this._quantileFloat(sortedTWRRReal, q)),
      endBalanceNominal: quantiles.map(q => this._quantile(sortedNominalEnd, q)),
      endBalanceReal: quantiles.map(q => this._quantile(sortedRealEnd, q)),
      meanReturnNominal: quantiles.map(q => this._quantileFloat(sortedMeanNom, q)),
      volatility: quantiles.map(q => this._quantileFloat(sortedVolNom, q)),
      sharpeRatio: quantiles.map(q => this._quantileFloat(sortedSharpe, q)),
      sortinoRatio: quantiles.map(q => this._quantileFloat(sortedSortino, q)),
      maxDrawdownWithCashflows: quantiles.map(q => -this._quantileFloat(sortedDDWithCF, 1 - q)), // 10%最差對應最大回撤
      maxDrawdownPureAsset: quantiles.map(q => -this._quantileFloat(sortedDDPure, 1 - q)),
      safeWithdrawalRate: quantiles.map(q => this._quantileFloat(sortedSWR, q)),
      perpetualWithdrawalRate: quantiles.map(q => this._quantileFloat(sortedPWR, q))
    };

    const summaryStats = {
      nominal: {
        p10: this._quantile(sortedNominalEnd, 0.10),
        p25: this._quantile(sortedNominalEnd, 0.25),
        p50: this._quantile(sortedNominalEnd, 0.50),
        p75: this._quantile(sortedNominalEnd, 0.75),
        p90: this._quantile(sortedNominalEnd, 0.90),
        mean: Math.round(sortedNominalEnd.reduce((a, b) => a + b, 0) / trials)
      },
      real: {
        p10: this._quantile(sortedRealEnd, 0.10),
        p25: this._quantile(sortedRealEnd, 0.25),
        p50: this._quantile(sortedRealEnd, 0.50),
        p75: this._quantile(sortedRealEnd, 0.75),
        p90: this._quantile(sortedRealEnd, 0.90),
        mean: Math.round(sortedRealEnd.reduce((a, b) => a + b, 0) / trials)
      }
    };

    // 存活率與破產機率計算：依據最終年份實際存活且未曾破產的軌跡數
    const successCount = survivedCountByYear[years];
    const successRate = Math.round(((successCount / trials) * 100) * 10) / 10;
    const ruinProbability = Math.round((100 - successRate) * 10) / 10;

    let medianRuinYear = null;
    if (ruinYears.length > 0) {
      const sortedRuin = [...ruinYears].sort((a, b) => a - b);
      medianRuinYear = this._quantile(sortedRuin, 0.50);
    }

    const maxDrawdownStats = {
      p10: this._quantileFloat(sortedDDWithCF, 0.10),
      median: this._quantileFloat(sortedDDWithCF, 0.50),
      p90: this._quantileFloat(sortedDDWithCF, 0.90),
      worst: sortedDDWithCF[sortedDDWithCF.length - 1]
    };

    const samplePathsCount = Math.min(30, trials);
    const samplePaths = [];
    const step = Math.floor(trials / samplePathsCount);
    for (let i = 0; i < samplePathsCount; i++) {
      samplePaths.push(activeTrajectories[i * step]);
    }

    const histogram = this._buildHistogram(activeEnding, 20);

    const yearlyTable = [];
    for (let y = 0; y <= years; y++) {
      const yearNominalArr = nominalTrajectories.map(t => t[y]).sort((a, b) => a - b);
      const yearRealArr = realTrajectories.map(t => t[y]).sort((a, b) => a - b);
      const cfNominalArr = yearlyCashflowsNominal.map(t => t[y]).sort((a, b) => a - b);
      const cfRealArr = yearlyCashflowsReal.map(t => t[y]).sort((a, b) => a - b);

      yearlyTable.push({
        year: y,
        nominalBalance: this._quantile(yearNominalArr, 0.50),
        realBalance: this._quantile(yearRealArr, 0.50),
        nominalCashflow: this._quantile(cfNominalArr, 0.50),
        realCashflow: this._quantile(cfRealArr, 0.50),
        nominalP10: this._quantile(yearNominalArr, 0.10),
        nominalP90: this._quantile(yearNominalArr, 0.90),
        realP10: this._quantile(yearRealArr, 0.10),
        realP90: this._quantile(yearRealArr, 0.90)
      });
    }

    return {
      summaryStats,
      successRate: Math.round(successRate * 10) / 10,
      ruinProbability: Math.round(ruinProbability * 10) / 10,
      medianRuinYear,
      maxDrawdownStats,
      percentileYears,
      survivalCurve,
      performanceMatrix,
      samplePaths,
      histogram,
      yearlyTable,
      trials,
      years,
      adjustForInflation
    };
  }

  static _quantile(sortedArr, q) {
    if (!sortedArr || sortedArr.length === 0) return 0;
    const pos = (sortedArr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
      return Math.round(sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]));
    } else {
      return Math.round(sortedArr[base]);
    }
  }

  static _quantileFloat(sortedArr, q) {
    if (!sortedArr || sortedArr.length === 0) return 0;
    const pos = (sortedArr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
      return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
    } else {
      return sortedArr[base];
    }
  }

  static _buildCholeskyMatrix(assets) {
    const n = assets.length;
    const sigma = Array.from({ length: n }, () => new Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          sigma[i][j] = Math.pow(assets[i].stdev, 2);
        } else {
          const keyI = assets[i].key;
          const keyJ = assets[j].key;
          const corr = HISTORICAL_DATA.correlationMatrix[keyI]?.[keyJ] ?? 
                       HISTORICAL_DATA.correlationMatrix[keyJ]?.[keyI] ?? 0.3;
          sigma[i][j] = corr * assets[i].stdev * assets[j].stdev;
        }
      }
    }

    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          const val = sigma[i][i] - sum;
          L[i][j] = Math.sqrt(Math.max(val, 1e-8));
        } else {
          L[i][j] = (sigma[i][j] - sum) / (L[j][j] || 1e-8);
        }
      }
    }
    return L;
  }

  static _generateStandardNormalVector(n) {
    const vec = new Array(n);
    for (let i = 0; i < n; i += 2) {
      let u1 = 0, u2 = 0;
      while (u1 === 0) u1 = Math.random();
      while (u2 === 0) u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
      vec[i] = z0;
      if (i + 1 < n) vec[i + 1] = z1;
    }
    return vec;
  }

  static _multiplyCholesky(L, z) {
    const n = z.length;
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j <= i; j++) {
        sum += L[i][j] * z[j];
      }
      result[i] = sum;
    }
    return result;
  }

  static _buildHistogram(arr, binCount = 20) {
    if (!arr || arr.length === 0) return { labels: [], counts: [] };
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    
    if (min === max) {
      return { labels: [`${min}`], counts: [arr.length] };
    }

    const binSize = (max - min) / binCount;
    const bins = new Array(binCount).fill(0);
    const labels = [];

    for (let i = 0; i < binCount; i++) {
      const lower = min + i * binSize;
      const upper = lower + binSize;
      labels.push(`${this.formatCurrencyShort(lower)} ~ ${this.formatCurrencyShort(upper)}`);
    }

    arr.forEach(val => {
      let binIdx = Math.floor((val - min) / binSize);
      if (binIdx >= binCount) binIdx = binCount - 1;
      if (binIdx < 0) binIdx = 0;
      bins[binIdx]++;
    });

    return { labels, counts: bins };
  }

  static formatCurrencyShort(val) {
    if (Math.abs(val) >= 100000000) {
      return (val / 100000000).toFixed(1) + '億';
    } else if (Math.abs(val) >= 10000) {
      return (val / 10000).toFixed(0) + '萬';
    }
    return Math.round(val).toLocaleString();
  }
}

if (typeof window !== 'undefined') {
  window.MonteCarloEngine = MonteCarloEngine;
}

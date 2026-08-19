/**
 * Taiwan Portfolio Visualizer - 前端控制器與互動邏輯 (app.js)
 * 完整實作 Portfolio Visualizer 核心架構：
 * 1. 資產配置模型總覽 (Portfolio Model: 權重清單 + 儲存組合 + 圓環甜甜圈圖)
 * 2. 存活率逐年曲線 (Portfolio Survival Chart)
 * 3. 量化績效統計總表 (Performance Summary Matrix)
 * 4. 50th/90th/10th 百分位數資產累積走勢圖 (Portfolio Balance)
 * 5. 費用結構、報酬順序風險壓力測試、多時期排程與大字體排版
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 全域應用程式狀態
  const state = {
    currency: 'TWD',
    adjustForInflation: true,
    cashflowPlannerMode: 'simple',
    cashflowMode: 'accumulation',
    retirementStartYear: 21,
    withdrawalBasis: 'rate',
    
    // 進階多時期現金流排程清單
    cashflowStages: [
      {
        id: 'stage_1',
        type: 'periodic_contribution',
        startYear: 1,
        endYear: 15,
        amount: 30000,
        frequency: 'monthly',
        growthRate: 0.02
      },
      {
        id: 'stage_2',
        type: 'lump_sum_in',
        year: 5,
        amount: 1000000
      },
      {
        id: 'stage_3',
        type: 'periodic_withdrawal',
        startYear: 16,
        endYear: 30,
        withdrawalType: 'fixed_amount',
        rate: 0.04,
        customAmount: 0,
        adjustInflation: true
      }
    ],

    assets: [
      { key: 'tw_large', weight: 50, expectedReturn: 0.108, stdev: 0.225 },
      { key: 'tw_dividend', weight: 50, expectedReturn: 0.092, stdev: 0.185 }
    ],
    lastResults: null,
    lastConfig: null,
    trajectoryChart: null,
    survivalChart: null,
    histogramChart: null,
    doughnutChart: null
  };

  // 2. DOM 元素快取
  const dom = {
    btnCurrTwd: document.getElementById('btn-curr-twd'),
    btnCurrUsd: document.getElementById('btn-curr-usd'),
    toggleReal: document.getElementById('toggle-real'),
    toggleNominal: document.getElementById('toggle-nominal'),
    inflationBannerText: document.getElementById('inflation-banner-text'),
    chartTitleMode: document.getElementById('chart-title-mode'),

    btnExportCsv: document.getElementById('btn-export-csv'),
    btnPrintReport: document.getElementById('btn-print-report'),
    btnTableDownloadCsv: document.getElementById('btn-table-download-csv'),
    btnPerfDownloadCsv: document.getElementById('btn-perf-download-csv'),

    presetSelector: document.getElementById('preset-selector'),
    presetDesc: document.getElementById('preset-desc'),
    inputInitialAmount: document.getElementById('input-initial-amount'),
    initialAmountDisplay: document.getElementById('initial-amount-display'),
    inputYears: document.getElementById('input-years'),
    inputYearsNumber: document.getElementById('input-years-number'),
    yearsDisplay: document.getElementById('years-display'),
    selectTrials: document.getElementById('select-trials'),
    selectModel: document.getElementById('select-model'),
    modelExplanationBox: document.getElementById('model-explanation-box'),
    selectFeeStructure: document.getElementById('select-fee-structure'),
    selectSequenceRisk: document.getElementById('select-sequence-risk'),
    feeSequenceExplanationBox: document.getElementById('fee-sequence-explanation-box'),

    selectInflationModel: document.getElementById('select-inflation-model'),
    inputInflationRate: document.getElementById('input-inflation-rate'),
    constantInflationBox: document.getElementById('constant-inflation-box'),
    bootstrapInflationBox: document.getElementById('bootstrap-inflation-box'),
    bootstrapCpiAvg: document.getElementById('bootstrap-cpi-avg'),
    inflationExplanationBox: document.getElementById('inflation-explanation-box'),
    infYearsText: document.getElementById('inf-years-text'),
    infPurchasingPower: document.getElementById('inf-purchasing-power'),
    infLossPct: document.getElementById('inf-loss-pct'),

    // 現金流模式切換
    btnModeSimple: document.getElementById('btn-mode-simple'),
    btnModeAdvanced: document.getElementById('btn-mode-advanced'),
    simpleCashflowContainer: document.getElementById('simple-cashflow-container'),
    advancedCashflowContainer: document.getElementById('advanced-cashflow-container'),

    // 簡易/生命週期模式
    inputRetirementYear: document.getElementById('input-retirement-year'),
    inputRetirementYearNumber: document.getElementById('input-retirement-year-number'),
    lifecycleBadge: document.getElementById('lifecycle-badge'),
    lifecycleTimelinePreview: document.getElementById('lifecycle-timeline-preview'),
    accumulationFields: document.getElementById('accumulation-fields'),
    withdrawalFields: document.getElementById('withdrawal-fields'),
    accumulationPeriodText: document.getElementById('accumulation-period-text'),
    withdrawalPeriodText: document.getElementById('withdrawal-period-text'),
    inputContribAmount: document.getElementById('input-contrib-amount'),
    contribAmountDisplay: document.getElementById('contrib-amount-display'),
    selectContribFreq: document.getElementById('select-contrib-freq'),
    inputContribGrowth: document.getElementById('input-contrib-growth'),
    btnWithdrawBasisRate: document.getElementById('btn-withdraw-basis-rate'),
    btnWithdrawBasisAmount: document.getElementById('btn-withdraw-basis-amount'),
    boxWithdrawRate: document.getElementById('box-withdraw-rate'),
    boxWithdrawAmount: document.getElementById('box-withdraw-amount'),
    inputWithdrawalRate: document.getElementById('input-withdrawal-rate'),
    withdrawalRateDesc: document.getElementById('withdrawal-rate-desc'),
    withdrawalRateAmountBox: document.getElementById('withdrawal-rate-amount-box'),
    withdrawRateAnnualDisplay: document.getElementById('withdraw-rate-annual-display'),
    withdrawRateMonthlyDisplay: document.getElementById('withdraw-rate-monthly-display'),
    withdrawRateTimingNote: document.getElementById('withdraw-rate-timing-note'),
    inputWithdrawalCustomAmount: document.getElementById('input-withdrawal-custom-amount'),
    selectWithdrawalAmountFreq: document.getElementById('select-withdrawal-amount-freq'),
    withdrawAmountAnnualDisplay: document.getElementById('withdraw-amount-annual-display'),
    selectWithdrawalType: document.getElementById('select-withdrawal-type'),
    withdrawalStrategyExplanationBox: document.getElementById('withdrawal-strategy-explanation-box'),
    inputMinBalance: document.getElementById('input-min-balance'),
    checkWithdrawalInflation: document.getElementById('check-withdrawal-inflation'),

    // 進階多時期排程
    cashflowStagesList: document.getElementById('cashflow-stages-list'),
    btnAddStageContrib: document.getElementById('btn-add-stage-contrib'),
    btnAddStageLumpin: document.getElementById('btn-add-stage-lumpin'),
    btnAddStageWithdraw: document.getElementById('btn-add-stage-withdraw'),
    btnLoadTwStagePreset: document.getElementById('btn-load-tw-stage-preset'),

    // 資產配置
    selectRebalance: document.getElementById('select-rebalance'),
    assetRowsContainer: document.getElementById('asset-rows-container'),
    btnAddAsset: document.getElementById('btn-add-asset'),
    btnAutoBalance: document.getElementById('btn-auto-balance'),
    weightTotalBadge: document.getElementById('weight-total-badge'),

    // Portfolio Model 卡片
    btnSavePortfolio: document.getElementById('btn-save-portfolio'),
    portfolioModelTableBody: document.getElementById('portfolio-model-table-body'),

    // 執行按鈕與狀態指示
    btnRunSimulation: document.getElementById('btn-run-simulation'),
    btnRunText: document.getElementById('btn-run-text'),
    btnRunIcon: document.getElementById('btn-run-icon'),
    simStatusBadge: document.getElementById('sim-status-badge'),
    simStatusText: document.getElementById('sim-status-text'),
    kpiCardsGrid: document.getElementById('kpi-cards-grid'),

    // KPI
    kpiP50: document.getElementById('kpi-p50'),
    kpiP50Sub: document.getElementById('kpi-p50-sub'),
    kpiSuccessRate: document.getElementById('kpi-success-rate'),
    kpiRuinText: document.getElementById('kpi-ruin-text'),
    kpiP10: document.getElementById('kpi-p10'),
    kpiDrawdown: document.getElementById('kpi-drawdown'),
    kpiWorstDd: document.getElementById('kpi-worst-dd'),

    // 圖表與明細
    checkShowPaths: document.getElementById('check-show-paths'),
    samplePathsExplanationBox: document.getElementById('sample-paths-explanation-box'),
    survivalFinalRate: document.getElementById('survival-final-rate'),
    performanceSummaryBody: document.getElementById('performance-summary-body'),
    performanceFooterNote: document.getElementById('performance-footer-note'),
    yearlyTableBody: document.getElementById('yearly-table-body'),
    simulationInsights: document.getElementById('simulation-insights')
  };

  lucide.createIcons();

  // 3. 初始載入與事件綁定
  initPresetSelector();
  renderAssetRows();
  renderCashflowStages();
  renderPortfolioModel();
  updateInflationIndicator();
  updateInflationExplanation();
  updateModelExplanation();
  updateFeeSequenceExplanation();
  updateSamplePathsExplanation();
  updateWithdrawalRateDesc();
  updateWithdrawalAmountDisplay();
  updateWithdrawalStrategyExplanation();
  bindEvents();
  runMonteCarlo();

  // ================= 函式實作 =================

  function initPresetSelector() {
    dom.presetSelector.innerHTML = '<option value="">-- 請選擇經典投資組合範本 --</option>';

    // 群組 1: VT 全球指數化系列
    const vtGroup = document.createElement('optgroup');
    vtGroup.label = '🌍 全球指數化投資 (VT 系列)';

    // 群組 2: 槓桿正2配置 (0050正2 與 VT正2)
    const levGroup = document.createElement('optgroup');
    levGroup.label = '🔥 槓桿指數配置 (0050正2 / VT正2 系列)';

    // 群組 3: 台美經典與股債平衡
    const classicGroup = document.createElement('optgroup');
    classicGroup.label = '🏛️ 台美經典與股債平衡配置';

    PRESET_PORTFOLIOS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;

      if (p.id.startsWith('vt_100') || p.id.startsWith('vt_80') || p.id.startsWith('vt_60')) {
        vtGroup.appendChild(opt);
      } else if (p.id.includes('2x')) {
        levGroup.appendChild(opt);
      } else {
        classicGroup.appendChild(opt);
      }
    });

    dom.presetSelector.appendChild(vtGroup);
    dom.presetSelector.appendChild(levGroup);
    dom.presetSelector.appendChild(classicGroup);

    // 載入使用者自訂組合群組
    const customList = getSavedPortfolios();
    if (customList.length > 0) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = '⭐ 我的自訂投資組合';
      customList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = `custom_${p.id}`;
        opt.textContent = `⭐ ${p.name}`;
        customGroup.appendChild(opt);
      });
      dom.presetSelector.appendChild(customGroup);
    }
  }

  function getSavedPortfolios() {
    try {
      const data = localStorage.getItem('tw_saved_portfolios');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function bindEvents() {
    // 幣別切換
    dom.btnCurrTwd.addEventListener('click', () => setCurrency('TWD'));
    dom.btnCurrUsd.addEventListener('click', () => setCurrency('USD'));

    // 通膨實質 / 名目開關切換
    dom.toggleReal.addEventListener('click', () => setInflationDisplayMode(true));
    dom.toggleNominal.addEventListener('click', () => setInflationDisplayMode(false));

    // 現金流模式切換
    dom.btnModeSimple.addEventListener('click', () => setCashflowPlannerMode('simple'));
    dom.btnModeAdvanced.addEventListener('click', () => setCashflowPlannerMode('advanced'));

    // 儲存投資組合按鈕
    if (dom.btnSavePortfolio) {
      dom.btnSavePortfolio.addEventListener('click', handleSavePortfolio);
    }

    // 範本選擇
    dom.presetSelector.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        dom.presetDesc.textContent = '';
        return;
      }

      if (selectedId.startsWith('custom_')) {
        const realId = selectedId.replace('custom_', '');
        const customList = getSavedPortfolios();
        const found = customList.find(p => p.id === realId);
        if (found) {
          dom.presetDesc.textContent = `自訂組合：${found.name} (於 ${found.savedAt || '本地'} 儲存)`;
          state.assets = found.assets.map(a => {
            const meta = HISTORICAL_DATA.assetMeta[a.key] || {};
            return {
              key: a.key,
              weight: a.weight,
              expectedReturn: meta.defaultReturn || 0.08,
              stdev: meta.defaultStDev || 0.18
            };
          });
          renderAssetRows();
          renderPortfolioModel();
          runMonteCarlo();
        }
      } else {
        const preset = PRESET_PORTFOLIOS.find(p => p.id === selectedId);
        if (preset) {
          dom.presetDesc.textContent = preset.desc;
          state.assets = preset.assets.map(a => {
            const meta = HISTORICAL_DATA.assetMeta[a.key] || {};
            return {
              key: a.key,
              weight: a.weight,
              expectedReturn: meta.defaultReturn || 0.08,
              stdev: meta.defaultStDev || 0.18
            };
          });
          renderAssetRows();
          renderPortfolioModel();
          runMonteCarlo();
        }
      }
    });

    // 快速金額按鈕
    document.querySelectorAll('.btn-quick-amount').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.dataset.val);
        dom.inputInitialAmount.value = val;
        updateAmountDisplay();
        runMonteCarlo();
      });
    });

    // 本金輸入事件
    dom.inputInitialAmount.addEventListener('input', () => {
      updateAmountDisplay();
      runMonteCarlo();
    });

    // 預測年限雙向綁定
    dom.inputYears.addEventListener('input', () => {
      const val = parseInt(dom.inputYears.value) || 30;
      setSimulationYears(val);
      runMonteCarlo();
    });

    if (dom.inputYearsNumber) {
      dom.inputYearsNumber.addEventListener('input', () => {
        let val = parseInt(dom.inputYearsNumber.value) || 30;
        val = Math.max(1, Math.min(60, val));
        setSimulationYears(val, false);
        runMonteCarlo();
      });
    }

    document.querySelectorAll('.btn-quick-years').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        setSimulationYears(val);
        runMonteCarlo();
      });
    });

    // 模型切換事件
    dom.selectModel.addEventListener('change', () => {
      updateModelExplanation();
      runMonteCarlo();
    });

    // 費用結構與報酬順序風險切換事件
    dom.selectFeeStructure.addEventListener('change', () => {
      updateFeeSequenceExplanation();
      runMonteCarlo();
    });

    dom.selectSequenceRisk.addEventListener('change', () => {
      updateFeeSequenceExplanation();
      runMonteCarlo();
    });

    dom.selectTrials.addEventListener('change', () => {
      runMonteCarlo();
    });

    // 通膨輸入與模式切換
    dom.inputInflationRate.addEventListener('input', () => {
      updateInflationIndicator();
      updateInflationExplanation();
      runMonteCarlo();
    });
    dom.selectInflationModel.addEventListener('change', () => {
      updateInflationExplanation();
      updateInflationIndicator();
      runMonteCarlo();
    });

    // 退休開始年份事件綁定 (生命週期時程)
    if (dom.inputRetirementYear) {
      dom.inputRetirementYear.addEventListener('input', () => {
        const val = parseInt(dom.inputRetirementYear.value) || 21;
        setRetirementStartYear(val);
        runMonteCarlo();
      });
    }

    if (dom.inputRetirementYearNumber) {
      dom.inputRetirementYearNumber.addEventListener('input', () => {
        const val = parseInt(dom.inputRetirementYearNumber.value) || 21;
        setRetirementStartYear(val, false);
        runMonteCarlo();
      });
    }

    document.querySelectorAll('.btn-quick-retire').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        setRetirementStartYear(val);
        runMonteCarlo();
      });
    });

    // 定期定額金額更新
    dom.inputContribAmount.addEventListener('input', () => {
      const val = parseFloat(dom.inputContribAmount.value) || 0;
      const freq = dom.selectContribFreq.value === 'monthly' ? '每月' : '每年';
      dom.contribAmountDisplay.textContent = `${freq} ${formatCurrencyShort(val)} 元`;
      runMonteCarlo();
    });
    dom.selectContribFreq.addEventListener('change', () => {
      const val = parseFloat(dom.inputContribAmount.value) || 0;
      const freq = dom.selectContribFreq.value === 'monthly' ? '每月' : '每年';
      dom.contribAmountDisplay.textContent = `${freq} ${formatCurrencyShort(val)} 元`;
      runMonteCarlo();
    });
    if (dom.inputContribGrowth) {
      dom.inputContribGrowth.addEventListener('input', runMonteCarlo);
    }

    // 提領基準切換 (提領率 % vs 提領金額 $)
    if (dom.btnWithdrawBasisRate && dom.btnWithdrawBasisAmount) {
      dom.btnWithdrawBasisRate.addEventListener('click', () => {
        setWithdrawalBasis('rate');
        runMonteCarlo();
      });

      dom.btnWithdrawBasisAmount.addEventListener('click', () => {
        setWithdrawalBasis('amount');
        runMonteCarlo();
      });
    }

    // 提領率快速按鈕與輸入事件
    if (dom.inputWithdrawalRate) {
      dom.inputWithdrawalRate.addEventListener('input', () => {
        setWithdrawalBasis('rate');
        updateWithdrawalRateDesc();
        runMonteCarlo();
      });
    }

    document.querySelectorAll('.btn-quick-withdraw-rate').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.dataset.val);
        if (dom.inputWithdrawalRate) dom.inputWithdrawalRate.value = val;
        setWithdrawalBasis('rate');
        updateWithdrawalRateDesc();
        document.querySelectorAll('.btn-quick-withdraw-rate').forEach(b => {
          b.className = 'btn-quick-withdraw-rate px-2.5 py-1 text-xs bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold transition';
        });
        btn.className = 'btn-quick-withdraw-rate px-2.5 py-1 text-xs bg-purple-600 text-white rounded-lg font-bold transition';
        runMonteCarlo();
      });
    });

    // 提領金額快速按鈕與輸入事件
    if (dom.inputWithdrawalCustomAmount) {
      dom.inputWithdrawalCustomAmount.addEventListener('input', () => {
        setWithdrawalBasis('amount');
        runMonteCarlo();
      });
    }

    if (dom.selectWithdrawalAmountFreq) {
      dom.selectWithdrawalAmountFreq.addEventListener('change', () => {
        setWithdrawalBasis('amount');
        runMonteCarlo();
      });
    }

    document.querySelectorAll('.btn-quick-withdraw-amount').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.dataset.val);
        const freq = btn.dataset.freq || 'monthly';
        if (dom.inputWithdrawalCustomAmount) dom.inputWithdrawalCustomAmount.value = val;
        if (dom.selectWithdrawalAmountFreq) dom.selectWithdrawalAmountFreq.value = freq;
        setWithdrawalBasis('amount');
        document.querySelectorAll('.btn-quick-withdraw-amount').forEach(b => {
          b.className = 'btn-quick-withdraw-amount px-2.5 py-1 text-xs bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold transition';
        });
        btn.className = 'btn-quick-withdraw-amount px-2.5 py-1 text-xs bg-purple-600 text-white rounded-lg font-bold transition';
        runMonteCarlo();
      });
    });

    if (dom.selectWithdrawalType) {
      dom.selectWithdrawalType.addEventListener('change', () => {
        updateWithdrawalStrategyExplanation();
        runMonteCarlo();
      });
    }
    if (dom.checkWithdrawalInflation) {
      dom.checkWithdrawalInflation.addEventListener('change', runMonteCarlo);
    }
    if (dom.inputMinBalance) {
      dom.inputMinBalance.addEventListener('input', runMonteCarlo);
    }

    // 多時期排程新增按鈕
    dom.btnAddStageContrib.addEventListener('click', () => addCashflowStage('periodic_contribution'));
    dom.btnAddStageLumpin.addEventListener('click', () => addCashflowStage('lump_sum_in'));
    dom.btnAddStageWithdraw.addEventListener('click', () => addCashflowStage('periodic_withdrawal'));
    dom.btnLoadTwStagePreset.addEventListener('click', loadStagePreset);

    // 新增資產與配平按鈕
    dom.btnAddAsset.addEventListener('click', addCustomAsset);
    dom.btnAutoBalance.addEventListener('click', autoBalanceWeights);

    // 立即執行模擬按鈕 (使用者主動點擊，觸發動態抽樣反饋)
    dom.btnRunSimulation.addEventListener('click', () => {
      runMonteCarlo(true);
    });

    // 隨機路徑開關 (點選時即時重繪圖表與更新白話解說)
    dom.checkShowPaths.addEventListener('change', () => {
      updateSamplePathsExplanation();
      if (state.lastResults) {
        renderTrajectoryChart(state.lastResults);
      }
    });

    // 結果 5 大分頁切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('border-blue-600', 'text-blue-600');
          b.classList.add('border-transparent', 'text-slate-500');
        });
        btn.classList.add('border-blue-600', 'text-blue-600');
        btn.classList.remove('border-transparent', 'text-slate-500');

        const tabId = btn.dataset.tab;
        ['panel-tab-trajectories', 'panel-tab-survival', 'panel-tab-performance', 'panel-tab-histogram', 'panel-tab-table'].forEach(pId => {
          const el = document.getElementById(pId);
          if (el) el.classList.add('hidden');
        });

        const activePanel = document.getElementById(`panel-${tabId}`);
        if (activePanel) activePanel.classList.remove('hidden');

        if (tabId === 'tab-survival' && state.survivalChart) {
          state.survivalChart.resize();
        } else if (tabId === 'tab-trajectories' && state.trajectoryChart) {
          state.trajectoryChart.resize();
        } else if (tabId === 'tab-histogram' && state.histogramChart) {
          state.histogramChart.resize();
        }
      });
    });

    // 匯出 CSV 與列印
    dom.btnExportCsv.addEventListener('click', handleExportCSV);
    dom.btnTableDownloadCsv.addEventListener('click', handleExportCSV);
    if (dom.btnPerfDownloadCsv) {
      dom.btnPerfDownloadCsv.addEventListener('click', handleExportCSV);
    }
    dom.btnPrintReport.addEventListener('click', () => ExportUtils.printReport());

    // 手機版浮動底部快速導航
    const btnMobParams = document.getElementById('btn-mobile-scroll-params');
    if (btnMobParams) {
      btnMobParams.addEventListener('click', () => {
        const el = document.getElementById('section-params');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    const btnMobResults = document.getElementById('btn-mobile-scroll-results');
    if (btnMobResults) {
      btnMobResults.addEventListener('click', () => {
        const el = document.getElementById('section-results');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    const btnMobRun = document.getElementById('btn-mobile-run');
    if (btnMobRun) {
      btnMobRun.addEventListener('click', () => {
        runMonteCarlo(true);
        const el = document.getElementById('section-results');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function handleSavePortfolio() {
    const defaultName = `自訂配置 (${new Date().toLocaleDateString('zh-TW')})`;
    const name = prompt('請輸入要儲存的投資組合名稱：', defaultName);
    if (!name || name.trim() === '') return;

    const customList = getSavedPortfolios();
    const newId = 'pf_' + Date.now();
    customList.push({
      id: newId,
      name: name.trim(),
      savedAt: new Date().toLocaleDateString('zh-TW'),
      assets: JSON.parse(JSON.stringify(state.assets))
    });

    try {
      localStorage.setItem('tw_saved_portfolios', JSON.stringify(customList));
      initPresetSelector();
      dom.presetSelector.value = `custom_${newId}`;
      dom.presetDesc.textContent = `已載入您儲存的組合：${name.trim()}`;
      alert(`🎉 成功儲存投資組合「${name.trim()}」！未來可隨時於上方範本選單載入。`);
    } catch (e) {
      alert('儲存失敗：' + e.message);
    }
  }

  function setCurrency(curr) {
    state.currency = curr;
    if (curr === 'TWD') {
      dom.btnCurrTwd.classList.add('bg-white', 'text-blue-600', 'shadow-xs');
      dom.btnCurrTwd.classList.remove('text-slate-600');
      dom.btnCurrUsd.classList.remove('bg-white', 'text-blue-600', 'shadow-xs');
      dom.btnCurrUsd.classList.add('text-slate-600');
      document.getElementById('curr-prefix-1').textContent = 'NT$';
      document.getElementById('curr-prefix-2').textContent = 'NT$';
      document.getElementById('curr-prefix-3').textContent = 'NT$';
    } else {
      dom.btnCurrUsd.classList.add('bg-white', 'text-blue-600', 'shadow-xs');
      dom.btnCurrUsd.classList.remove('text-slate-600');
      dom.btnCurrTwd.classList.remove('bg-white', 'text-blue-600', 'shadow-xs');
      dom.btnCurrTwd.classList.add('text-slate-600');
      document.getElementById('curr-prefix-1').textContent = 'USD $';
      document.getElementById('curr-prefix-2').textContent = 'USD $';
      document.getElementById('curr-prefix-3').textContent = 'USD $';
    }
    updateAmountDisplay();
    renderCashflowStages();
    if (state.lastResults) {
      updateUIWithResults(state.lastResults);
    }
  }

  function setInflationDisplayMode(isReal) {
    state.adjustForInflation = isReal;
    if (isReal) {
      dom.toggleReal.className = 'px-4 py-1.5 rounded-lg bg-blue-500 text-white font-bold transition-all shadow-sm';
      dom.toggleNominal.className = 'px-4 py-1.5 rounded-lg text-slate-300 hover:text-white font-semibold transition-all';
      dom.inflationBannerText.textContent = '目前處於「實質購買力 (扣除通膨)」模式，所有金額已換算為今日貨幣價值。';
      dom.chartTitleMode.textContent = '[實質購買力]';
      dom.kpiP50Sub.textContent = '實質購買力 (已扣通膨)';
    } else {
      dom.toggleNominal.className = 'px-4 py-1.5 rounded-lg bg-blue-500 text-white font-bold transition-all shadow-sm';
      dom.toggleReal.className = 'px-4 py-1.5 rounded-lg text-slate-300 hover:text-white font-semibold transition-all';
      dom.inflationBannerText.textContent = '目前處於「名目金額 (未扣通膨)」模式，顯示未來未經物價折現之帳面金額。';
      dom.chartTitleMode.textContent = '[名目金額]';
      dom.kpiP50Sub.textContent = '名目帳面金額 (未扣通膨)';
    }
    runMonteCarlo();
  }

  function setCashflowPlannerMode(mode) {
    state.cashflowPlannerMode = mode;
    if (mode === 'simple') {
      dom.btnModeSimple.className = 'px-3 py-1.5 rounded-lg bg-white text-blue-600 shadow-xs font-bold';
      dom.btnModeAdvanced.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800';
      dom.simpleCashflowContainer.classList.remove('hidden');
      dom.advancedCashflowContainer.classList.add('hidden');
    } else {
      dom.btnModeAdvanced.className = 'px-3 py-1.5 rounded-lg bg-white text-blue-600 shadow-xs font-bold';
      dom.btnModeSimple.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800';
      dom.advancedCashflowContainer.classList.remove('hidden');
      dom.simpleCashflowContainer.classList.add('hidden');
    }
  }

  function setWithdrawalBasis(basis) {
    state.withdrawalBasis = basis;
    if (basis === 'rate') {
      if (dom.btnWithdrawBasisRate) dom.btnWithdrawBasisRate.className = 'py-1.5 px-2 rounded-lg bg-white text-purple-700 shadow-xs font-extrabold transition';
      if (dom.btnWithdrawBasisAmount) dom.btnWithdrawBasisAmount.className = 'py-1.5 px-2 rounded-lg text-slate-600 hover:text-slate-900 transition';
      if (dom.boxWithdrawRate) dom.boxWithdrawRate.classList.remove('hidden');
      if (dom.boxWithdrawAmount) dom.boxWithdrawAmount.classList.add('hidden');
    } else {
      if (dom.btnWithdrawBasisAmount) dom.btnWithdrawBasisAmount.className = 'py-1.5 px-2 rounded-lg bg-white text-purple-700 shadow-xs font-extrabold transition';
      if (dom.btnWithdrawBasisRate) dom.btnWithdrawBasisRate.className = 'py-1.5 px-2 rounded-lg text-slate-600 hover:text-slate-900 transition';
      if (dom.boxWithdrawAmount) dom.boxWithdrawAmount.classList.remove('hidden');
      if (dom.boxWithdrawRate) dom.boxWithdrawRate.classList.add('hidden');
      updateWithdrawalAmountDisplay();
    }
    updateWithdrawalStrategyExplanation();
  }

  function setRetirementStartYear(year, updateInput = true) {
    const totalYears = parseInt(dom.inputYears.value) || 30;
    
    // 如果大於 totalYears 視為 999 (全期純累積不提領)
    if (year > totalYears && year !== 999) {
      year = 999;
    }

    state.retirementStartYear = year;

    if (dom.inputRetirementYear) {
      dom.inputRetirementYear.max = totalYears + 1;
      dom.inputRetirementYear.value = year === 999 ? (totalYears + 1) : year;
    }
    if (updateInput && dom.inputRetirementYearNumber) {
      dom.inputRetirementYearNumber.value = year === 999 ? (totalYears + 1) : year;
    }

    // 更新生命週期文字標籤與時間軸預覽
    if (year === 1) {
      // 立即退休
      if (dom.lifecycleBadge) dom.lifecycleBadge.textContent = '第 1 年立即退休';
      if (dom.lifecycleTimelinePreview) {
        dom.lifecycleTimelinePreview.innerHTML = `🏖️ <strong>第 1 ~ ${totalYears} 年</strong>：全期退休提領 (立即 FIRE)`;
      }
      if (dom.accumulationFields) dom.accumulationFields.classList.add('opacity-40', 'pointer-events-none');
      if (dom.withdrawalFields) dom.withdrawalFields.classList.remove('opacity-40', 'pointer-events-none');
      if (dom.accumulationPeriodText) dom.accumulationPeriodText.textContent = '無累積期 (立即退休)';
      if (dom.withdrawalPeriodText) dom.withdrawalPeriodText.textContent = `第 1 ~ ${totalYears} 年`;
    } else if (year >= 999 || year > totalYears) {
      // 全期純累積
      if (dom.lifecycleBadge) dom.lifecycleBadge.textContent = '全期累積 (不提領)';
      if (dom.lifecycleTimelinePreview) {
        dom.lifecycleTimelinePreview.innerHTML = `🌱 <strong>第 1 ~ ${totalYears} 年</strong>：全期定期定額資產累積 (不提領)`;
      }
      if (dom.accumulationFields) dom.accumulationFields.classList.remove('opacity-40', 'pointer-events-none');
      if (dom.withdrawalFields) dom.withdrawalFields.classList.add('opacity-40', 'pointer-events-none');
      if (dom.accumulationPeriodText) dom.accumulationPeriodText.textContent = `第 1 ~ ${totalYears} 年`;
      if (dom.withdrawalPeriodText) dom.withdrawalPeriodText.textContent = '無提領期 (全期累積)';
    } else {
      // 兩階段生命週期
      const accumEnd = year - 1;
      if (dom.lifecycleBadge) dom.lifecycleBadge.textContent = `第 ${year} 年開始退休`;
      if (dom.lifecycleTimelinePreview) {
        dom.lifecycleTimelinePreview.innerHTML = `🌱 <strong>第 1 ~ ${accumEnd} 年</strong>：定期定額累積 ➡️ 🏖️ <strong>第 ${year} ~ ${totalYears} 年</strong>：退休提領期`;
      }
      if (dom.accumulationFields) dom.accumulationFields.classList.remove('opacity-40', 'pointer-events-none');
      if (dom.withdrawalFields) dom.withdrawalFields.classList.remove('opacity-40', 'pointer-events-none');
      if (dom.accumulationPeriodText) dom.accumulationPeriodText.textContent = `第 1 ~ ${accumEnd} 年`;
      if (dom.withdrawalPeriodText) dom.withdrawalPeriodText.textContent = `第 ${year} ~ ${totalYears} 年`;
    }

    // 更新快捷按鈕高亮
    document.querySelectorAll('.btn-quick-retire').forEach(btn => {
      const bVal = parseInt(btn.dataset.val);
      if (bVal === year || (bVal === 999 && (year === 999 || year > totalYears))) {
        btn.className = 'btn-quick-retire px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg font-black transition border border-indigo-700 shadow-2xs';
      } else {
        btn.className = 'btn-quick-retire px-2 py-1 text-xs bg-white hover:bg-indigo-100 text-indigo-800 rounded-lg font-bold border border-indigo-200 transition';
      }
    });

    updateWithdrawalRateDisplay();
    updateWithdrawalStrategyExplanation();
  }

  function setSimulationYears(years, updateInput = true) {
    years = Math.max(1, Math.min(60, parseInt(years) || 30));
    dom.inputYears.value = years;
    if (updateInput && dom.inputYearsNumber) {
      dom.inputYearsNumber.value = years;
    }
    if (dom.yearsDisplay) {
      dom.yearsDisplay.textContent = `${years} 年`;
    }
    if (dom.infYearsText) {
      dom.infYearsText.textContent = years;
    }

    document.querySelectorAll('.btn-quick-years').forEach(btn => {
      if (parseInt(btn.dataset.val) === years) {
        btn.className = 'btn-quick-years px-2.5 py-1 text-xs bg-blue-100 text-blue-800 rounded-lg font-black transition border border-blue-200 shadow-2xs';
      } else {
        btn.className = 'btn-quick-years px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg font-bold transition';
      }
    });

    // 自動調整退休年份的最大值與時間軸
    setRetirementStartYear(state.retirementStartYear);

    updateInflationIndicator();
  }

  function updateAmountDisplay() {
    const val = parseFloat(dom.inputInitialAmount.value) || 0;
    dom.initialAmountDisplay.textContent = formatCurrencyShort(val) + (state.currency === 'TWD' ? ' 元' : ' USD');
  }

  function updateInflationIndicator() {
    const years = parseFloat(dom.inputYears.value) || 30;
    const isBootstrap = dom.selectInflationModel.value === 'bootstrap';
    
    // 計算歷史真實 CPI 平均
    const cpiArr = HISTORICAL_DATA.returns.tw_cpi || [];
    const avgCpi = cpiArr.length > 0 ? (cpiArr.reduce((a, b) => a + b, 0) / cpiArr.length) : 0.0126;
    
    const rate = isBootstrap ? avgCpi : ((parseFloat(dom.inputInflationRate.value) || 2.0) / 100);
    const factor = Math.pow(1 + rate, years);
    const realVal = (100 / factor).toFixed(1);
    const lossPct = ((1 - 1 / factor) * 100).toFixed(1);

    dom.infPurchasingPower.textContent = `${realVal} 萬元`;
    dom.infLossPct.textContent = `折損約 ${lossPct}%` + (isBootstrap ? ' (依歷史均值)' : '');
  }

  function updateInflationExplanation() {
    if (!dom.inflationExplanationBox) return;
    const isBootstrap = dom.selectInflationModel.value === 'bootstrap';
    const cpiArr = HISTORICAL_DATA.returns.tw_cpi || [];
    const avgCpi = ((cpiArr.reduce((a, b) => a + b, 0) / (cpiArr.length || 1)) * 100).toFixed(2);
    const minCpi = (Math.min(...cpiArr) * 100).toFixed(1);
    const maxCpi = (Math.max(...cpiArr) * 100).toFixed(1);

    if (dom.constantInflationBox) {
      dom.constantInflationBox.classList.toggle('hidden', isBootstrap);
    }
    if (dom.bootstrapInflationBox) {
      dom.bootstrapInflationBox.classList.toggle('hidden', !isBootstrap);
    }
    if (dom.bootstrapCpiAvg) {
      dom.bootstrapCpiAvg.textContent = `${avgCpi}%`;
    }

    if (!isBootstrap) {
      const fixedRate = parseFloat(dom.inputInflationRate.value) || 2.0;
      dom.inflationExplanationBox.className = 'p-2.5 rounded-xl border bg-slate-100/90 border-slate-200 text-xs text-slate-800 leading-relaxed';
      dom.inflationExplanationBox.innerHTML = `
        <div>📘 <strong>【固定年通膨率】</strong>：每年固定依設定的 <strong>${fixedRate}%</strong> 計算物價膨脹與實質購買力折現。</div>
      `;
    } else {
      dom.inflationExplanationBox.className = 'p-2.5 rounded-xl border bg-amber-50/90 border-amber-200 text-xs text-amber-950 leading-relaxed space-y-1.5';
      dom.inflationExplanationBox.innerHTML = `
        <div class="font-bold text-amber-900 flex items-center justify-between">
          <span>🎲 <strong>【歷史真實 CPI 抽樣】</strong> 統計 (2000~2025 共 26 年)：</span>
          <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black">歷史平均: ${avgCpi}%</span>
        </div>
        <div class="text-amber-800 leading-relaxed">
          • <strong>計算方式</strong>：模擬中每一年隨機抽取台灣真實 26 年 CPI 之一（最低 <strong>${minCpi}%</strong>、最高 <strong>${maxCpi}%</strong>，平均 <strong>${avgCpi}%</strong>）。<br>
          • <strong>股債通膨聯動</strong>：若模擬模型選用「歷史真實抽樣」，通膨率會與當年度市場大盤<strong>同步聯動</strong>（例如抽到 2008 年股災時，通膨自動對齊 2008 年真實 CPI 3.5%）。
        </div>
      `;
    }
  }

  function updateModelExplanation() {
    if (!dom.modelExplanationBox) return;
    const model = dom.selectModel.value;
    if (model === 'parametric') {
      dom.modelExplanationBox.className = 'p-3 rounded-xl border bg-blue-50/80 border-blue-200 text-xs text-blue-950 leading-relaxed';
      dom.modelExplanationBox.innerHTML = `
        <div class="flex items-start gap-2">
          <span class="text-base shrink-0">📘</span>
          <div>
            <div class="font-black text-blue-800 mb-0.5">【參數化常態 (Cholesky 分解)】白話解說：</div>
            由電腦依據各資產的<strong>「預期平均報酬率」</strong>與<strong>「波動風險 (標準差)」</strong>，並考慮<strong>股債彼此連動性</strong>，以數學常態分佈公式隨機推演未來數千種平滑的市場情境，適合評估長期理論上的機率分佈。
          </div>
        </div>
      `;
    } else {
      dom.modelExplanationBox.className = 'p-3 rounded-xl border bg-amber-50/90 border-amber-200 text-xs text-amber-950 leading-relaxed';
      dom.modelExplanationBox.innerHTML = `
        <div class="flex items-start gap-2">
          <span class="text-base shrink-0">🎲</span>
          <div>
            <div class="font-black text-amber-800 mb-0.5">【歷史真實抽樣 (Bootstrap)】白話解說：</div>
            就像<strong>「摸彩箱抽球」</strong>！電腦直接從 2000~2025 年台灣與全球市場<strong>真實發生過的 26 年數據</strong>（包含科技泡沫、金融海嘯、QE大牛市）隨機抽籤組合，<strong>完整保留真實歷史中黑天鵝股災與通膨的極端衝擊</strong>！
          </div>
        </div>
      `;
    }
  }

  function updateFeeSequenceExplanation() {
    if (!dom.feeSequenceExplanationBox) return;
    const fee = parseFloat(dom.selectFeeStructure.value) || 0.0;
    const seq = dom.selectSequenceRisk.value;

    let feeText = '';
    if (fee === 0) {
      feeText = '💰 <strong>【無內扣費用 (0.0%)】</strong>：不考慮任何基金管理費，純資產指數理論報酬。';
    } else if (fee <= 0.0005) {
      feeText = '💰 <strong>【美股指數 ETF (~0.05%)】</strong>：如 VOO / VT / BNDW，全球極低成本指數化投資，每年僅扣萬分之五，長期複利損耗微乎其微。';
    } else if (fee <= 0.0035) {
      feeText = '💰 <strong>【台股 0050/高股息 (~0.35%)】</strong>：如 0050 / 0056 / 00878，台灣本土 ETF 常見總內扣管理費，由淨值每日自動扣減。';
    } else if (fee <= 0.008) {
      feeText = '💰 <strong>【主動型/海外債券 (~0.8%)】</strong>：主動選股或海外固定收益債券基金之經理與保管費，每年扣除 0.8%。';
    } else {
      feeText = '🚨 <strong>【共同基金/投資型保單 (~1.5%)】</strong>：傳統銀行銷售之共同基金或保險商品，每年內扣 1.5% 在 30 年複利下會吃掉高達 30%~40% 的總資產！';
    }

    let seqText = '';
    if (seq === 'none') {
      seqText = '🛡️ <strong>【報酬順序：無調整】</strong>：按照正常市場機率進行各年份隨機抽樣。';
    } else {
      seqText = '🚨 <strong>【報酬順序：初期逆風壓力測試】</strong>：模擬<strong>「剛退休前 2 年就遭遇像 2008 金融海嘯或 2000 科技崩盤般的世紀股災」</strong>！在暴跌時持續提領生活費，本金將承受巨大傷害，最能檢驗提領策略的抗災極限！';
    }

    dom.feeSequenceExplanationBox.className = seq === 'stress_early' 
      ? 'p-3 rounded-xl border bg-rose-50/90 border-rose-200 text-xs text-rose-950 leading-relaxed space-y-1.5'
      : 'p-3 rounded-xl border bg-slate-100/90 border-slate-200 text-xs text-slate-800 leading-relaxed space-y-1.5';

    dom.feeSequenceExplanationBox.innerHTML = `
      <div>${feeText}</div>
      <div class="pt-1.5 border-t border-slate-200/60">${seqText}</div>
    `;
  }

  function updateSamplePathsExplanation() {
    if (!dom.samplePathsExplanationBox) return;
    const isShown = dom.checkShowPaths.checked;
    if (isShown) {
      dom.samplePathsExplanationBox.className = 'p-2.5 rounded-xl border bg-indigo-50/80 border-indigo-200 text-xs text-indigo-950 leading-relaxed flex items-start gap-2 transition-all';
      dom.samplePathsExplanationBox.innerHTML = `
        <span class="text-base shrink-0">🎲</span>
        <div>
          <div class="font-black text-indigo-900 mb-0.5">【抽樣路徑（30 條）已開啟】白話解說：</div>
          畫面上 <strong>30 條彩色細線</strong> 代表隨機抽出的 30 位投資人真實經歷的人生走勢，完整呈現市場每年大漲大跌的真實起伏震盪感；底下的粗線與彩色區間則為統計上的<strong>機率百分位數 (10%~90%)</strong>。
        </div>
      `;
    } else {
      dom.samplePathsExplanationBox.className = 'p-2.5 rounded-xl border bg-slate-100/90 border-slate-200 text-xs text-slate-800 leading-relaxed flex items-start gap-2 transition-all';
      dom.samplePathsExplanationBox.innerHTML = `
        <span class="text-base shrink-0">📊</span>
        <div>
          <div class="font-black text-slate-900 mb-0.5">【純統計機率區間模式】白話解說：</div>
          已隱藏個別隨機波動路徑，圖表僅保留平滑的 <strong>10th（悲觀）、25th、50th（中位數）、75th、90th（樂觀）</strong> 百分位數機率區間帶，方便一目了然觀察整體長期資產落點。
        </div>
      `;
    }
  }

  function updateWithdrawalRateDesc() {
    if (!dom.withdrawalRateDesc || !dom.inputWithdrawalRate) return;
    const r = parseFloat(dom.inputWithdrawalRate.value) || 4.0;
    if (r <= 3.0) {
      dom.withdrawalRateDesc.textContent = '超保守提領 (存活率近 100%)';
    } else if (r <= 3.8) {
      dom.withdrawalRateDesc.textContent = '穩健提領 (高存活率)';
    } else if (r <= 4.2) {
      dom.withdrawalRateDesc.textContent = '經典 4% 提領法則 (Trinity Study)';
    } else {
      dom.withdrawalRateDesc.textContent = '積極高額提領 (需注意序列風險)';
    }
    updateWithdrawalRateDisplay();
  }

  function updateWithdrawalRateDisplay() {
    if (!dom.inputWithdrawalRate) return;
    const ratePct = parseFloat(dom.inputWithdrawalRate.value) || 4.0;
    const rate = ratePct / 100;
    const initialInv = parseFloat(dom.inputInitialAmount?.value) || 0;
    const curr = state.currency === 'TWD' ? 'NT$' : '$';
    const retireYear = state.retirementStartYear ?? 21;
    const totalYears = parseInt(dom.inputYears?.value) || 30;

    let baseAsset = initialInv;
    let timingDescription = '';

    if (retireYear === 1) {
      // 立即退休模式
      baseAsset = initialInv;
      timingDescription = `💡 依初始本金 <strong>${curr} ${formatCurrencyShort(initialInv)}</strong> × ${ratePct}% 換算（第 1 年起立即提領）。`;
    } else if (retireYear >= 999 || retireYear > totalYears) {
      // 全期累積不提領模式
      baseAsset = initialInv;
      timingDescription = `💡 目前為「全期純累積」模式；若以當前本金 <strong>${curr} ${formatCurrencyShort(initialInv)}</strong> × ${ratePct}% 試算如下。`;
    } else {
      // 兩階段生命週期模式 (第 1 ~ retireYear - 1 年累積 ➡️ 第 retireYear 年退休)
      if (state.lastResults && state.lastResults.yearlyTable) {
        const retireRow = state.lastResults.yearlyTable.find(r => r.year === retireYear) 
                       || state.lastResults.yearlyTable.find(r => r.year === retireYear - 1);
        if (retireRow && retireRow.realBalance > 0) {
          baseAsset = retireRow.realBalance;
        }
      }
      timingDescription = `💡 經前 ${retireYear - 1} 年累積，預估第 ${retireYear} 年退休時中位數實質資產約 <strong>${curr} ${formatCurrencyShort(baseAsset)}</strong> × ${ratePct}%。`;
    }

    const annualAmt = Math.round(baseAsset * rate);
    const monthlyAmt = Math.round(annualAmt / 12);

    if (dom.withdrawRateAnnualDisplay) {
      dom.withdrawRateAnnualDisplay.textContent = `每年約 ${curr} ${formatCurrencyShort(annualAmt)}`;
    }
    if (dom.withdrawRateMonthlyDisplay) {
      dom.withdrawRateMonthlyDisplay.innerHTML = `
        <span>相當於每月生活費：</span>
        <span class="font-black text-purple-950">每月約 ${curr} ${formatCurrencyShort(monthlyAmt)} (${monthlyAmt.toLocaleString()} 元)</span>
      `;
    }
    if (dom.withdrawRateTimingNote) {
      dom.withdrawRateTimingNote.innerHTML = timingDescription;
    }
  }

  function updateWithdrawalAmountDisplay() {
    if (!dom.withdrawAmountAnnualDisplay || !dom.inputWithdrawalCustomAmount) return;
    const amt = parseFloat(dom.inputWithdrawalCustomAmount.value) || 0;
    const freq = dom.selectWithdrawalAmountFreq ? dom.selectWithdrawalAmountFreq.value : 'monthly';
    const annualAmt = freq === 'monthly' ? amt * 12 : amt;
    const curr = state.currency === 'TWD' ? 'NT$' : '$';
    dom.withdrawAmountAnnualDisplay.textContent = `每年約 ${curr} ${formatCurrencyShort(annualAmt)}`;
  }

  function updateWithdrawalStrategyExplanation() {
    if (!dom.selectWithdrawalType) return;
    const type = dom.selectWithdrawalType.value;
    const isAmountMode = state.withdrawalBasis === 'amount';
    const ratePct = parseFloat(dom.inputWithdrawalRate ? dom.inputWithdrawalRate.value : '4.0') || 4.0;
    const rate = ratePct / 100;
    const curr = state.currency === 'TWD' ? 'NT$' : '$';
    const initialInv = parseFloat(dom.inputInitialAmount?.value) || 0;
    const retireYear = state.retirementStartYear ?? 21;
    const totalYears = parseInt(dom.inputYears?.value) || 30;

    // 動態對齊下拉選單選項文字，避免「固定生活費」模式下出現讓人困惑的「4% 法則」字樣
    const optFixedAmount = dom.selectWithdrawalType.querySelector('option[value="fixed_amount"]');
    const optFixedPct = dom.selectWithdrawalType.querySelector('option[value="fixed_percentage"]');
    const optGK = dom.selectWithdrawalType.querySelector('option[value="guyton_klinger"]');
    const optFC = dom.selectWithdrawalType.querySelector('option[value="floor_ceiling"]');

    if (isAmountMode) {
      if (optFixedAmount) optFixedAmount.textContent = '固定金額提領 (每年依通膨調升金額，維持真實購買力)';
      if (optFixedPct) optFixedPct.textContent = '固定淨值比例 (每年依當時總資產等比例提領)';
      if (optGK) optGK.textContent = 'Guyton-Klinger 動態護欄 (大跌年生活費減領 10%、大漲年加領 10%)';
      if (optFC) optFC.textContent = '上下限彈性生活費 (每年生活費隨市場在 ±5% 區間微調)';
    } else {
      if (optFixedAmount) optFixedAmount.textContent = '固定實質金額 (經典 4% 法則 / 依通膨逐年調整)';
      if (optFixedPct) optFixedPct.textContent = '固定淨值比例 (每年按當時總資產提領固定 %)';
      if (optGK) optGK.textContent = 'Guyton-Klinger 動態護欄法則 (提領率偏高減領、偏低加領)';
      if (optFC) optFC.textContent = '上下限保護提領 (-5% ~ +5% 區間波動)';
    }

    if (!dom.withdrawalStrategyExplanationBox) return;

    let title = '';
    let body = '';

    if (isAmountMode) {
      const amt = parseFloat(dom.inputWithdrawalCustomAmount ? dom.inputWithdrawalCustomAmount.value : '50000') || 0;
      const freq = dom.selectWithdrawalAmountFreq ? dom.selectWithdrawalAmountFreq.value : 'monthly';
      const annualAmt = freq === 'monthly' ? amt * 12 : amt;
      const amtStr = `${curr} ${formatCurrencyShort(annualAmt)}`;

      switch (type) {
        case 'fixed_amount':
          title = '💰 【固定生活費提領】白話解說：';
          body = `每年以設定的 <strong>${amtStr}</strong> 為生活費基準。若勾選「隨通膨調升」，未來每年會自動根據物價上漲增加提領金額（例如通膨 2% 隔年提領約 ${curr} ${formatCurrencyShort(annualAmt * 1.02)}），確保日常生活品質完全不縮水！`;
          break;
        case 'fixed_percentage':
          title = '📊 【固定比例提領】白話解說：';
          body = `在退休第一年以 <strong>${amtStr}</strong> 佔當時總資產的比例為基準，之後每年按最新總資產等比例提領。牛市大賺時提領更多，熊市下跌時自動少領，資產絕不會提早耗盡，但每年生活費會有波動。`;
          break;
        case 'guyton_klinger':
          title = '🛡️ 【Guyton-Klinger 動態護欄】白話解說：';
          body = `平時每年提領 <strong>${amtStr}</strong>；但若遭遇極端大股災導致本金大幅縮水時，系統會自動<strong>啟動護欄減領 10%</strong> 守護本金；當牛市大暴賺時，則自動<strong>加領 10%</strong> 享受生活。`;
          break;
        case 'floor_ceiling':
          title = '⚖️ 【上下限彈性保護】白話解說：';
          body = `生活費以 <strong>${amtStr}</strong> 為核心基準，每年提領金額上下浮動限制在 <strong>-5% ~ +5%</strong> 的舒適安全區間內。`;
          break;
      }
    } else {
      let baseAsset = initialInv;
      if (retireYear > 1 && retireYear <= totalYears && state.lastResults && state.lastResults.yearlyTable) {
        const retireRow = state.lastResults.yearlyTable.find(r => r.year === retireYear);
        if (retireRow && retireRow.realBalance > 0) baseAsset = retireRow.realBalance;
      }
      const annualAmt = Math.round(baseAsset * rate);
      const monthlyAmt = Math.round(annualAmt / 12);
      const amtHighlight = `每年約 <strong>${curr} ${formatCurrencyShort(annualAmt)}</strong>（每月約 <strong>${curr} ${formatCurrencyShort(monthlyAmt)}</strong> · ${monthlyAmt.toLocaleString()} 元）`;

      switch (type) {
        case 'fixed_amount':
          title = '📘 【經典 4% 提領法則 (Trinity Study)】白話解說：';
          body = `在退休第一年以當時總資產的 <strong>${ratePct}%</strong> 計算出第一筆生活費（${amtHighlight}），之後每年<strong>不再看股市臉色</strong>，僅根據「通膨率」逐年調升提領金額，是全球退休規劃最權威的基準法則。`;
          break;
        case 'fixed_percentage':
          title = '📊 【固定淨值比例提領】白話解說：';
          body = `每年固定按當年底最新總資產的 <strong>${ratePct}%</strong> 提領生活費（首年約 ${amtHighlight}）。股市大漲那年領較多，股市大跌那年領較少，理論上資產永遠花不完，但退休生活費每年會隨市場波動。`;
          break;
        case 'guyton_klinger':
          title = '🛡️ 【Guyton-Klinger 動態護欄法則】白話解說：';
          body = `以 <strong>${ratePct}%</strong>（首年約 ${amtHighlight}）為初始基準，當市場大跌導致提領率飆升超過 1.2 倍時，自動<strong>減領 10%</strong> 保護本金；當大牛市使提領率低於 0.8 倍時，自動<strong>加領 10%</strong> 犒賞自己。`;
          break;
        case 'floor_ceiling':
          title = '⚖️ 【上下限保護提領 (-5% ~ +5%)】白話解說：';
          body = `以 <strong>${ratePct}%</strong>（首年約 ${amtHighlight}）為基準，每年提領金額與前一年相比，波動幅度限制在 <strong>最少不低於 95%、最多不超過 105%</strong> 的平穩區間。`;
          break;
      }
    }

    dom.withdrawalStrategyExplanationBox.className = 'p-2.5 rounded-xl border bg-purple-50/90 border-purple-200 text-xs text-purple-950 leading-relaxed';
    dom.withdrawalStrategyExplanationBox.innerHTML = `
      <div class="font-bold text-purple-900 mb-0.5">${title}</div>
      <div class="text-purple-800">${body}</div>
    `;
  }

  // ================= Portfolio Model 渲染 (左側清單 + 右側圓環圖) =================

  function renderPortfolioModel() {
    if (!dom.portfolioModelTableBody) return;
    dom.portfolioModelTableBody.innerHTML = '';

    const totalWeight = state.assets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0) || 1;
    const labels = [];
    const data = [];
    const colors = [];

    state.assets.forEach(asset => {
      const meta = HISTORICAL_DATA.assetMeta[asset.key] || { name: asset.key, color: '#3b82f6' };
      const normalizedPct = ((parseFloat(asset.weight) || 0) / totalWeight) * 100;
      
      labels.push(meta.name || asset.key);
      data.push(normalizedPct);
      colors.push(meta.color || '#3b82f6');

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition';
      tr.innerHTML = `
        <td class="py-2.5 px-3 flex items-center gap-2 text-slate-800 font-bold">
          <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${meta.color || '#3b82f6'}"></span>
          <span>${meta.name}</span>
        </td>
        <td class="py-2.5 px-3 text-right font-black text-slate-900">${normalizedPct.toFixed(2)}%</td>
      `;
      dom.portfolioModelTableBody.appendChild(tr);
    });

    // 渲染 / 更新 Doughnut Chart
    const canvas = document.getElementById('canvas-portfolio-doughnut');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (state.doughnutChart) {
      state.doughnutChart.destroy();
    }

    state.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            display: false // 使用左側表格作為圖例
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`
            }
          }
        }
      }
    });
  }

  // ================= 多時期現金流排程管理 =================

  function renderCashflowStages() {
    dom.cashflowStagesList.innerHTML = '';
    const totalYears = parseInt(dom.inputYears.value) || 30;
    const currSymbol = state.currency === 'TWD' ? 'NT$' : '$';

    if (state.cashflowStages.length === 0) {
      dom.cashflowStagesList.innerHTML = `
        <div class="p-4 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          目前無任何額外現金流排程（僅依初始本金自然成長）
        </div>
      `;
      return;
    }

    state.cashflowStages.forEach((stage, idx) => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3';

      if (stage.type === 'periodic_contribution') {
        card.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-sm font-black text-emerald-700 flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-4 h-4"></i>
              定期定額階段 ${idx + 1}
            </span>
            <button type="button" class="btn-remove-stage text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition" data-idx="${idx}">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="grid grid-cols-12 gap-3 text-xs sm:text-sm">
            <div class="col-span-5">
              <label class="text-slate-600 font-bold block mb-1">年期區間 (第X年~第Y年)</label>
              <div class="flex items-center gap-1.5">
                <input type="number" min="1" max="${totalYears}" value="${stage.startYear}" class="stage-field w-14 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900" data-idx="${idx}" data-prop="startYear">
                <span class="font-bold">~</span>
                <input type="number" min="1" max="${totalYears}" value="${stage.endYear}" class="stage-field w-14 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900" data-idx="${idx}" data-prop="endYear">
                <span class="font-bold">年</span>
              </div>
            </div>
            <div class="col-span-4">
              <label class="text-slate-600 font-bold block mb-1">投入金額 (${currSymbol})</label>
              <input type="number" step="1000" min="0" value="${stage.amount}" class="stage-field w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900" data-idx="${idx}" data-prop="amount">
            </div>
            <div class="col-span-3">
              <label class="text-slate-600 font-bold block mb-1">頻率</label>
              <select class="stage-field w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900" data-idx="${idx}" data-prop="frequency">
                <option value="monthly" ${stage.frequency === 'monthly' ? 'selected' : ''}>每月</option>
                <option value="annual" ${stage.frequency === 'annual' ? 'selected' : ''}>每年</option>
              </select>
            </div>
          </div>
        `;
      } else if (stage.type === 'lump_sum_in') {
        card.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-sm font-black text-blue-700 flex items-center gap-1.5">
              <i data-lucide="coins" class="w-4 h-4"></i>
              單筆投入/加碼
            </span>
            <button type="button" class="btn-remove-stage text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition" data-idx="${idx}">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="grid grid-cols-12 gap-3 text-xs sm:text-sm">
            <div class="col-span-5">
              <label class="text-slate-600 font-bold block mb-1">在第幾年單筆注入</label>
              <div class="flex items-center gap-1.5">
                <span class="font-bold">第</span>
                <input type="number" min="1" max="${totalYears}" value="${stage.year}" class="stage-field w-16 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900" data-idx="${idx}" data-prop="year">
                <span class="font-bold">年</span>
              </div>
            </div>
            <div class="col-span-7">
              <label class="text-slate-600 font-bold block mb-1">單筆注入金額 (${currSymbol})</label>
              <input type="number" step="50000" min="0" value="${stage.amount}" class="stage-field w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900" data-idx="${idx}" data-prop="amount">
            </div>
          </div>
        `;
      } else if (stage.type === 'periodic_withdrawal') {
        card.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <span class="text-sm font-black text-purple-700 flex items-center gap-1.5">
              <i data-lucide="coffee" class="w-4 h-4"></i>
              退休提領階段 ${idx + 1}
            </span>
            <button type="button" class="btn-remove-stage text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition" data-idx="${idx}">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="grid grid-cols-12 gap-3 text-xs sm:text-sm">
            <div class="col-span-5">
              <label class="text-slate-600 font-bold block mb-1">提領年期區間</label>
              <div class="flex items-center gap-1.5">
                <input type="number" min="1" max="${totalYears}" value="${stage.startYear}" class="stage-field w-14 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900" data-idx="${idx}" data-prop="startYear">
                <span class="font-bold">~</span>
                <input type="number" min="1" max="${totalYears}" value="${stage.endYear}" class="stage-field w-14 p-1.5 border border-slate-300 rounded-lg text-center font-bold text-slate-900" data-idx="${idx}" data-prop="endYear">
                <span class="font-bold">年</span>
              </div>
            </div>
            <div class="col-span-4">
              <label class="text-slate-600 font-bold block mb-1">提領法則</label>
              <select class="stage-field w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900" data-idx="${idx}" data-prop="withdrawalType">
                <option value="fixed_amount" ${stage.withdrawalType === 'fixed_amount' ? 'selected' : ''}>4% 通膨調整</option>
                <option value="fixed_percentage" ${stage.withdrawalType === 'fixed_percentage' ? 'selected' : ''}>固定比例</option>
                <option value="guyton_klinger" ${stage.withdrawalType === 'guyton_klinger' ? 'selected' : ''}>護欄法則</option>
              </select>
            </div>
            <div class="col-span-3">
              <label class="text-slate-600 font-bold block mb-1">提領率 (%)</label>
              <input type="number" step="0.1" min="0.5" max="15" value="${(stage.rate * 100).toFixed(1)}" class="stage-field w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900" data-idx="${idx}" data-prop="rate">
            </div>
          </div>
        `;
      }

      dom.cashflowStagesList.appendChild(card);
    });

    lucide.createIcons();
    bindStageEvents();
  }

  function bindStageEvents() {
    document.querySelectorAll('.stage-field').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const prop = e.target.dataset.prop;
        let val = e.target.value;

        if (prop === 'rate') {
          val = (parseFloat(val) || 4.0) / 100;
        } else if (['startYear', 'endYear', 'year', 'amount'].includes(prop)) {
          val = parseFloat(val) || 0;
        }
        state.cashflowStages[idx][prop] = val;
      });
    });

    document.querySelectorAll('.btn-remove-stage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx);
        state.cashflowStages.splice(idx, 1);
        renderCashflowStages();
      });
    });
  }

  function addCashflowStage(type) {
    const totalYears = parseInt(dom.inputYears.value) || 30;
    if (type === 'periodic_contribution') {
      state.cashflowStages.push({
        id: 'stage_' + Date.now(),
        type: 'periodic_contribution',
        startYear: 1,
        endYear: Math.min(10, totalYears),
        amount: 20000,
        frequency: 'monthly',
        growthRate: 0.02
      });
    } else if (type === 'lump_sum_in') {
      state.cashflowStages.push({
        id: 'stage_' + Date.now(),
        type: 'lump_sum_in',
        year: Math.min(5, totalYears),
        amount: 500000
      });
    } else if (type === 'periodic_withdrawal') {
      state.cashflowStages.push({
        id: 'stage_' + Date.now(),
        type: 'periodic_withdrawal',
        startYear: Math.min(21, totalYears),
        endYear: totalYears,
        withdrawalType: 'fixed_amount',
        rate: 0.04,
        customAmount: 0,
        adjustInflation: true
      });
    }
    renderCashflowStages();
  }

  function loadStagePreset() {
    const totalYears = parseInt(dom.inputYears.value) || 30;
    state.cashflowStages = [
      {
        id: 'stage_p1',
        type: 'periodic_contribution',
        startYear: 1,
        endYear: Math.min(10, totalYears),
        amount: 30000,
        frequency: 'monthly',
        growthRate: 0.02
      },
      {
        id: 'stage_p2',
        type: 'lump_sum_in',
        year: Math.min(5, totalYears),
        amount: 1000000
      },
      {
        id: 'stage_p3',
        type: 'periodic_withdrawal',
        startYear: Math.min(20, totalYears),
        endYear: totalYears,
        withdrawalType: 'fixed_amount',
        rate: 0.04,
        customAmount: 0,
        adjustInflation: true
      }
    ];
    renderCashflowStages();
    runMonteCarlo();
  }

  // ================= 資產列表管理 =================

  function renderAssetRows() {
    dom.assetRowsContainer.innerHTML = '';
    state.assets.forEach((asset, idx) => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-slate-50/95 rounded-2xl border border-slate-200 shadow-2xs space-y-3';

      let optionsHtml = '';
      Object.keys(HISTORICAL_DATA.assetMeta).forEach(key => {
        const meta = HISTORICAL_DATA.assetMeta[key];
        optionsHtml += `<option value="${key}" ${key === asset.key ? 'selected' : ''}>${meta.name}</option>`;
      });

      card.innerHTML = `
        <!-- 第一行：資產選擇與說明標籤 (手機自動斷行) -->
        <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
          <div class="flex-1 min-w-[200px]">
            <select class="asset-key-select w-full bg-white border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 rounded-xl p-2 sm:p-2.5 focus:ring-blue-500 shadow-2xs" data-idx="${idx}">
              ${optionsHtml}
            </select>
          </div>
          <div class="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-slate-600 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
            <span>年化 ${(asset.expectedReturn * 100).toFixed(1)}%</span>
            <span>‧</span>
            <span>波動 ${(asset.stdev * 100).toFixed(1)}%</span>
          </div>
          ${state.assets.length > 1 ? `
            <button type="button" class="btn-remove-asset p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition shrink-0" data-idx="${idx}" title="移除此資產">
              <i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5"></i>
            </button>
          ` : ''}
        </div>

        <!-- 第二行：權重滑桿與權重數值輸入框 (手機縱向排列避免擁擠) -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200">
          <div class="flex items-center gap-2 flex-1">
            <span class="text-xs sm:text-sm font-extrabold text-slate-800 shrink-0">配置比例:</span>
            <input type="range" class="asset-weight-range w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" min="0" max="100" step="1" value="${asset.weight}" data-idx="${idx}">
          </div>

          <div class="flex items-center justify-end gap-1.5 shrink-0">
            <button type="button" class="btn-weight-adjust px-2.5 py-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition" data-idx="${idx}" data-delta="-5">-5%</button>
            <div class="flex items-center rounded-lg border border-blue-200 bg-blue-50/50 overflow-hidden w-20 sm:w-24">
              <input type="number" class="asset-weight-input w-full px-1.5 py-1 bg-transparent text-sm sm:text-base font-black text-blue-700 text-right focus:outline-none" min="0" max="100" step="1" value="${asset.weight}" data-idx="${idx}">
              <span class="px-1.5 text-xs font-black text-blue-500">%</span>
            </div>
            <button type="button" class="btn-weight-adjust px-2.5 py-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition" data-idx="${idx}" data-delta="5">+5%</button>
          </div>
        </div>
      `;

      dom.assetRowsContainer.appendChild(card);
    });

    lucide.createIcons();
    bindAssetRowEvents();
    updateTotalWeightBadge();
    renderPortfolioModel();
  }

  function bindAssetRowEvents() {
    document.querySelectorAll('.asset-key-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const newKey = e.target.value;
        const meta = HISTORICAL_DATA.assetMeta[newKey] || {};
        state.assets[idx].key = newKey;
        state.assets[idx].expectedReturn = meta.defaultReturn || 0.08;
        state.assets[idx].stdev = meta.defaultStDev || 0.18;
        renderAssetRows();
        renderPortfolioModel();
      });
    });

    document.querySelectorAll('.asset-weight-range').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const val = parseFloat(e.target.value) || 0;
        state.assets[idx].weight = val;
        const numInput = document.querySelector(`.asset-weight-input[data-idx="${idx}"]`);
        if (numInput) numInput.value = val;
        updateTotalWeightBadge();
        renderPortfolioModel();
      });
    });

    document.querySelectorAll('.asset-weight-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const val = parseFloat(e.target.value) || 0;
        state.assets[idx].weight = val;
        const rangeInput = document.querySelector(`.asset-weight-range[data-idx="${idx}"]`);
        if (rangeInput) rangeInput.value = val;
        updateTotalWeightBadge();
        renderPortfolioModel();
      });
    });

    document.querySelectorAll('.btn-weight-adjust').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const delta = parseInt(btn.dataset.delta);
        let newWeight = Math.max(0, Math.min(100, (state.assets[idx].weight || 0) + delta));
        state.assets[idx].weight = newWeight;
        const rangeInput = document.querySelector(`.asset-weight-range[data-idx="${idx}"]`);
        const numInput = document.querySelector(`.asset-weight-input[data-idx="${idx}"]`);
        if (rangeInput) rangeInput.value = newWeight;
        if (numInput) numInput.value = newWeight;
        updateTotalWeightBadge();
        renderPortfolioModel();
      });
    });

    document.querySelectorAll('.btn-remove-asset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx);
        if (state.assets.length > 1) {
          state.assets.splice(idx, 1);
          renderAssetRows();
          renderPortfolioModel();
        }
      });
    });
  }

  function addCustomAsset() {
    const keys = Object.keys(HISTORICAL_DATA.assetMeta);
    const unusedKey = keys.find(k => !state.assets.some(a => a.key === k)) || 'us_sp500';
    const meta = HISTORICAL_DATA.assetMeta[unusedKey];
    state.assets.push({
      key: unusedKey,
      weight: 10,
      expectedReturn: meta.defaultReturn || 0.08,
      stdev: meta.defaultStDev || 0.18
    });
    renderAssetRows();
    renderPortfolioModel();
  }

  function autoBalanceWeights() {
    const n = state.assets.length;
    if (n === 0) return;
    const baseWeight = Math.floor(100 / n);
    let remainder = 100 - baseWeight * n;
    state.assets.forEach((a, idx) => {
      a.weight = baseWeight + (idx === 0 ? remainder : 0);
    });
    renderAssetRows();
    renderPortfolioModel();
  }

  function updateTotalWeightBadge() {
    const total = state.assets.reduce((sum, a) => sum + (parseFloat(a.weight) || 0), 0);
    dom.weightTotalBadge.textContent = `總權重: ${total}%`;
    if (Math.abs(total - 100) < 0.01) {
      dom.weightTotalBadge.className = 'px-3.5 py-1.5 text-sm font-extrabold rounded-xl weight-badge-valid';
    } else {
      dom.weightTotalBadge.className = 'px-3.5 py-1.5 text-sm font-extrabold rounded-xl weight-badge-invalid';
    }
  }

  // ================= 執行蒙地卡羅運算 =================

  function runMonteCarlo(isUserInitiated = false) {
    if (isUserInitiated && dom.btnRunSimulation) {
      dom.btnRunSimulation.classList.add('btn-simulation-running');
      if (dom.btnRunText) dom.btnRunText.textContent = '🎲 正在抽樣運算 2,000 條路徑...';
      if (dom.btnRunIcon) dom.btnRunIcon.setAttribute('data-lucide', 'loader-2');
      if (window.lucide) lucide.createIcons();
    }

    // 稍微延遲讓瀏覽器渲染載入動畫，提供明確的點擊運算反饋感
    setTimeout(() => {
      const t0 = performance.now();
      try {
        const config = {
          currency: state.currency,
          initialInvestment: parseFloat(dom.inputInitialAmount.value) || 0,
          years: parseInt(dom.inputYears.value) || 30,
          trials: parseInt(dom.selectTrials.value) || 2000,
          model: dom.selectModel.value,
          rebalanceFrequency: dom.selectRebalance.value,
          expenseRatio: parseFloat(dom.selectFeeStructure.value) || 0.0,
          sequenceRisk: dom.selectSequenceRisk.value,
          
          // 通膨
          inflationModel: dom.selectInflationModel.value,
          inflationRate: (parseFloat(dom.inputInflationRate.value) || 2.0) / 100,
          adjustForInflation: state.adjustForInflation,

          // 現金流模式
          cashflowPlannerMode: state.cashflowPlannerMode,

          // 簡易/生命週期模式
          cashflowMode: state.cashflowMode,
          retirementStartYear: state.retirementStartYear,
          contributionAmount: parseFloat(dom.inputContribAmount.value) || 0,
          contributionFrequency: dom.selectContribFreq.value,
          contributionGrowthRate: (parseFloat(dom.inputContribGrowth.value) || 0) / 100,
          withdrawalType: dom.selectWithdrawalType ? dom.selectWithdrawalType.value : 'fixed_amount',
        };

        // ── 提領基準防呆偵測 ────────────────────────────────────────────────
        // 以 DOM 可見狀態為準（避免 state.withdrawalBasis 還停在舊值）：
        // 若「固定金額」面板可見（boxWithdrawAmount 存在且未被 hidden），就走金額模式
        const isAmountMode = (dom.boxWithdrawAmount && !dom.boxWithdrawAmount.classList.contains('hidden'))
          || state.withdrawalBasis === 'amount';

        const rawCustomAmount = parseFloat(dom.inputWithdrawalCustomAmount?.value) || 0;
        const isMonthly = dom.selectWithdrawalAmountFreq?.value === 'monthly';
        const annualCustomAmount = isAmountMode && rawCustomAmount > 0
          ? (isMonthly ? rawCustomAmount * 12 : rawCustomAmount)
          : 0;

        config.withdrawalRate = (!isAmountMode || annualCustomAmount === 0)
          ? ((parseFloat(dom.inputWithdrawalRate.value) || 4.0) / 100)
          : 0;
        config.customWithdrawalAmount = annualCustomAmount;
        config.minEndingBalance = parseFloat(dom.inputMinBalance?.value) || 0;
        config.withdrawalAdjustInflation = dom.checkWithdrawalInflation?.checked ?? true;

        // 多時期進階排程 & 資產配置
        config.cashflowStages = state.cashflowStages;
        config.assets = state.assets;

        // ── 偵錯：印出引擎接收的提領參數與計算結果
        console.log(`[模擬參數] 退休開始年: 第 ${config.retirementStartYear} 年 | 提領模式: ${isAmountMode ? '固定金額' : '提領率'} | 年提領: NT$ ${(annualCustomAmount/10000).toFixed(0)} 萬 | 初始本金: NT$ ${(config.initialInvestment/10000).toFixed(0)} 萬`);

        const results = MonteCarloEngine.runSimulation(config);
        state.lastResults = results;
        state.lastConfig = config;

        console.log(`[運算結果] 存活率: ${results.successRate}% | 破產機率: ${results.ruinProbability}% | 破產中位年: 第 ${results.medianRuinYear || '無破產'} 年 | 中位數終值: NT$ ${(results.summaryStats.real.p50/10000).toFixed(1)} 萬`);

        const duration = Math.max(1, Math.round(performance.now() - t0));

        updateUIWithResults(results);
        renderPortfolioModel();

        // 更新頂部模擬狀態提示
        if (dom.simStatusText) {
          const nowStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
          dom.simStatusText.innerHTML = `已完成 <strong>${config.trials.toLocaleString()}</strong> 次蒙地卡羅模擬 (耗時 ${duration}ms · ${nowStr} 剛剛更新)`;
        }

        // 觸發 KPI 與結果卡片高亮閃爍動畫，視覺上明確感知數據已刷新
        if (dom.kpiCardsGrid) {
          dom.kpiCardsGrid.classList.remove('flash-update');
          void dom.kpiCardsGrid.offsetWidth; // 強制重繪
          dom.kpiCardsGrid.classList.add('flash-update');
        }

        // 按鈕成功反饋
        if (isUserInitiated && dom.btnRunSimulation) {
          dom.btnRunSimulation.classList.remove('btn-simulation-running');
          dom.btnRunSimulation.classList.add('btn-simulation-success');
          if (dom.btnRunText) dom.btnRunText.textContent = `✓ 模擬完成！(已重抽 ${config.trials.toLocaleString()} 條路徑)`;
          if (dom.btnRunIcon) dom.btnRunIcon.setAttribute('data-lucide', 'check-circle-2');
          if (window.lucide) lucide.createIcons();

          setTimeout(() => {
            dom.btnRunSimulation.classList.remove('btn-simulation-success');
            if (dom.btnRunText) dom.btnRunText.textContent = '立即執行蒙地卡羅模擬 (重新抽樣)';
            if (dom.btnRunIcon) dom.btnRunIcon.setAttribute('data-lucide', 'play');
            if (window.lucide) lucide.createIcons();
          }, 900);
        }
      } catch (err) {
        console.error(err);
        if (dom.btnRunSimulation) {
          dom.btnRunSimulation.classList.remove('btn-simulation-running', 'btn-simulation-success');
          if (dom.btnRunText) dom.btnRunText.textContent = '立即執行蒙地卡羅模擬 (重新抽樣)';
          if (dom.btnRunIcon) dom.btnRunIcon.setAttribute('data-lucide', 'play');
          if (window.lucide) lucide.createIcons();
        }
        alert('模擬運算發生錯誤：' + err.message);
      }
    }, isUserInitiated ? 120 : 0);
  }

  function updateUIWithResults(results) {
    const isReal = state.adjustForInflation;
    const stats = isReal ? results.summaryStats.real : results.summaryStats.nominal;
    const curr = state.currency === 'TWD' ? 'NT$' : '$';

    // 1. KPI 卡片 (大字體)
    dom.kpiP50.textContent = `${curr} ${formatCurrencyShort(stats.p50)}`;
    dom.kpiSuccessRate.textContent = `${results.successRate}%`;
    dom.kpiRuinText.textContent = `破產風險: ${results.ruinProbability}%${results.medianRuinYear ? ' (破產中位: 第' + results.medianRuinYear + '年)' : ''}`;
    dom.kpiP10.textContent = `${curr} ${formatCurrencyShort(stats.p10)}`;
    dom.kpiDrawdown.textContent = `${(results.maxDrawdownStats.median * 100).toFixed(1)}%`;
    dom.kpiWorstDd.textContent = `最差回撤: ${(results.maxDrawdownStats.worst * 100).toFixed(1)}%`;

    if (dom.survivalFinalRate) {
      dom.survivalFinalRate.textContent = `${results.successRate}%`;
    }

    // 2. 渲染走勢扇形圖
    renderTrajectoryChart(results);

    // 3. 渲染存活率逐年曲線
    renderSurvivalChart(results);

    // 4. 渲染完整量化績效矩陣總表
    renderPerformanceMatrix(results);

    // 5. 渲染直方圖
    renderHistogramChart(results);

    // 6. 渲染明細表
    renderYearlyTable(results);

    // 7. 產出專業解讀評語
    renderInsights(results);

    // 8. 更新提領率即時金額換算卡片
    updateWithdrawalRateDisplay();
    updateWithdrawalStrategyExplanation();
  }

  // ================= 圖表與表格渲染 =================

  function renderTrajectoryChart(results) {
    const ctx = document.getElementById('canvas-trajectories').getContext('2d');
    const years = results.years;
    const labels = Array.from({ length: years + 1 }, (_, i) => `第 ${i} 年`);
    const curr = state.currency === 'TWD' ? 'NT$' : '$';

    const p10Data = results.percentileYears.map(d => d.p10);
    const p25Data = results.percentileYears.map(d => d.p25);
    const p50Data = results.percentileYears.map(d => d.p50);
    const p75Data = results.percentileYears.map(d => d.p75);
    const p90Data = results.percentileYears.map(d => d.p90);

    const datasets = [];

    if (dom.checkShowPaths.checked && results.samplePaths) {
      results.samplePaths.forEach((path, i) => {
        datasets.push({
          label: `抽樣路徑 ${i + 1}`,
          data: path,
          borderColor: 'rgba(148, 163, 184, 0.22)',
          borderWidth: 1.2,
          pointRadius: 0,
          fill: false,
          tension: 0.1
        });
      });
    }

    datasets.push({
      label: '90th Percentile (樂觀)',
      data: p90Data,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderWidth: 2.5,
      pointRadius: 0,
      fill: '+1'
    });

    datasets.push({
      label: '75th Percentile',
      data: p75Data,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderWidth: 2,
      pointRadius: 0,
      fill: '+1'
    });

    datasets.push({
      label: '50th Percentile (中位數)',
      data: p50Data,
      borderColor: '#4F46E5',
      backgroundColor: 'rgba(79, 70, 229, 0.15)',
      borderWidth: 4,
      pointRadius: 1.5,
      pointHoverRadius: 6,
      fill: '+1'
    });

    datasets.push({
      label: '25th Percentile',
      data: p25Data,
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.10)',
      borderWidth: 2,
      pointRadius: 0,
      fill: '+1'
    });

    datasets.push({
      label: '10th Percentile (悲觀)',
      data: p10Data,
      borderColor: '#EF4444',
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false
    });

    if (state.trajectoryChart) {
      state.trajectoryChart.destroy();
    }

    state.trajectoryChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13, weight: '500' },
            padding: 12,
            callbacks: {
              label: (context) => {
                if (context.dataset.label.startsWith('抽樣路徑')) return null;
                const val = context.parsed.y;
                return ` ${context.dataset.label}: ${curr} ${formatCurrencyShort(val)} (${Math.round(val).toLocaleString()})`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { size: 12, weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              font: { size: 12, weight: '600' },
              callback: (val) => `${curr} ${formatCurrencyShort(val)}`
            }
          }
        }
      }
    });
  }

  function renderSurvivalChart(results) {
    const canvas = document.getElementById('canvas-survival');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const survivalData = results.survivalCurve;
    const labels = survivalData.map(d => `第 ${d.year} 年`);
    const rates = survivalData.map(d => d.rate);

    if (state.survivalChart) {
      state.survivalChart.destroy();
    }

    state.survivalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '投資組合存活率 (Success Rate %)',
          data: rates,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(99, 102, 241, 0.25)',
          borderWidth: 3,
          pointRadius: 2,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            callbacks: {
              label: (ctx) => ` 存活率: ${ctx.parsed.y.toFixed(2)}% (未破產)`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { size: 12, weight: '600' } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              font: { size: 12, weight: '600' },
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  function renderPerformanceMatrix(results) {
    if (!dom.performanceSummaryBody) return;
    dom.performanceSummaryBody.innerHTML = '';
    const m = results.performanceMatrix;
    const curr = state.currency === 'TWD' ? 'NT$' : '$';

    const fmtPct = (val) => `${(val * 100).toFixed(2)}%`;
    const fmtNum = (val) => val.toFixed(2);
    const fmtCurr = (val) => `${curr} ${Math.round(val).toLocaleString()}`;

    const rows = [
      { name: '時間加權年化報酬率 (名目) Time Weighted Rate of Return (nominal)', vals: m.twrrNominal.map(fmtPct), highlight: false },
      { name: '時間加權年化報酬率 (實質) Time Weighted Rate of Return (real)', vals: m.twrrReal.map(fmtPct), highlight: true },
      { name: '期末資產終值 (名目) Portfolio End Balance (nominal)', vals: m.endBalanceNominal.map(fmtCurr), highlight: false },
      { name: '期末資產終值 (實質) Portfolio End Balance (real)', vals: m.endBalanceReal.map(fmtCurr), highlight: true },
      { name: '年化平均報酬率 (名目) Annual Mean Return (nominal)', vals: m.meanReturnNominal.map(fmtPct), highlight: false },
      { name: '年化波動度 (標準差) Annualized Volatility', vals: m.volatility.map(fmtPct), highlight: false },
      { name: '夏普值 (無風險 1.5%) Sharpe Ratio', vals: m.sharpeRatio.map(fmtNum), highlight: false },
      { name: '索提諾值 (下檔風險) Sortino Ratio', vals: m.sortinoRatio.map(fmtNum), highlight: false },
      { name: '最大回撤 (含提領/投入) Maximum Drawdown', vals: m.maxDrawdownWithCashflows.map(fmtPct), highlight: false },
      { name: '最大回撤 (純資產波動) Maximum Drawdown Excluding Cashflows', vals: m.maxDrawdownPureAsset.map(fmtPct), highlight: false },
      { name: '安全提領率 Safe Withdrawal Rate (SWR)', vals: m.safeWithdrawalRate.map(fmtPct), highlight: true },
      { name: '永續本金不減提領率 Perpetual Withdrawal Rate (PWR)', vals: m.perpetualWithdrawalRate.map(fmtPct), highlight: false }
    ];

    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-50 transition ${r.highlight ? 'bg-blue-50/30' : ''}`;
      tr.innerHTML = `
        <td class="py-3 px-4 text-xs sm:text-sm font-bold text-slate-800">${r.name}</td>
        <td class="py-3 px-3 text-xs sm:text-sm text-rose-700 font-bold">${r.vals[0]}</td>
        <td class="py-3 px-3 text-xs sm:text-sm text-amber-700 font-bold">${r.vals[1]}</td>
        <td class="py-3 px-3 text-xs sm:text-sm text-indigo-700 font-black">${r.vals[2]}</td>
        <td class="py-3 px-3 text-xs sm:text-sm text-blue-700 font-bold">${r.vals[3]}</td>
        <td class="py-3 px-3 text-xs sm:text-sm text-emerald-700 font-bold">${r.vals[4]}</td>
      `;
      dom.performanceSummaryBody.appendChild(tr);
    });

    if (dom.performanceFooterNote) {
      const successCount = Math.round(results.trials * (results.successRate / 100));
      dom.performanceFooterNote.innerHTML = `
        🎯 <strong>${results.trials}</strong> 次隨機模擬中共有 <strong>${successCount}</strong> 次 (<strong>${results.successRate}%</strong>) 成功存活未發生提早本金耗盡 (Survived all withdrawals).
      `;
    }
  }

  function renderHistogramChart(results) {
    const ctx = document.getElementById('canvas-histogram').getContext('2d');
    const { labels, counts } = results.histogram;

    if (state.histogramChart) {
      state.histogramChart.destroy();
    }

    state.histogramChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '落入次數 (頻率)',
          data: counts,
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          hoverBackgroundColor: 'rgba(37, 99, 235, 0.95)',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            callbacks: {
              label: (ctx) => ` 模擬次數: ${ctx.parsed.y} 次 (佔 ${(ctx.parsed.y / results.trials * 100).toFixed(1)}%)`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: '600' }, maxRotation: 45, minRotation: 30 }
          },
          y: {
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { size: 12, weight: '600' } }
          }
        }
      }
    });
  }

  function renderYearlyTable(results) {
    dom.yearlyTableBody.innerHTML = '';
    const curr = state.currency === 'TWD' ? 'NT$' : '$';

    results.yearlyTable.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/90 transition text-sm';
      tr.innerHTML = `
        <td class="py-3 px-3.5 font-bold text-slate-800">第 ${row.year} 年</td>
        <td class="py-3 px-3.5 font-black text-blue-700">${curr} ${formatCurrencyShort(row.realBalance)}</td>
        <td class="py-3 px-3.5 text-emerald-700 font-bold">${curr} ${formatCurrencyShort(row.realP90)}</td>
        <td class="py-3 px-3.5 text-rose-700 font-bold">${curr} ${formatCurrencyShort(row.realP10)}</td>
        <td class="py-3 px-3.5 text-slate-700 font-semibold">${row.realCashflow !== 0 ? ((row.realCashflow > 0 ? '+' : '') + curr + ' ' + formatCurrencyShort(row.realCashflow)) : '--'}</td>
        <td class="py-3 px-3.5 font-bold text-slate-900">${curr} ${formatCurrencyShort(row.nominalBalance)}</td>
        <td class="py-3 px-3.5 text-slate-600 font-medium">${row.nominalCashflow !== 0 ? ((row.nominalCashflow > 0 ? '+' : '') + curr + ' ' + formatCurrencyShort(row.nominalCashflow)) : '--'}</td>
      `;
      dom.yearlyTableBody.appendChild(tr);
    });
  }

  function renderInsights(results) {
    const isReal = state.adjustForInflation;
    const stats = isReal ? results.summaryStats.real : results.summaryStats.nominal;
    const curr = state.currency === 'TWD' ? 'NT$' : '$';
    const initialInv = parseFloat(dom.inputInitialAmount.value) || 0;
    const years = parseInt(dom.inputYears.value) || 30;

    let items = [];

    if (results.successRate >= 95) {
      items.push(`🎉 <strong>資產計畫極佳</strong>：投資組合存活率高達 <strong>${results.successRate}%</strong>，在歷史與隨機模擬中展現優異抗風險能力。`);
    } else if (results.successRate >= 80) {
      items.push(`⚠️ <strong>具備中度風險</strong>：存活率為 <strong>${results.successRate}%</strong>，有 ${results.ruinProbability}% 的極端歷史路徑會面臨提早本金耗盡。建議可考慮調整提領時程或適度提高現金流投入。`);
    } else {
      items.push(`🚨 <strong>現金流壓力偏高</strong>：存活率為 <strong>${results.successRate}%</strong>，破產中位年份約在第 <strong>${results.medianRuinYear || '中期'}</strong> 年。建議調降提領率或提高前期的累積投入。`);
    }

    if (initialInv > 0) {
      const multiple = (stats.p50 / initialInv).toFixed(1);
      items.push(`📈 <strong>長期累積效應</strong>：在 ${years} 年後，中位數實質資產達到 <strong>${curr} ${formatCurrencyShort(stats.p50)}</strong>，實質購買力約為初始本金的 <strong>${multiple} 倍</strong>。`);
    } else {
      items.push(`📈 <strong>長期定期定額效應</strong>：在 ${years} 年後，零初始本金全靠現金流排程累積的中位數實質資產達到 <strong>${curr} ${formatCurrencyShort(stats.p50)}</strong>。`);
    }

    const infRate = (parseFloat(dom.inputInflationRate.value) || 2.0);
    const nominalP50 = results.summaryStats.nominal.p50;
    const realP50 = results.summaryStats.real.p50;
    const diffVal = nominalP50 - realP50;
    items.push(`🛡️ <strong>通膨扣除實質差異</strong>：在年通膨率 ${infRate}% 下，名目金額 (${curr} ${formatCurrencyShort(nominalP50)}) 與實質購買力 (${curr} ${formatCurrencyShort(realP50)}) 相差了 <strong>${curr} ${formatCurrencyShort(diffVal)}</strong>。`);

    items.push(`📉 <strong>波動與最大回撤</strong>：此配置在中位數情境下面臨的最大帳面回撤為 <strong>${(results.maxDrawdownStats.median * 100).toFixed(1)}%</strong>（最悲觀曾達 ${(results.maxDrawdownStats.worst * 100).toFixed(1)}%）。`);

    dom.simulationInsights.innerHTML = items.map(t => `<div class="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 text-sm leading-relaxed">${t}</div>`).join('');
  }

  function handleExportCSV() {
    if (!state.lastResults || !state.lastConfig) {
      alert('請先執行蒙地卡羅模擬！');
      return;
    }
    ExportUtils.exportToCSV(state.lastResults, state.lastConfig);
  }

  function formatCurrencyShort(val) {
    if (Math.abs(val) >= 100000000) {
      return (val / 100000000).toFixed(2) + '億';
    } else if (Math.abs(val) >= 10000) {
      return (val / 10000).toFixed(1) + '萬';
    }
    return Math.round(val).toLocaleString();
  }
});

/**
 * Taiwan Portfolio Visualizer - 報表匯出與本地存檔工具
 */

const ExportUtils = {
  /**
   * 將蒙地卡羅模擬成果匯出為 CSV 試算表 (UTF-8 with BOM 確保 Excel 繁體中文不亂碼)
   */
  exportToCSV(results, config) {
    if (!results || !results.yearlyTable) {
      alert('請先執行模擬運算後再匯出報表！');
      return;
    }

    const { yearlyTable, summaryStats, successRate, performanceMatrix } = results;
    const currency = config.currency || 'TWD';
    const currSymbol = currency === 'TWD' ? 'NT$' : '$';
    const isReal = config.adjustForInflation;

    let csvContent = '\uFEFF'; // UTF-8 BOM

    // 1. 模擬基本參數區塊
    csvContent += '【台灣投資組合蒙地卡羅模擬器 - 評估報表】\r\n';
    csvContent += `匯出日期,${new Date().toLocaleString('zh-TW')}\r\n`;
    csvContent += `初始本金,${currSymbol} ${config.initialInvestment.toLocaleString()}\r\n`;
    csvContent += `投資年期,${config.years} 年\r\n`;
    csvContent += `模擬次數,${config.trials} 次\r\n`;
    csvContent += `模擬模型,${config.model === 'bootstrap' ? '歷史真實抽樣 (Bootstrap)' : '參數化常態分佈 (Cholesky)'}\r\n`;
    csvContent += `內扣費用率,${(config.expenseRatio * 100).toFixed(2)}%\r\n`;
    csvContent += `報酬順序風險,${config.sequenceRisk === 'stress_early' ? '初期逆風壓力測試' : '無調整 (正常隨機)'}\r\n`;
    csvContent += `通膨模型,${config.inflationModel === 'bootstrap' ? '歷史真實 CPI 抽樣' : '固定年通膨率 (' + (config.inflationRate * 100).toFixed(1) + '%)'}\r\n`;
    csvContent += `呈現基準,${isReal ? '實質購買力 (已扣除通膨)' : '名目金額 (未扣通膨)'}\r\n`;
    
    // 資產配置
    csvContent += '\r\n【資產配置清單】\r\n';
    csvContent += '資產名稱,權重比例,預期年化報酬率,波動度 (標準差)\r\n';
    config.assets.forEach(a => {
      const meta = HISTORICAL_DATA.assetMeta[a.key] || {};
      csvContent += `"${meta.name || a.key}",${a.weight}%,${(a.expectedReturn * 100).toFixed(1)}%,${(a.stdev * 100).toFixed(1)}%\r\n`;
    });

    // 2. 完整量化績效統計總表 (Performance Summary Matrix - 1:1 對標 Portfolio Visualizer)
    if (performanceMatrix) {
      csvContent += '\r\n【量化績效統計總表 (Performance Summary)】\r\n';
      csvContent += '指標項目 (Metric),10th Percentile,25th Percentile,50th Percentile (中位數),75th Percentile,90th Percentile\r\n';
      
      const fmtPct = (v) => `${(v * 100).toFixed(2)}%`;
      const fmtNum = (v) => v.toFixed(2);
      const fmtCurr = (v) => `"${currSymbol} ${Math.round(v).toLocaleString()}"`;

      const m = performanceMatrix;
      csvContent += `時間加權年化報酬率 (名目),${m.twrrNominal.map(fmtPct).join(',')}\r\n`;
      csvContent += `時間加權年化報酬率 (實質),${m.twrrReal.map(fmtPct).join(',')}\r\n`;
      csvContent += `期末資產終值 (名目),${m.endBalanceNominal.map(fmtCurr).join(',')}\r\n`;
      csvContent += `期末資產終值 (實質),${m.endBalanceReal.map(fmtCurr).join(',')}\r\n`;
      csvContent += `年化平均報酬率 (名目),${m.meanReturnNominal.map(fmtPct).join(',')}\r\n`;
      csvContent += `年化波動度 (標準差),${m.volatility.map(fmtPct).join(',')}\r\n`;
      csvContent += `夏普值 (Sharpe Ratio),${m.sharpeRatio.map(fmtNum).join(',')}\r\n`;
      csvContent += `索提諾值 (Sortino Ratio),${m.sortinoRatio.map(fmtNum).join(',')}\r\n`;
      csvContent += `最大回撤 (含提領/投入),${m.maxDrawdownWithCashflows.map(fmtPct).join(',')}\r\n`;
      csvContent += `最大回撤 (純資產波動),${m.maxDrawdownPureAsset.map(fmtPct).join(',')}\r\n`;
      csvContent += `安全提領率 (SWR),${m.safeWithdrawalRate.map(fmtPct).join(',')}\r\n`;
      csvContent += `永續本金不減提領率 (PWR),${m.perpetualWithdrawalRate.map(fmtPct).join(',')}\r\n`;
      csvContent += `\r\n存活結果提示: ${results.trials} 次模擬中共有 ${Math.round(results.trials * (successRate / 100))} 次 (${successRate}%) 成功存活未破產 (Survived all withdrawals).\r\n`;
    }

    // 3. 逐年現金流與資產明細表
    csvContent += '\r\n【逐年資產與現金證明細表】\r\n';
    csvContent += '年份,實質中位數資產,實質10%悲觀,實質90%樂觀,實質現金流,名目中位數資產,名目10%悲觀,名目90%樂觀,名目現金流\r\n';
    
    yearlyTable.forEach(row => {
      csvContent += `${row.year},${row.realBalance},${row.realP10},${row.realP90},${row.realCashflow},${row.nominalBalance},${row.nominalP10},${row.nominalP90},${row.nominalCashflow}\r\n`;
    });

    // 4. 下載觸發
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `蒙地卡羅投資模擬報表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * 觸發列印 / 匯出 PDF
   */
  printReport() {
    window.print();
  },

  /**
   * 儲存設定至 LocalStorage
   */
  saveConfig(config) {
    try {
      localStorage.setItem('tw_mc_config', JSON.stringify(config));
      return true;
    } catch (e) {
      console.error('儲存配置失敗', e);
      return false;
    }
  },

  /**
   * 從 LocalStorage 載入設定
   */
  loadConfig() {
    try {
      const data = localStorage.getItem('tw_mc_config');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('載入配置失敗', e);
      return null;
    }
  }
};

if (typeof window !== 'undefined') {
  window.ExportUtils = ExportUtils;
}

// ============================================================
// VILLAIN ARC — Quote engine & rotation logic
// ============================================================

const QuoteEngine = {
  todayKey() {
    return Gamification.dateKey();
  },

  getTodayQuote() {
    const lastDate = AppData.getLastQuoteDate();
    const today = this.todayKey();
    let history = AppData.getQuoteHistory();

    if (lastDate === today && history.length > 0) {
      return history[history.length - 1];
    }
    return this.rotate();
  },

  rotate() {
    let history = AppData.getQuoteHistory();
    const used = new Set(history);
    let pool = ALL_QUOTES.filter((q) => !used.has(q));
    if (pool.length === 0) {
      pool = ALL_QUOTES.slice();
      history = [];
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    history.push(pick);
    AppData.setQuoteHistory(history);
    AppData.setLastQuoteDate(this.todayKey());
    return pick;
  },

  getRandom() {
    return ALL_QUOTES[Math.floor(Math.random() * ALL_QUOTES.length)];
  }
};

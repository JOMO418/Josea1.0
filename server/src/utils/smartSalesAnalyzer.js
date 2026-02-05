/**
 * Intelligent Sales Query Analyzer
 * Detects sales query intent and extracts analysis parameters
 */

/**
 * Detect sales query type and intent
 * @param {string} query - User's sales query
 * @returns {Object} Analysis parameters
 */
function analyzeSalesQuery(query) {
  const lower = query.toLowerCase();

  const analysis = {
    queryType: 'general_sales',
    intent: null,
    timeframe: null,
    comparison: null,
    status: null,
    aggregation: null,
    branchFilter: null,
    staffFilter: null,
    requiresDetailed: false,
    requiresComparison: false,
    requiresTrend: false,
  };

  // ============================================
  // DETECT QUERY INTENT
  // ============================================

  // 1. COMPARISON QUERIES (branch vs branch, period vs period)
  if (lower.match(/\b(compare|comparison|vs|versus|against|better|best|worst)\b/i)) {
    analysis.intent = 'comparison';
    analysis.requiresComparison = true;

    // Branch comparison
    if (lower.match(/\b(branch|branches|all branches|per branch)\b/i)) {
      analysis.comparison = 'branch';
    }
    // Period comparison
    else if (lower.match(/\b(today vs yesterday|this week vs last|month vs|period)\b/i)) {
      analysis.comparison = 'period';
    }
  }

  // 2. VERIFICATION QUERIES (flagged M-Pesa, pending verification)
  else if (lower.match(/\b(flag|flagged|verification|verify|pending|unverified|complete later)\b/i)) {
    analysis.intent = 'verification';
    analysis.status = 'flagged';
    analysis.queryType = 'flagged_sales';
  }

  // 3. REVERSAL QUERIES (reversed sales, cancellations, pending reversals)
  else if (lower.match(/\b(revers|cancel|refund|pending revers|approval)\b/i)) {
    analysis.intent = 'reversal';

    if (lower.match(/\b(pending|awaiting|need|approval)\b/i)) {
      analysis.status = 'pending_reversal';
    } else {
      analysis.status = 'reversed';
    }
    analysis.queryType = 'reversal_sales';
  }

  // 4. CREDIT QUERIES (who owes, unpaid, credit sales)
  else if (lower.match(/\b(credit|debt|owe|owing|unpaid|deni|partial|paid)\b/i)) {
    analysis.intent = 'credit';

    // Detect credit status
    if (lower.match(/\b(pending|unpaid|not paid)\b/i)) {
      analysis.status = 'PENDING';
    } else if (lower.match(/\b(partial|partially)\b/i)) {
      analysis.status = 'PARTIAL';
    } else if (lower.match(/\b(paid|completed|cleared)\b/i)) {
      analysis.status = 'PAID';
    }
    analysis.queryType = 'credit_sales';
  }

  // 5. PERFORMANCE QUERIES (top products, best sellers, staff performance)
  else if (lower.match(/\b(top|best|most|highest|performance|selling|seller)\b/i)) {
    analysis.intent = 'performance';

    if (lower.match(/\b(product|item|stock)\b/i)) {
      analysis.aggregation = 'top_products';
    } else if (lower.match(/\b(staff|user|seller|employee|who)\b/i)) {
      analysis.aggregation = 'staff_performance';
    } else if (lower.match(/\b(branch)\b/i)) {
      analysis.aggregation = 'branch_performance';
    } else if (lower.match(/\b(customer|buyer)\b/i)) {
      analysis.aggregation = 'top_customers';
    }
    analysis.queryType = 'performance_analysis';
  }

  // 6. TREND QUERIES (growth, decline, pattern, trend)
  else if (lower.match(/\b(trend|growth|decline|pattern|increasing|decreasing|going up|going down)\b/i)) {
    analysis.intent = 'trend';
    analysis.requiresTrend = true;
    analysis.queryType = 'trend_analysis';
  }

  // 7. PAYMENT METHOD QUERIES (cash sales, M-Pesa sales, payment breakdown)
  else if (lower.match(/\b(cash|mpesa|m-pesa|payment method|breakdown|split)\b/i)) {
    analysis.intent = 'payment_method';
    analysis.aggregation = 'payment_breakdown';
    analysis.queryType = 'payment_analysis';
  }

  // 8. TOTAL/REVENUE QUERIES (how much, total sales, revenue)
  else if (lower.match(/\b(how much|total|revenue|sales|amount|sold)\b/i)) {
    analysis.intent = 'total';
    analysis.queryType = 'sales_total';
  }

  // ============================================
  // EXTRACT TIMEFRAME
  // ============================================

  // Specific time periods
  if (lower.match(/\b(today|leo)\b/i)) {
    analysis.timeframe = 'today';
  } else if (lower.match(/\b(yesterday|jana)\b/i)) {
    analysis.timeframe = 'yesterday';
  } else if (lower.match(/\b(this week|hii wiki)\b/i)) {
    analysis.timeframe = 'this_week';
  } else if (lower.match(/\b(last week|wiki iliopita)\b/i)) {
    analysis.timeframe = 'last_week';
  } else if (lower.match(/\b(this month|hii mwezi|current month)\b/i)) {
    analysis.timeframe = 'this_month';
  } else if (lower.match(/\b(last month|mwezi uliopita)\b/i)) {
    analysis.timeframe = 'last_month';
  }

  // Comparison timeframes
  if (lower.match(/\b(today vs yesterday|leo vs jana)\b/i)) {
    analysis.timeframe = 'today';
    analysis.comparison = 'period';
    analysis.comparisonPeriod = 'yesterday';
    analysis.requiresComparison = true;
  } else if (lower.match(/\b(this week vs last week)\b/i)) {
    analysis.timeframe = 'this_week';
    analysis.comparison = 'period';
    analysis.comparisonPeriod = 'last_week';
    analysis.requiresComparison = true;
  } else if (lower.match(/\b(this month vs last month)\b/i)) {
    analysis.timeframe = 'this_month';
    analysis.comparison = 'period';
    analysis.comparisonPeriod = 'last_month';
    analysis.requiresComparison = true;
  }

  // ============================================
  // EXTRACT BRANCH FILTER
  // ============================================

  const branches = ['cbd', 'westlands', 'thika', 'kakamega', 'kiserian', 'kisumu', 'main'];
  for (const branch of branches) {
    if (lower.includes(branch)) {
      analysis.branchFilter = branch.charAt(0).toUpperCase() + branch.slice(1);
      break;
    }
  }

  // Check for "all branches"
  if (lower.match(/\b(all branches|every branch|across branches|company wide)\b/i)) {
    analysis.branchFilter = 'all';
  }

  // ============================================
  // DETERMINE IF DETAILED DATA NEEDED
  // ============================================

  // Detailed data needed for:
  analysis.requiresDetailed =
    analysis.intent === 'performance' ||
    analysis.intent === 'trend' ||
    analysis.intent === 'comparison' ||
    lower.match(/\b(detail|breakdown|analysis|items|products|list)\b/i) !== null;

  return analysis;
}

/**
 * Generate date ranges based on timeframe
 * @param {string} timeframe - Timeframe identifier
 * @returns {Object} { startDate, endDate }
 */
function getDateRangeForTimeframe(timeframe) {
  const now = new Date();
  let startDate, endDate;

  switch (timeframe) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      break;

    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'this_week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      break;

    case 'last_week':
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 6);
      lastWeekStart.setHours(0, 0, 0, 0);
      startDate = lastWeekStart;

      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      endDate = lastWeekEnd;
      break;

    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      break;

    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    default:
      // Default to last 7 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
  }

  return { startDate, endDate };
}

/**
 * Determine complexity level of response needed
 * @param {Object} analysis - Sales query analysis
 * @returns {string} 'simple' | 'moderate' | 'complex'
 */
function getResponseComplexity(analysis) {
  // Simple: Just totals, no comparisons
  if (analysis.intent === 'total' && !analysis.requiresComparison && !analysis.requiresDetailed) {
    return 'simple';
  }

  // Complex: Comparisons, trends, performance analysis
  if (analysis.requiresComparison || analysis.requiresTrend || analysis.intent === 'performance') {
    return 'complex';
  }

  // Moderate: Everything else
  return 'moderate';
}

module.exports = {
  analyzeSalesQuery,
  getDateRangeForTimeframe,
  getResponseComplexity,
};

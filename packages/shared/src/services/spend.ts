/**
 * Spend breakdown analytics service.
 */
import type { Filters, SpendBreakdown } from '../types/index.js';
import {
  validateFilters,
  filterSessions,
  isVerifiedOutcome,
  isCompletedSession,
  isPendingVerification,
  formatPeriodLabel,
  getDaysInRange,
  getDaysInMonth,
  getDateRange,
  getDefaultDataset,
  getDefaultNow,
  computeTrend,
  type GeneratedDataset,
} from './helpers.js';
import { projectMonthEnd } from '../utils/calculations.js';

export function getSpendBreakdown(
  filters: Filters,
  now?: Date,
  dataset?: GeneratedDataset,
): SpendBreakdown {
  validateFilters(filters);

  const ds = dataset ?? getDefaultDataset();
  const currentNow = now ?? getDefaultNow();
  const sessions = filterSessions(ds.sessions, filters);

  const totalSpend = sessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);

  // Trend vs previous period
  const totalSpendTrend = computeTrend(totalSpend, filters, (f) => {
    const prevSessions = filterSessions(ds.sessions, f);
    return prevSessions.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
  });

  // Days in range
  const daysInRange = getDaysInRange(filters.dateRange.from, filters.dateRange.to);
  const burnRateDaily = daysInRange > 0 ? totalSpend / daysInRange : 0;

  // Projected month-end: project spending for the month of the filter's end date
  const filterEndDate = new Date(filters.dateRange.to + 'T00:00:00Z');
  const projMonthStart = new Date(
    Date.UTC(filterEndDate.getUTCFullYear(), filterEndDate.getUTCMonth(), 1),
  );
  const monthStartStr = projMonthStart.toISOString().slice(0, 10);
  const projCutoffStr = filters.dateRange.to;

  const monthDates =
    monthStartStr <= projCutoffStr ? getDateRange(monthStartStr, projCutoffStr) : [];

  // Build daily spend for projection (same team/model filters, scoped to the month)
  const monthFilters: Filters = {
    ...filters,
    dateRange: {
      from: monthStartStr,
      to: projCutoffStr,
    },
  };
  const monthSessions = monthDates.length > 0 ? filterSessions(ds.sessions, monthFilters) : [];

  const dailySpendMap = new Map<string, number>();
  for (const date of monthDates) {
    dailySpendMap.set(date, 0);
  }
  for (const s of monthSessions) {
    const date = s.startedAt.slice(0, 10);
    if (dailySpendMap.has(date)) {
      dailySpendMap.set(date, dailySpendMap.get(date)! + s.estimatedCostUSD);
    }
  }
  const dailySpendArray = monthDates.map((d) => dailySpendMap.get(d) ?? 0);
  // AC-2.3: projection must be ≥ total spent so far (even when filter range spans months)
  const rawProjection = projectMonthEnd(dailySpendArray, filterEndDate);
  const projectedMonthEnd = Math.max(rawProjection, totalSpend);

  // Spend by day
  const rangeDates = getDateRange(filters.dateRange.from, filters.dateRange.to);
  const spendByDayMap = new Map<string, number>();
  for (const date of rangeDates) {
    spendByDayMap.set(date, 0);
  }
  for (const s of sessions) {
    const date = s.startedAt.slice(0, 10);
    if (spendByDayMap.has(date)) {
      spendByDayMap.set(date, spendByDayMap.get(date)! + s.estimatedCostUSD);
    }
  }
  const spendByDay = rangeDates.map((date) => ({
    date,
    spend: spendByDayMap.get(date) ?? 0,
  }));

  // Spend by team
  const daysInMonth = getDaysInMonth(filters.dateRange.to);
  const teams = ds.organization.teams;

  const teamSpendMap = new Map<string, number>();
  const teamVerifiedMap = new Map<string, number>();
  for (const s of sessions) {
    teamSpendMap.set(s.teamId, (teamSpendMap.get(s.teamId) ?? 0) + s.estimatedCostUSD);
    if (isVerifiedOutcome(s, currentNow)) {
      teamVerifiedMap.set(s.teamId, (teamVerifiedMap.get(s.teamId) ?? 0) + 1);
    }
  }

  const spendByTeam = teams.map((team) => {
    const spend = teamSpendMap.get(team.id) ?? 0;
    const proRatedBudget = (team.monthlyBudget * daysInRange) / daysInMonth;
    const utilizationPercent = proRatedBudget > 0 ? (spend / proRatedBudget) * 100 : 0;
    const verifiedOutcomes = teamVerifiedMap.get(team.id) ?? 0;

    let status: 'normal' | 'approaching' | 'exceeding';
    if (utilizationPercent > 100) {
      status = 'exceeding';
    } else if (utilizationPercent > 80) {
      status = 'approaching';
    } else {
      status = 'normal';
    }

    return {
      teamId: team.id,
      teamName: team.name,
      spend,
      monthlyBudget: team.monthlyBudget,
      proRatedBudget,
      utilizationPercent,
      status,
      costPerOutcome: verifiedOutcomes > 0 ? spend / verifiedOutcomes : null,
    };
  });

  // Spend by model
  const modelSpendMap = new Map<
    string,
    { spend: number; sessionCount: number; verified: number; completed: number; provider: string }
  >();
  for (const s of sessions) {
    const key = s.model;
    if (!modelSpendMap.has(key)) {
      modelSpendMap.set(key, {
        spend: 0,
        sessionCount: 0,
        verified: 0,
        completed: 0,
        provider: s.provider,
      });
    }
    const entry = modelSpendMap.get(key)!;
    entry.spend += s.estimatedCostUSD;
    entry.sessionCount += 1;
    if (isVerifiedOutcome(s, currentNow)) entry.verified += 1;
    // Exclude pending verification sessions from denominator (matches Quality's verifiedSuccessRate)
    if (isCompletedSession(s) && !isPendingVerification(s, currentNow)) entry.completed += 1;
  }

  const spendByModel = Array.from(modelSpendMap.entries()).map(([model, data]) => ({
    model,
    provider: data.provider,
    spend: data.spend,
    spendPercent: totalSpend > 0 ? (data.spend / totalSpend) * 100 : 0,
    sessionCount: data.sessionCount,
    successRate: data.completed > 0 ? data.verified / data.completed : 0,
    costPerOutcome: data.verified > 0 ? data.spend / data.verified : null,
  }));

  // Cost drivers: team, model, taskType
  const costDrivers: {
    category: string;
    type: 'team' | 'model' | 'taskType';
    spend: number;
    spendPercent: number;
  }[] = [];

  // Team drivers
  for (const ts of spendByTeam) {
    costDrivers.push({
      category: ts.teamName,
      type: 'team',
      spend: ts.spend,
      spendPercent: totalSpend > 0 ? (ts.spend / totalSpend) * 100 : 0,
    });
  }

  // Model drivers
  for (const ms of spendByModel) {
    costDrivers.push({
      category: ms.model,
      type: 'model',
      spend: ms.spend,
      spendPercent: ms.spendPercent,
    });
  }

  // Task type drivers
  const taskTypeSpendMap = new Map<string, number>();
  for (const s of sessions) {
    taskTypeSpendMap.set(s.taskType, (taskTypeSpendMap.get(s.taskType) ?? 0) + s.estimatedCostUSD);
  }
  for (const [taskType, spend] of taskTypeSpendMap.entries()) {
    costDrivers.push({
      category: taskType,
      type: 'taskType',
      spend,
      spendPercent: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
    });
  }

  // Sort by spend descending
  costDrivers.sort((a, b) => b.spend - a.spend);

  return {
    totalSpend,
    totalSpendTrend,
    projectedMonthEnd,
    burnRateDaily,
    spendByDay,
    spendByTeam,
    spendByModel,
    costDrivers,
    periodLabel: formatPeriodLabel(filters.dateRange.from, filters.dateRange.to),
    measurementTypes: {
      totalSpend: 'estimated',
      projectedMonthEnd: 'estimated',
      burnRateDaily: 'estimated',
      spendByTeam: 'estimated',
      spendByModel: 'estimated',
      costPerOutcome: 'estimated',
      utilizationPercent: 'estimated',
    },
  };
}

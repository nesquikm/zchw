/**
 * Adoption analytics service — FR-3 metrics.
 */
import type { Filters, AdoptionMetrics, User, AgentSession } from '../types/index.js';
import {
  validateFilters,
  filterSessions,
  isVerifiedOutcome,
  isCompletedSession,
  isPendingVerification,
  formatPeriodLabel,
  getDaysInRange,
  getDateRange,
  getDefaultDataset,
  getDefaultNow,
  median,
  type GeneratedDataset,
} from './helpers.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getAdoptionMetrics(
  filters: Filters,
  now?: Date,
  dataset?: GeneratedDataset,
): AdoptionMetrics {
  validateFilters(filters);

  const ds = dataset ?? getDefaultDataset();
  const nowDate = now ?? getDefaultNow();
  const { from, to } = filters.dateRange;

  const filteredSessions = filterSessions(ds.sessions, filters);

  // Determine which users are in scope based on team/model filters
  const hasTeamFilter = filters.teamIds?.length;
  const hasModelFilter = filters.models?.length;

  // For user-level metrics, filter users by team if teamIds filter is set
  let usersInScope: User[];
  if (hasTeamFilter) {
    const teamIdSet = new Set(filters.teamIds);
    usersInScope = ds.users.filter((u) => teamIdSet.has(u.teamId));
  } else {
    usersInScope = ds.users;
  }

  // If filtering by models, further restrict to users who have sessions with those models
  if (hasModelFilter) {
    const userIdsWithModelSessions = new Set(filteredSessions.map((s) => s.userId));
    usersInScope = usersInScope.filter((u) => userIdsWithModelSessions.has(u.id));
  }

  // --- Funnel ---
  const invited = usersInScope.length;
  const activated = usersInScope.filter(
    (u) => u.activatedAt !== null && u.activatedAt.slice(0, 10) <= to,
  ).length;
  const firstOutcome = usersInScope.filter(
    (u) => u.firstOutcomeAt !== null && u.firstOutcomeAt.slice(0, 10) <= to,
  ).length;

  // Regular = users with ≥3 sessions/week on average during filtered date range
  // (only counting weeks they were active)
  const userSessionCounts = new Map<string, string[]>();
  for (const s of filteredSessions) {
    const dateKey = s.startedAt.slice(0, 10);
    if (!userSessionCounts.has(s.userId)) userSessionCounts.set(s.userId, []);
    userSessionCounts.get(s.userId)!.push(dateKey);
  }

  const userInScopeIds = new Set(usersInScope.map((u) => u.id));
  let regular = 0;
  for (const [userId, dates] of userSessionCounts) {
    if (!userInScopeIds.has(userId)) continue;
    // Group sessions by ISO week
    const weekSet = new Map<string, number>();
    for (const dateStr of dates) {
      const weekKey = getISOWeekKey(dateStr);
      weekSet.set(weekKey, (weekSet.get(weekKey) ?? 0) + 1);
    }
    const activeWeeks = weekSet.size;
    if (activeWeeks === 0) continue;
    const totalSessions = dates.length;
    const avgPerWeek = totalSessions / activeWeeks;
    if (avgPerWeek >= 3) regular++;
  }

  // --- Time to value ---
  const timeToValueDays: number[] = [];
  for (const u of usersInScope) {
    if (u.firstOutcomeAt && u.invitedAt) {
      const invited_ts = new Date(u.invitedAt).getTime();
      const outcome_ts = new Date(u.firstOutcomeAt).getTime();
      const days = (outcome_ts - invited_ts) / MS_PER_DAY;
      if (days > 0) timeToValueDays.push(days);
    }
  }
  const timeToValueMedianDays =
    timeToValueDays.length > 0 ? Math.round(median(timeToValueDays) * 100) / 100 : null;

  // --- Active users over time ---
  const dateRange = getDateRange(from, to);

  // Build a map of date -> set of user ids
  const sessionsByDate = new Map<string, Set<string>>();
  for (const s of filteredSessions) {
    const dateKey = s.startedAt.slice(0, 10);
    if (!sessionsByDate.has(dateKey)) sessionsByDate.set(dateKey, new Set());
    sessionsByDate.get(dateKey)!.add(s.userId);
  }

  const activeUsersOverTime = dateRange.map((date) => {
    const dau = sessionsByDate.get(date)?.size ?? 0;

    // WAU: 7-day window ending on this date
    const dateMs = new Date(date + 'T00:00:00Z').getTime();
    const wauUsers = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(dateMs - i * MS_PER_DAY).toISOString().slice(0, 10);
      const users = sessionsByDate.get(d);
      if (users) {
        for (const uid of users) wauUsers.add(uid);
      }
    }

    return { date, dau, wau: wauUsers.size };
  });

  // --- Capability adoption ---
  const taskTypeCounts = new Map<string, number>();
  for (const s of filteredSessions) {
    taskTypeCounts.set(s.taskType, (taskTypeCounts.get(s.taskType) ?? 0) + 1);
  }
  const totalSessions = filteredSessions.length;
  const capabilityAdoption = Array.from(taskTypeCounts.entries())
    .map(([taskType, sessionCount]) => ({
      taskType,
      sessionCount,
      percent: totalSessions > 0 ? (sessionCount / totalSessions) * 100 : 0,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  // --- Team usage ---
  const weeksInRange = Math.max(getDaysInRange(from, to) / 7, 1);

  // Group sessions by team
  const sessionsByTeam = new Map<string, AgentSession[]>();
  for (const s of filteredSessions) {
    if (!sessionsByTeam.has(s.teamId)) sessionsByTeam.set(s.teamId, []);
    sessionsByTeam.get(s.teamId)!.push(s);
  }

  // Compute per-team metrics
  const teamMetrics: Array<{
    teamId: string;
    teamName: string;
    sessionsPerUserPerWeek: number;
    successRate: number;
  }> = [];

  const teams = ds.organization.teams;
  const relevantTeams = hasTeamFilter
    ? teams.filter((t) => filters.teamIds!.includes(t.id))
    : teams;

  for (const team of relevantTeams) {
    const teamSessions = sessionsByTeam.get(team.id) ?? [];
    const memberCount = team.memberCount || 1;
    const sessionsPerUserPerWeek = teamSessions.length / (memberCount * weeksInRange);

    // Success rate: verified outcomes / completed sessions (exclude abandoned/active/pending)
    const completed = teamSessions.filter(
      (s) => isCompletedSession(s) && !isPendingVerification(s, nowDate),
    );
    const verified = completed.filter((s) => isVerifiedOutcome(s, nowDate));
    const successRate = completed.length > 0 ? verified.length / completed.length : 0;

    teamMetrics.push({
      teamId: team.id,
      teamName: team.name,
      sessionsPerUserPerWeek: Math.round(sessionsPerUserPerWeek * 100) / 100,
      successRate: Math.round(successRate * 10000) / 10000,
    });
  }

  // Average success rate
  const avgSuccessRate =
    teamMetrics.length > 0
      ? teamMetrics.reduce((sum, t) => sum + t.successRate, 0) / teamMetrics.length
      : 0;

  const teamUsage = teamMetrics.map((t) => ({
    ...t,
    isFailingHighlight: t.successRate < avgSuccessRate,
  }));

  return {
    funnel: { invited, activated, firstOutcome, regular },
    timeToValueMedianDays,
    activeUsersOverTime,
    capabilityAdoption,
    teamUsage,
    periodLabel: formatPeriodLabel(from, to),
    measurementTypes: {
      funnel: 'observed',
      timeToValue: 'observed',
      activeUsers: 'observed',
      capabilityAdoption: 'observed',
      teamUsage: 'observed',
    },
  };
}

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  // Get ISO week number
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

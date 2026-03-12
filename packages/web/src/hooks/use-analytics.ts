import { useQuery } from '@tanstack/react-query';
import type { Filters } from '@agentview/shared';
import {
  getImpactSummary,
  getSpendBreakdown,
  getAdoptionMetrics,
  getQualityMetrics,
  getGovernanceMetrics,
} from '@agentview/shared';

export function useImpactSummary(filters: Filters) {
  return useQuery({
    queryKey: ['impact', filters],
    queryFn: () => getImpactSummary(filters),
  });
}

export function useSpendBreakdown(filters: Filters) {
  return useQuery({
    queryKey: ['spend', filters],
    queryFn: () => getSpendBreakdown(filters),
  });
}

export function useAdoptionMetrics(filters: Filters) {
  return useQuery({
    queryKey: ['adoption', filters],
    queryFn: () => getAdoptionMetrics(filters),
  });
}

export function useQualityMetrics(filters: Filters) {
  return useQuery({
    queryKey: ['quality', filters],
    queryFn: () => getQualityMetrics(filters),
  });
}

export function useGovernanceMetrics(filters: Filters) {
  return useQuery({
    queryKey: ['governance', filters],
    queryFn: () => getGovernanceMetrics(filters),
  });
}

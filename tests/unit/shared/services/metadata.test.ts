import { describe, it, expect, vi, afterAll } from 'vitest';
import { generateDataset } from '../../../../packages/shared/src/mock/generator.js';
import { getMetadata } from '../../../../packages/shared/src/services/metadata.js';
import { MetadataSchema } from '../../../../packages/shared/src/types/metadata.js';

vi.useFakeTimers({ now: new Date('2026-03-01T00:00:00Z') });

afterAll(() => {
  vi.useRealTimers();
});

const dataset = generateDataset({ seed: 42 });

describe('getMetadata', () => {
  it('returns all 5 teams with correct IDs and names', () => {
    const result = getMetadata(dataset);
    expect(result.teams).toHaveLength(5);
    const teamIds = result.teams.map((t) => t.id);
    expect(teamIds).toContain('team-platform');
    expect(teamIds).toContain('team-mobile');
    expect(teamIds).toContain('team-backend');
    expect(teamIds).toContain('team-frontend');
    expect(teamIds).toContain('team-data');
    for (const team of result.teams) {
      expect(team.name).toBeTruthy();
      expect(team.memberCount).toBeGreaterThan(0);
    }
  });

  it('returns all 5 models with correct provider associations', () => {
    const result = getMetadata(dataset);
    expect(result.models).toHaveLength(5);
    const modelIds = result.models.map((m) => m.id);
    expect(modelIds).toContain('claude-sonnet-4');
    expect(modelIds).toContain('claude-haiku-3.5');
    expect(modelIds).toContain('gpt-4o');
    expect(modelIds).toContain('gpt-4o-mini');
    expect(modelIds).toContain('gemini-2.0-flash');

    // Check provider associations
    const anthropicModels = result.models.filter((m) => m.provider === 'Anthropic');
    expect(anthropicModels).toHaveLength(2);
    const openaiModels = result.models.filter((m) => m.provider === 'OpenAI');
    expect(openaiModels).toHaveLength(2);
    const googleModels = result.models.filter((m) => m.provider === 'Google');
    expect(googleModels).toHaveLength(1);
  });

  it('returns all 3 providers', () => {
    const result = getMetadata(dataset);
    expect(result.providers).toHaveLength(3);
    expect(result.providers).toContain('Anthropic');
    expect(result.providers).toContain('OpenAI');
    expect(result.providers).toContain('Google');
  });

  it('returns all 6 task types', () => {
    const result = getMetadata(dataset);
    expect(result.taskTypes).toHaveLength(6);
    expect(result.taskTypes).toContain('code_generation');
    expect(result.taskTypes).toContain('code_review');
    expect(result.taskTypes).toContain('test_writing');
    expect(result.taskTypes).toContain('debugging');
    expect(result.taskTypes).toContain('documentation');
    expect(result.taskTypes).toContain('refactoring');
  });

  it('returns all 3 autonomy levels', () => {
    const result = getMetadata(dataset);
    expect(result.autonomyLevels).toHaveLength(3);
    expect(result.autonomyLevels).toContain('guided');
    expect(result.autonomyLevels).toContain('supervised');
    expect(result.autonomyLevels).toContain('autonomous');
  });

  it('returns valid date range matching the dataset window', () => {
    const result = getMetadata(dataset);
    // Earliest should be in Dec 2025 (90-day window starts Dec 1)
    expect(result.dateRange.earliest).toMatch(/^2025-12-/);
    // Latest should be in Feb 2026 (window ends Feb 28)
    expect(result.dateRange.latest).toMatch(/^2026-02-/);
    // Earliest must be before latest
    expect(result.dateRange.earliest < result.dateRange.latest).toBe(true);
  });

  it('organization info matches dataset', () => {
    const result = getMetadata(dataset);
    expect(result.organization.name).toBe('Acme Corp');
    expect(result.organization.plan).toBe('enterprise');
    expect(result.organization.totalSeats).toBe(50);
  });

  it('validates against MetadataSchema', () => {
    const result = getMetadata(dataset);
    const parsed = MetadataSchema.parse(result);
    expect(parsed).toBeDefined();
  });
});

describe('getMetadata — multi-seed invariants', () => {
  const seeds = [42, 123, 999, 7777, 31415];

  for (const seed of seeds) {
    describe(`seed ${seed}`, () => {
      const ds = generateDataset({ seed });

      it('always returns 5 teams', () => {
        const result = getMetadata(ds);
        expect(result.teams).toHaveLength(5);
      });

      it('always returns 5 models', () => {
        const result = getMetadata(ds);
        expect(result.models).toHaveLength(5);
      });

      it('always returns 3 providers', () => {
        const result = getMetadata(ds);
        expect(result.providers).toHaveLength(3);
      });

      it('always returns 6 task types', () => {
        const result = getMetadata(ds);
        expect(result.taskTypes).toHaveLength(6);
      });

      it('always returns 3 autonomy levels', () => {
        const result = getMetadata(ds);
        expect(result.autonomyLevels).toHaveLength(3);
      });

      it('validates against MetadataSchema', () => {
        const result = getMetadata(ds);
        expect(() => MetadataSchema.parse(result)).not.toThrow();
      });
    });
  }
});

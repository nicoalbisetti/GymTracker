import { useAuth } from '@/context/AuthContext';
import { AI_QUERY_LIMIT } from '@/types/profile';

export interface AiAccessResult {
  canUseAi: boolean;
  queriesLeft: number;
  queriesUsed: number;
  queryLimit: number;
  isPro: boolean;
}

export function useAiAccess(): AiAccessResult {
  const { profile } = useAuth();

  if (!profile) {
    return { canUseAi: false, queriesLeft: 0, queriesUsed: 0, queryLimit: 0, isPro: false };
  }

  const limit = AI_QUERY_LIMIT[profile.plan];
  const used = profile.aiQueriesUsed;
  const left = Math.max(0, limit - used);

  return {
    canUseAi: left > 0,
    queriesLeft: left,
    queriesUsed: used,
    queryLimit: limit,
    isPro: profile.plan === 'pro',
  };
}

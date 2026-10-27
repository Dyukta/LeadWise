export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    claims: ['auth', 'claims'] as const,
    googleEnabled: ['auth', 'google-enabled'] as const,
    session: (userId: string) => ['auth', 'session', userId] as const
  },

  leads: {
    all: ['leads'] as const,
    list: (query: Record<string, unknown>) => ['leads', 'list', query] as const
  },

  calls: ['calls'] as const,

  campaigns: ['campaigns'] as const,

  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const
  },

  performance: {
    all: ['performance'] as const,
    month: (period: string) => ['performance', 'month', period] as const,
    range: (from: string, to: string) => ['performance', 'range', from, to] as const,
    months: () => ['performance', 'months'] as const,
    catalogue: (period: string) => ['performance', 'catalogue', period] as const
  },

  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const
  }
}

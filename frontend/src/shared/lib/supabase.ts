import { createClient } from '@supabase/supabase-js'

import { env } from '@shared/lib/env'

export const supabase = env.supabaseUrl && env.supabaseKey ? createClient(env.supabaseUrl, env.supabaseKey) : null

import { createClient } from '@supabase/supabase-js';

import { Database } from './supabase.types';

const projectURL = import.meta.env.VITE_SUPABASE_URL!;
const projectKey = import.meta.env.VITE_SUPABASE_KEY!;

export const supabase = createClient<Database>(projectURL, projectKey);

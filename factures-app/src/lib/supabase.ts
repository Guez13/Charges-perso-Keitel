import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client Supabase — non branché tant qu'il n'y a pas d'instance (infra "rien
// encore"). On lit les variables d'env Vite ; sans elles, `supabase` est null
// et l'app tourne en mode squelette hors-ligne.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = Boolean(supabase);

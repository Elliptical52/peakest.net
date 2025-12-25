const SUPABASE_URL = "https://lxkfewkhnwrbxpgttlbb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VwP4YA8qgfgq9gSFGbauKw_OnqNGXJi";

// attach explicitly to window
window.sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

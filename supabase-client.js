/* Wagegap — shared Supabase browser client.
   The publishable key is designed to be exposed in the browser; every table
   is protected by row-level security, so it only grants what RLS allows. */
const SUPABASE_URL = "https://utybbdrthxgsijplowup.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_48352eB1w0mLVwvLm3gXUg_BpGKN67o";

window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

import {createClient} from "@supabase/supabase-js";

export const SUPABASE_URL="https://fihrrmoomvwvoqrcnkhe.supabase.co";

export const supabase=createClient(
  SUPABASE_URL,
  "sb_publishable_T0Jwd-MyGnkrhZ-JOLB-pg_fEm8atLb",
  {
    auth:{
      flowType:"pkce",
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  }
);

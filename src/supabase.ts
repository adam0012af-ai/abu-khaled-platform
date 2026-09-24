import {createClient} from "@supabase/supabase-js";

export const supabase=createClient(
  "https://fihrrmoomvwvoqrcnkhe.supabase.co",
  "sb_publishable_T0Jwd-MyGnkrhZ-JOLB-pg_fEm8atLb",
  {
    auth:{
      flowType:"implicit",
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  }
);

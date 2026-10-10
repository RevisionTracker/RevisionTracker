/* Public browser configuration. These values are safe to expose ONLY when RLS is enabled.
   Never put a Supabase service-role key or VAPID private key in this file. */
window.REVISION_APP_CONFIG = {
  supabaseUrl: "https://vjeslsusndovnuexatgp.supabase.co",             // Example: https://YOUR_PROJECT_REF.supabase.co
  supabasePublishableKey: "sb_publishable_K9aHeuPMwns7_Bi5-Hs-yg_HHerkVkY",  // Supabase publishable key or legacy anon key
  vapidPublicKey: ""            // VAPID public key generated for web push; public key only
};

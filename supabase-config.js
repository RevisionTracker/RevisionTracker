/* Public browser configuration. These values are safe to expose ONLY when RLS is enabled.
   Never put a Supabase service-role key or VAPID private key in this file. */
window.REVISION_APP_CONFIG = {
  supabaseUrl: "https://vjeslsusndovnuexatgp.supabase.co",             // Example: https://YOUR_PROJECT_REF.supabase.co
  supabasePublishableKey: "sb_publishable_K9aHeuPMwns7_Bi5-Hs-yg_HHerkVkY",  // Supabase publishable key or legacy anon key
  vapidPublicKey: "BHVf5QhHzK7IW76b-RBq6SsBus40tMPPXKssEnfANFkWsVnOG2CEMjdnzeUhBD0Iv0TzLC0z510e10WWn_9udtA"            // VAPID public key generated for web push; public key only
};

window.MEESOOK_SUPABASE = {
  url: "https://aqfhxoujmsjzutfatlcq.supabase.co",
  anonKey: "sb_publishable_OL-5g5Fao-As4CtRPYXejg_VCyqYXTV"
};

window.MeeSookAuth = (() => {
  const ready = () => window.supabase && window.MEESOOK_SUPABASE?.url &&
    window.MEESOOK_SUPABASE?.anonKey && !window.MEESOOK_SUPABASE.url.includes("YOUR_");
  let client;
  const getClient = () => {
    if (!ready()) return null;
    if (!client) client = window.supabase.createClient(window.MEESOOK_SUPABASE.url, window.MEESOOK_SUPABASE.anonKey);
    return client;
  };
  return {
    ready,
    client: getClient,
    async session() { return (await getClient()?.auth.getSession())?.data?.session || null; },
    async signIn(email, password) {
      const sb = getClient();
      if (!sb) throw new Error("ยังไม่ได้ตั้งค่า Supabase URL และ anon key");
      const { data, error } = await sb.auth.signInWithPassword({email, password});
      if (error) throw error;
      return data.session;
    },
    async signOut() { const sb = getClient(); if (sb) await sb.auth.signOut(); }
  };
})();

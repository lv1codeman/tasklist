export default defineNuxtConfig({
  compatibilityDate: "2026-05-19",
  devtools: { enabled: true },
  pages: true,
  css: ["vuetify/styles"],
  modules: ["vuetify-nuxt-module"],
  ssr: false,

  app: {
    baseURL: "/",
  },

  vuetify: {
    moduleOptions: {
      // ✅ 這裡只放 module 本身設定
    },

    vuetifyOptions: {
      theme: {
        defaultTheme: "light", // ✅ 🔥 正確位置
      },
    },
  },
});

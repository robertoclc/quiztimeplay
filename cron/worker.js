
export default {
  async scheduled(controller, env, ctx) {
    await fetch("https://quiztimeplay.com.br/api/cron", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
    });
  },
};

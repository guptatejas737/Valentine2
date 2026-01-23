const createApp = require("../app");

let cachedAppPromise;

module.exports = async (req, res) => {
  try {
    if (!cachedAppPromise) {
      cachedAppPromise = createApp();
    }
    const app = await cachedAppPromise;
    return app(req, res);
  } catch (err) {
    console.error("Failed to initialize app:", err);
    return res
      .status(500)
      .send("Server misconfigured. Check environment variables.");
  }
};


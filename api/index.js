const createApp = require("../app");

let cachedApp;

module.exports = async (req, res) => {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp(req, res);
};


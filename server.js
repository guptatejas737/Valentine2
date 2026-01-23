require("dotenv").config();
const createApp = require("./app");

const PORT = process.env.PORT || 3000;

createApp()
  .then((app) => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

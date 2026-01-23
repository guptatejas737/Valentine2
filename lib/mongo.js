const mongoose = require("mongoose");

const PRIMARY_MONGO_URI = process.env.MONGO_URI;
const FALLBACK_MONGO_URI = process.env.MONGO_FALLBACK_URI;

const logMongoHelp = (err, uriInUse) => {
  console.error("MongoDB connection error:", err);
  if (uriInUse && uriInUse.includes("mongodb+srv://")) {
    console.error(
      "Tip: If you are using MongoDB Atlas, make sure your IP is in the Atlas allowlist."
    );
  }
};

const cached =
  global._mongoCache ||
  (global._mongoCache = {
    conn: null,
    promise: null,
    uri: null
  });

const attemptConnect = async (uri, label) => {
  try {
    if (label) {
      console.warn(label);
    }
    await mongoose.connect(uri);
    cached.conn = mongoose.connection;
    cached.uri = uri;
    return { connection: cached.conn, uri };
  } catch (err) {
    logMongoHelp(err, uri);
    return null;
  }
};

const connectMongo = async () => {
  if (cached.conn) {
    return { connection: cached.conn, uri: cached.uri };
  }

  if (!PRIMARY_MONGO_URI && !FALLBACK_MONGO_URI) {
    throw new Error(
      "Missing MONGO_URI. Add it to your environment or set MONGO_FALLBACK_URI for local dev."
    );
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      let result = null;
      if (PRIMARY_MONGO_URI) {
        result = await attemptConnect(PRIMARY_MONGO_URI);
      }
      if (!result && FALLBACK_MONGO_URI) {
        result = await attemptConnect(
          FALLBACK_MONGO_URI,
          "Trying MONGO_FALLBACK_URI..."
        );
      }
      if (!result) {
        throw new Error("Failed to connect to MongoDB.");
      }
      return result;
    })();
  }

  return cached.promise;
};

module.exports = { connectMongo };


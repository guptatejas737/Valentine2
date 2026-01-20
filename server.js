require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const morgan = require("morgan");
const passport = require("passport");

require("./config/passport")(passport);

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const inviteRoutes = require("./routes/invites");
const apiRoutes = require("./routes/api");
const publicRoutes = require("./routes/public");

const app = express();

const mongoOptions = {
  serverSelectionTimeoutMS: 5000
};

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, mongoOptions)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });
} else {
  console.warn("MONGO_URI not set. Sessions will be in-memory only.");
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.set("trust proxy", 1);
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }
};

if (process.env.MONGO_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    mongoOptions
  });
}

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
});

app.get("/", (req, res) => {
  if (req.user) {
    return res.redirect("/dashboard");
  }
  return res.render("login");
});

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/invites", inviteRoutes);
app.use("/api", apiRoutes);
app.use("/", publicRoutes);

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found",
    message: "We could not find that page."
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong. Please try again."
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;


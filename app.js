const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const morgan = require("morgan");
const passport = require("passport");

const { connectMongo } = require("./lib/mongo");

require("./config/passport")(passport);

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const inviteRoutes = require("./routes/invites");
const apiRoutes = require("./routes/api");
const publicRoutes = require("./routes/public");
const feedbackRoutes = require("./routes/feedback");
const adminRoutes = require("./routes/admin");

const createApp = async () => {
  const app = express();
  const { uri: activeMongoUri } = await connectMongo();

  app.set("trust proxy", 1);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(morgan("dev"));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.get("/favicon.ico", (req, res) => {
    res.set("Cache-Control", "public, max-age=0, must-revalidate");
    res
      .type("image/png")
      .sendFile(path.join(__dirname, "public", "favicon-32x32.png"));
  });
  app.use(express.static(path.join(__dirname, "public")));

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: activeMongoUri
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      }
    })
  );

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
  app.use("/feedback", feedbackRoutes);
  app.use("/admin", adminRoutes);
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

  return app;
};

module.exports = createApp;


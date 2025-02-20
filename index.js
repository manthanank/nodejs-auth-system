const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const connectDB = require("./config/db");
const routes = require("./routes/auth.routes");
const passport = require("passport");
const errorHandler = require("./middlewares/errorHandler");
const { log } = require("./utils/logger");
const { swaggerUi, specs, swaggerOptions } = require("./config/swagger");
const { NODE_ENV } = require("./config/env");

dotenv.config();
const app = express();

// Add appropriate security headers in production
if (NODE_ENV === 'production') {
  app.use(helmet());
  app.use(compression());
}

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.API_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Passport config
require("./config/passport");

// Database connection
connectDB();

// Routes
app.use("/api/auth", routes);
app.use(
  "/api-docs", 
  swaggerUi.serve, 
  swaggerUi.setup(specs, swaggerOptions)
);

// Root route - modify this
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Authentication API",
    version: "1.0.0",
    documentation: "/api-docs"
  });
});

// Add health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 404 handler - update this
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
});

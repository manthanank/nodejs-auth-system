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

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.API_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());

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

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  log(`Server is running on port ${PORT}`);
});

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const CSS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Node.js Authentication API",
      version: "1.0.0",
      description: "API documentation for the Node.js Authentication System",
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:5000",
        description: "Authentication API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCssUrl: CSS_URL,
  customSiteTitle: "Authentication API Documentation",
  customCss:
    ".swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
};

module.exports = {
  swaggerUi,
  specs,
  swaggerOptions,
};

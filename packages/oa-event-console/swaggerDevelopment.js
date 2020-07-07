module.exports = {
  info: {
    // API informations (required)
    title: 'Panther Console API', // Title (required)
    version: '1.0.0', // Version (required)
  },
  basePath: '/api', // Base path (optional)
  openapi: '3.0.0',
  components: {
    securitySchemes: {
      SessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'panther.sid',
      },
      ApiKeyToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-token',
      },
    },
  },
  security: [{ SessionCookie: [] }],
  servers: [
    {
      url: '{protocol}://{hostname}:{port}/api',
      variables: {
        protocol: {
          enum: ['http', 'https'],
          default: 'http',
        },
        hostname: {
          enum: ['panther.support', 'localhost'],
          default: 'localhost',
        },
        port: {
          enum: [80, 443, 3001, 5001],
          default: 3001,
        },
      },
    },
  ],
};

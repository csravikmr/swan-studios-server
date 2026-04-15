import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
<<<<<<< HEAD
  admin: {
    vite: () => {
      return {
        server: {
          allowedHosts: true,
        },
      }
    },
  },
=======
>>>>>>> 7a05fd79d190ff077258c772bbfb28c9e6702b0b
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
<<<<<<< HEAD
    }
  },
  modules: [
    {
      resolve: "./src/modules/product-media",
      // ADD THIS SECTION BELOW
=======
    },
    // Supports server, worker, or shared modes for architectural scaling
    workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server",
    redisUrl: process.env.REDIS_URL,
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    vite: () => {
      return {
        server: {
          allowedHosts: true,
        },
      }
    },
  },
  modules: [
    // --- Redis Production Modules ---
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: {
        redis: {
          url: process.env.REDIS_URL,
        },
      },
    },
    // --- Custom Local Modules ---
    {
      resolve: "./src/modules/product-media",
>>>>>>> 7a05fd79d190ff077258c772bbfb28c9e6702b0b
      options: {
        links: [
          {
            source: "ProductModuleService",
            label: "ProductCollection",
<<<<<<< HEAD
            target: "productMedia", // This must match the name in your module's index.ts
=======
            target: "productMedia",
>>>>>>> 7a05fd79d190ff077258c772bbfb28c9e6702b0b
            alias: "images",
          },
        ],
      },
    },
    {
      resolve: "./src/modules/invoice-generator",
<<<<<<< HEAD
    }
=======
    },
>>>>>>> 7a05fd79d190ff077258c772bbfb28c9e6702b0b
  ],
})
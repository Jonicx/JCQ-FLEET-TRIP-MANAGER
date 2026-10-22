import { Pool } from 'pg';
import { loadSnapshot, saveChanges, ServerDomain } from './teamData.ts';

// 1. Initialize Postgres Pool connection to Neon
// Ensure DATABASE_URL is set in your environment variables
const connectionString = process.env.DATABASE_URL || 'postgres://username:password@your-neon-host.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for secure Neon server connections
  }
});

console.log("Connecting to Neon Database...");

// 2. Start the HTTP API Server using Bun's fast native runtime engine
Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
  
  async fetch(req) {
    // Enable Cross-Origin Resource Sharing (CORS) so your GitHub Pages frontend can talk to it
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    // Handle preflight OPTIONS requests from web browsers
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(req.url);
    const client = await pool.connect();

    try {
      // Endpoint to pull the latest state data from Neon
      if (url.pathname === "/api/snapshot" && req.method === "GET") {
        const snapshot = await loadSnapshot(client);
        return new Response(JSON.stringify({ success: true, snapshot }), { status: 200, headers });
      }

      // Endpoint to commit mutated domain updates downstream to Neon
      if (url.pathname === "/api/changes" && req.method === "POST") {
        const body = await req.json();
        const { before, after, actorUserId, actorName } = body;

        if (!before || !after || !actorUserId || !actorName) {
          return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400, headers });
        }

        // Commits data changes and bumps the internal version counter automatically
        const nextVersion = await saveChanges(client, before, after, actorUserId, actorName);
        return new Response(JSON.stringify({ success: true, version: nextVersion }), { status: 200, headers });
      }

      // Default fallback catch-all
      return new Response(JSON.stringify({ error: "Endpoint route not found" }), { status: 404, headers });

    } catch (error: any) {
      console.error("Database or execution error:", error);
      return new Response(JSON.stringify({ error: error.message || "Internal server error" }), { status: 500, headers });
    } finally {
      client.release(); // Cleanly return the client worker instance back to the connection pool
    }
  },
});

console.log(`🚀 Backend engine spinning up smoothly on port ${process.env.PORT || 4000}`);

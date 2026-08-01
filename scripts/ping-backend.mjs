#!/usr/bin/env node
/*
 * Keep the Percepta backend awake.
 *
 * Free tiers on Render / Railway / Fly.io sleep instances after ~15 minutes of
 * inactivity. This script pings the backend's /health endpoint on a fixed
 * interval so the instance stays warm while the browser app is idle.
 *
 * Usage:
 *   node scripts/ping-backend.mjs
 *   npm run ping
 *
 * Environment:
 *   PERCEPTA_BACKEND_URL   base URL to ping (default http://localhost:8000)
 *   PING_INTERVAL_MIN      minutes between pings (default 10)
 */

const BASE_URL = process.env.PERCEPTA_BACKEND_URL || 'http://localhost:8000'
const INTERVAL_MIN = Number(process.env.PING_INTERVAL_MIN || 10)
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000
const HEALTH_URL = `${BASE_URL.replace(/\/$/, '')}/health`

function stamp() {
  return new Date().toISOString()
}

async function ping() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(HEALTH_URL, { signal: controller.signal })
    console.log(
      `[${stamp()}] ${res.status} ${res.ok ? 'OK' : '—'} ${HEALTH_URL}`,
    )
  } catch (err) {
    console.error(`[${stamp()}] FAILED ${HEALTH_URL}: ${err.message}`)
  } finally {
    clearTimeout(timer)
  }
}

console.log(
  `Pinging ${HEALTH_URL} every ${INTERVAL_MIN} min (Ctrl+C to stop).`,
)
await ping()
setInterval(ping, INTERVAL_MS)

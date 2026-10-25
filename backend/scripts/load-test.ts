
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/v1`; 
const CONCURRENT_USERS = 150; 
const TOTAL_REQUESTS = 600;

interface TestResult {
  duration: number;
  status: number;
  success: boolean;
}

async function runLoadTest() {
  console.log(`\n🚀 POZHI STUDIO - SYSTEM CAPACITY TEST`);
  console.log(`====================================`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`====================================\n`);

  const results: TestResult[] = [];
  const startTime = performance.now();

  const endpoints = [
    `${API_URL}/pricing/passphoto`,
    `${API_URL}/pricing/photocopies`,
    `${API_URL}/pricing/all`,
    `${BASE_URL}/health`
  ];

  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_USERS) {
    const batchSize = Math.min(CONCURRENT_USERS, TOTAL_REQUESTS - i);
    const batch = Array.from({ length: batchSize }).map(async () => {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const requestStart = performance.now();
      try {
        const response = await fetch(endpoint);
        return {
          duration: performance.now() - requestStart,
          status: response.status,
          success: response.ok
        };
      } catch (error: any) {
        return {
          duration: performance.now() - requestStart,
          status: 500,
          success: false
        };
      }
    });

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    console.log(`Progress: ${Math.round((results.length / TOTAL_REQUESTS) * 100)}% (${results.length}/${TOTAL_REQUESTS})`);
  }

  const totalTime = performance.now() - startTime;
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const avgResponseTime = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  
  const sortedDurations = results.map(r => r.duration).sort((a, b) => a - b);
  const p95 = sortedDurations[Math.floor(results.length * 0.95)] || 0;
  const p99 = sortedDurations[Math.floor(results.length * 0.99)] || 0;

  console.log(`\n📊 PROFESSIONAL PERFORMANCE REPORT`);
  console.log(`------------------------------------`);
  console.log(`System Status:       ${failed.length === 0 ? '🟢 STABLE' : '🟡 STRESSED'}`);
  console.log(`Total Requests:      ${TOTAL_REQUESTS}`);
  console.log(`Test Duration:       ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Throughput:          ${(TOTAL_REQUESTS / (totalTime / 1000)).toFixed(2)} requests/sec`);
  console.log(`Availability:        ${((successful.length / TOTAL_REQUESTS) * 100).toFixed(2)}%`);
  console.log(`Avg Latency:         ${avgResponseTime.toFixed(2)}ms`);
  console.log(`P95 Latency:         ${p95.toFixed(2)}ms`);
  console.log(`P99 Latency:         ${p99.toFixed(2)}ms`);
  console.log(`------------------------------------`);
  
  if (failed.length > 0) {
    console.log(`\n❌ BOTTLENECKS IDENTIFIED: ${failed.length}`);
    const errorCodes = [...new Set(failed.map(f => f.status))];
    console.log(`Error Response Codes: ${errorCodes.join(', ')}`);
  } else {
    console.log(`\n✅ ZERO FAILURES: The load balancer and server handled all concurrent users perfectly.`);
  }

  console.log(`\n✅ Capacity test complete.\n`);
}

runLoadTest().catch(err => {
  console.error('Fatal Test Error:', err.message);
});

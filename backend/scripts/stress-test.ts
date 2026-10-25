
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/v1`; 

async function runStage(concurrent: number, total: number) {
  console.log(`\n🔥 STRESS STAGE: ${concurrent} Concurrent Users / ${total} Total`);
  
  const results: { duration: number; success: boolean; status: number }[] = [];
  const startTime = performance.now();
  const endpoints = [`${API_URL}/pricing/all`, `${BASE_URL}/health`];

  for (let i = 0; i < total; i += concurrent) {
    const batchSize = Math.min(concurrent, total - i);
    const batch = Array.from({ length: batchSize }).map(async () => {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const start = performance.now();
      try {
        const res = await fetch(endpoint, { timeout: 10000 });
        return { duration: performance.now() - start, success: res.ok, status: res.status };
      } catch (e) {
        return { duration: performance.now() - start, success: false, status: 500 };
      }
    });
    results.push(...(await Promise.all(batch)));
  }

  const duration = (performance.now() - startTime) / 1000;
  const success = results.filter(r => r.success).length;
  const avg = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  const p95 = results.map(r => r.duration).sort((a,b) => a-b)[Math.floor(results.length * 0.95)];

  console.log(`- Throughput: ${(total / duration).toFixed(2)} req/s`);
  console.log(`- Success Rate: ${((success / total) * 100).toFixed(2)}%`);
  console.log(`- Avg Latency: ${avg.toFixed(2)}ms`);
  console.log(`- P95 Latency: ${p95.toFixed(2)}ms`);
  
  if (success < total) {
    const errorCodes = [...new Set(results.filter(r => !r.success).map(r => r.status))];
    console.log(`- Error Codes: ${errorCodes.join(', ')}`);
  }
  
  return { successRate: (success / total), p95 };
}

async function stressTest() {
  console.log(`\n🚀 POZHI STUDIO - MAX CAPACITY STRESS TEST`);
  console.log(`==========================================`);

  const stages = [
    { c: 250, t: 500 },
    { c: 500, t: 1000 },
    { c: 750, t: 1500 }
  ];

  for (const stage of stages) {
    const report = await runStage(stage.c, stage.t);
    if (report.successRate < 0.95 || report.p95 > 5000) {
      console.log(`\n⚠️  BREAKING POINT REACHED at ${stage.c} concurrent users.`);
      break;
    }
  }

  console.log(`\n==========================================`);
  console.log(`✅ Stress test complete.`);
}

stressTest();

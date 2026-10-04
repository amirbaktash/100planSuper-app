import http from "k6/http";
import { check } from "k6";
export const options = {
  stages: [ { duration: "2m", target: 100 }, { duration: "5m", target: 500 },
            { duration: "2m", target: 0 } ],
  thresholds: { http_req_duration: ["p(95)<500"], http_req_failed: ["rate<0.01"] } };
const BASE = __ENV.E2E_API || "http://localhost:8080";
export default function () {
  const r = http.get(`${BASE}/nav/current`);
  check(r, { "NAV 200": (res) => res.status === 200, "fast": (res) => res.timings.duration < 500 });
}
// اجرا: k6 run e2e/load-test.js

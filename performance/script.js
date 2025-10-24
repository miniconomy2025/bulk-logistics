import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE_ENDPOINT = "https://team7-todo.xyz/api";

export const options = {
  discardResponseBodies: false,

  stages: [
    // === LOAD TEST ===
    { duration: "1m", target: 200 }, // ramp-up to 200
    { duration: "1m30s", target: 200 }, // stay at 200
    { duration: "1m", target: 0 }, // ramp-down

    // === STRESS TEST ===
    { duration: "1m", target: 500 }, // ramp to 500
    { duration: "1m30s", target: 1000 }, // ramp to 1000
    { duration: "1m30s", target: 1200 }, // ramp to 1500
    { duration: "1m30s", target: 0 }, // ramp-down

    // === SPIKE TEST
    { duration: "20s", target: 50 }, // normal
    { duration: "30s", target: 1500 }, // sudden spike
    { duration: "30s", target: 1500 }, // sustain
    { duration: "20s", target: 50 }, // drop
    { duration: "30s", target: 0 }, // final ramp-down
  ],

  thresholds: {
    http_req_failed: ["rate<0.05"], // error rate belowe 5%
    http_req_duration: ["p(95)<500"], // 95% requests under 500ms
  },
};

export function handleSummary(data) {
  return {
    "summary.html": htmlReport(data),
  };
}

function getRandomItem(arr) {
  const randomNumber = Math.random();
  const scaledNumber = randomNumber * arr.length;
  const randomIndex = Math.floor(scaledNumber);
  return arr[randomIndex];
}

export default function () {
  const endpoints = [
    "/transactions",
    "/transactions/totals",
    "/transactions/monthly",
    "/transactions/top-sources",
    "/transactions/breakdown",
  ];

  http.get(API_BASE_ENDPOINT + getRandomItem(endpoints));
  check(true, { "status was 200": (r) => r.status === 200 });
  check(true, { "status was 429": (r) => r.status === 429 });
  sleep(Math.floor(Math.random() * 3) + 1);
}

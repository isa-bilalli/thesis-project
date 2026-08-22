import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";

interface PerformanceMonitor {
  stop: () => void;
}

function numericEnvironment(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function startPerformanceMonitor(): PerformanceMonitor | null {
  if (process.env.ENABLE_PERFORMANCE_METRICS !== "true") {
    return null;
  }

  const outputFile = process.env.PERFORMANCE_METRICS_FILE?.trim();
  if (!outputFile) {
    throw new Error(
      "PERFORMANCE_METRICS_FILE is required when performance metrics are enabled",
    );
  }

  const resolvedOutput = path.resolve(outputFile);
  mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  writeFileSync(
    resolvedOutput,
    "timestamp,rss_bytes,heap_used_bytes,heap_total_bytes,external_bytes,cpu_user_micros,cpu_system_micros,event_loop_p50_ms,event_loop_p95_ms,event_loop_p99_ms,event_loop_max_ms\n",
    "utf8",
  );

  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  let previousCpu = process.cpuUsage();
  let stopped = false;

  const sample = () => {
    const memory = process.memoryUsage();
    const currentCpu = process.cpuUsage();
    const cpuUser = currentCpu.user - previousCpu.user;
    const cpuSystem = currentCpu.system - previousCpu.system;
    previousCpu = currentCpu;

    const nanosecondsToMilliseconds = (value: number) =>
      Number.isFinite(value) ? value / 1_000_000 : 0;

    appendFileSync(
      resolvedOutput,
      [
        new Date().toISOString(),
        memory.rss,
        memory.heapUsed,
        memory.heapTotal,
        memory.external,
        cpuUser,
        cpuSystem,
        nanosecondsToMilliseconds(histogram.percentile(50)).toFixed(3),
        nanosecondsToMilliseconds(histogram.percentile(95)).toFixed(3),
        nanosecondsToMilliseconds(histogram.percentile(99)).toFixed(3),
        nanosecondsToMilliseconds(histogram.max).toFixed(3),
      ].join(",") + "\n",
      "utf8",
    );
    histogram.reset();
  };

  const interval = setInterval(
    sample,
    numericEnvironment("PERFORMANCE_SAMPLE_INTERVAL_MS", 1_000),
  );
  interval.unref();

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      sample();
      histogram.disable();
    },
  };
}

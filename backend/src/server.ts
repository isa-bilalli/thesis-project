import "dotenv/config";
import app from "./app"
import { startPerformanceMonitor } from "./shared/performance/performance-monitor.js";

const port = process.env.PORT || 3000;
const performanceMonitor = startPerformanceMonitor();

const server = app.listen(port, () =>{
    console.log(`backend initialized on http://localhost:${port}`);
});
let isShuttingDown = false;

function shutdown(signal: string): void {
    if (isShuttingDown) return;
    isShuttingDown = true;
    performanceMonitor?.stop();
    server.close(() => {
        console.log(`backend stopped after ${signal}`);
        process.exit(0);
    });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

const performanceAutoExitMs = Number(process.env.PERFORMANCE_AUTO_EXIT_MS ?? 0);
if (Number.isFinite(performanceAutoExitMs) && performanceAutoExitMs > 0) {
    setTimeout(
        () => shutdown("PERFORMANCE_AUTO_EXIT"),
        performanceAutoExitMs,
    );
}

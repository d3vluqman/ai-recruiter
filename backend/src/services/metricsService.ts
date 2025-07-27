import { EventEmitter } from "events";
import { logger } from "../utils/logger";

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  type: "counter" | "gauge" | "histogram" | "timer";
}

export interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

class MetricsService extends EventEmitter {
  private metrics: Map<string, any> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private timers: Map<string, { start: number; samples: number[] }> = new Map();
  private isEnabled: boolean;

  constructor() {
    super();
    this.isEnabled = process.env.METRICS_ENABLED !== "false";

    if (this.isEnabled) {
      // Collect system metrics every 30 seconds
      setInterval(() => {
        this.collectSystemMetrics();
      }, 30000);

      // Reset histograms every 5 minutes to prevent memory growth
      setInterval(() => {
        this.resetHistograms();
      }, 5 * 60 * 1000);
    }
  }

  // Counter metrics (monotonically increasing)
  incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ) {
    if (!this.isEnabled) return;

    const key = this.getMetricKey(name, tags);
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue + value;

    this.counters.set(key, newValue);
    this.emitMetric({
      name,
      value: newValue,
      timestamp: new Date(),
      tags,
      type: "counter",
    });

    logger.debug(`Counter ${name} incremented`, { value: newValue, tags });
  }

  // Gauge metrics (can go up or down)
  setGauge(name: string, value: number, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);

    this.emitMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: "gauge",
    });

    logger.debug(`Gauge ${name} set`, { value, tags });
  }

  // Histogram metrics (for distributions)
  recordHistogram(name: string, value: number, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    const key = this.getMetricKey(name, tags);
    const samples = this.histograms.get(key) || [];
    samples.push(value);

    // Keep only last 1000 samples to prevent memory issues
    if (samples.length > 1000) {
      samples.shift();
    }

    this.histograms.set(key, samples);

    this.emitMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: "histogram",
    });

    logger.debug(`Histogram ${name} recorded`, { value, tags });
  }

  // Timer metrics (for measuring durations)
  startTimer(name: string, tags?: Record<string, string>): string {
    if (!this.isEnabled) return "";

    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    const key = this.getMetricKey(name, tags);

    if (!this.timers.has(key)) {
      this.timers.set(key, { start: 0, samples: [] });
    }

    const timer = this.timers.get(key)!;
    timer.start = Date.now();

    return timerId;
  }

  endTimer(name: string, timerId: string, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    const key = this.getMetricKey(name, tags);
    const timer = this.timers.get(key);

    if (!timer || timer.start === 0) {
      logger.warn(`Timer ${name} not found or not started`);
      return;
    }

    const duration = Date.now() - timer.start;
    timer.samples.push(duration);
    timer.start = 0;

    // Keep only last 1000 samples
    if (timer.samples.length > 1000) {
      timer.samples.shift();
    }

    this.emitMetric({
      name,
      value: duration,
      timestamp: new Date(),
      tags,
      type: "timer",
    });

    logger.debug(`Performance: ${name}`, { duration, tags });
  }

  // Get all metrics summary
  getAllMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, HistogramData | null>;
    timers: Record<string, HistogramData | null>;
  } {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, HistogramData | null> = {};
    const timers: Record<string, HistogramData | null> = {};

    this.counters.forEach((value, key) => {
      counters[key] = value;
    });

    this.gauges.forEach((value, key) => {
      gauges[key] = value;
    });

    this.histograms.forEach((samples, key) => {
      histograms[key] = this.calculateHistogramStats(samples);
    });

    this.timers.forEach((timer, key) => {
      timers[key] = this.calculateHistogramStats(timer.samples);
    });

    return { counters, gauges, histograms, timers };
  }

  // System metrics collection
  private collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Memory metrics
      this.setGauge("system.memory.heap_used", memUsage.heapUsed);
      this.setGauge("system.memory.heap_total", memUsage.heapTotal);
      this.setGauge("system.memory.external", memUsage.external);
      this.setGauge("system.memory.rss", memUsage.rss);

      // CPU metrics
      this.setGauge("system.cpu.user", cpuUsage.user);
      this.setGauge("system.cpu.system", cpuUsage.system);

      // Process metrics
      this.setGauge("system.process.uptime", process.uptime());
      this.setGauge("system.process.pid", process.pid);

      // Event loop lag (approximate)
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        this.setGauge("system.event_loop.lag", lag);
      });
    } catch (error) {
      logger.error("Failed to collect system metrics", error);
    }
  }

  private resetHistograms() {
    // Clear old histogram data to prevent memory leaks
    this.histograms.clear();
    this.timers.forEach((timer) => {
      timer.samples = [];
    });

    logger.debug("Histogram data reset");
  }

  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(",");

    return `${name}{${tagString}}`;
  }

  private calculateHistogramStats(samples: number[]): HistogramData | null {
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sum / count;

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      count,
      sum,
      min,
      max,
      avg,
      p50: sorted[p50Index],
      p95: sorted[p95Index],
      p99: sorted[p99Index],
    };
  }

  private emitMetric(metric: Metric) {
    this.emit("metric", metric);
  }

  // Enable/disable metrics collection
  enable() {
    this.isEnabled = true;
    logger.info("Metrics collection enabled");
  }

  disable() {
    this.isEnabled = false;
    logger.info("Metrics collection disabled");
  }

  isMetricsEnabled(): boolean {
    return this.isEnabled;
  }
}

export const metricsService = new MetricsService();

// Middleware for HTTP request metrics
export const httpMetricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const timerId = metricsService.startTimer("http.request.duration", {
    method: req.method,
    route: req.route?.path || req.path,
  });

  // Increment request counter
  metricsService.incrementCounter("http.requests.total", 1, {
    method: req.method,
    route: req.route?.path || req.path,
  });

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode.toString();
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;

    // End timer
    metricsService.endTimer("http.request.duration", timerId, {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: statusCode,
      status_class: statusClass,
    });

    // Record response time histogram
    metricsService.recordHistogram("http.response.time", duration, {
      method: req.method,
      status_class: statusClass,
    });

    // Increment response counter
    metricsService.incrementCounter("http.responses.total", 1, {
      method: req.method,
      status_code: statusCode,
      status_class: statusClass,
    });

    // Log HTTP request
    logger.info(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode}`, {
      duration,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user?.userId,
    });
  });

  next();
};

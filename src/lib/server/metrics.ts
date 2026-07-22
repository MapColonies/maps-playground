import client from 'prom-client';

export const register = client.register;

// Guard: only start default-metric collection once per process.
if (!register.getSingleMetric('process_cpu_user_seconds_total')) {
	client.collectDefaultMetrics({ register });
}

function counter(config: client.CounterConfiguration<string>): client.Counter<string> {
	return (
		(register.getSingleMetric(config.name) as client.Counter<string>) ?? new client.Counter(config)
	);
}

function histogram(config: client.HistogramConfiguration<string>): client.Histogram<string> {
	return (
		(register.getSingleMetric(config.name) as client.Histogram<string>) ??
		new client.Histogram(config)
	);
}

export const httpRequestsTotal = counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = histogram({
	name: 'http_request_duration_seconds',
	help: 'HTTP request duration in seconds',
	labelNames: ['method', 'route', 'status_code']
});

export const demoViewsTotal = counter({
	name: 'demo_views_total',
	help: 'Total number of demo views',
	labelNames: ['client', 'name']
});

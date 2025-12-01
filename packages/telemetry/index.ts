import { trace } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let provider: NodeTracerProvider | null = null;

export function initTelemetry(serviceName: string): void {
  if (provider) {
    return;
  }

  provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const exporter = endpoint
    ? new OTLPTraceExporter({ url: endpoint })
    : new ConsoleSpanExporter();

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();
}

export function getTracer(name: string) {
  return trace.getTracer(name);
}

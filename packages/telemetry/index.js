"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = initTelemetry;
exports.getTracer = getTracer;
const api_1 = require("@opentelemetry/api");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
let provider = null;
function initTelemetry(serviceName) {
    if (provider) {
        return;
    }
    provider = new sdk_trace_node_1.NodeTracerProvider({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
    });
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const exporter = endpoint
        ? new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: endpoint })
        : new sdk_trace_base_1.ConsoleSpanExporter();
    provider.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(exporter));
    provider.register();
}
function getTracer(name) {
    return api_1.trace.getTracer(name);
}
//# sourceMappingURL=index.js.map
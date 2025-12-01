"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosteditBatcher = void 0;
const api_1 = require("@opentelemetry/api");
const schema_1 = require("../../../packages/streams/schema");
const refs_1 = require("../../../packages/streams/refs");
const miniox_1 = require("../../../packages/miniox");
const telemetry_1 = require("../../../packages/telemetry");
const tracer = (0, telemetry_1.getTracer)('postedit-service');
class PosteditBatcher {
    config;
    queue = [];
    timer = null;
    constructor(config) {
        this.config = config;
    }
    enqueue(msg) {
        return new Promise((resolve, reject) => {
            this.queue.push({ msg, resolve, reject });
            if (this.queue.length >= this.config.maxItems) {
                void this.flush();
            }
            else if (!this.timer) {
                this.timer = setTimeout(() => void this.flush(), this.config.flushMs);
            }
        });
    }
    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    async flush() {
        this.clearTimer();
        if (!this.queue.length) {
            return;
        }
        const batch = this.queue.splice(0, this.queue.length);
        const span = tracer.startSpan('postedit.batch', {
            attributes: {
                'postedit.batch_size': batch.length,
            },
        });
        try {
            const inputs = await Promise.all(batch.map(async (entry) => {
                const ref = (0, refs_1.parseObjectRef)(entry.msg.content_ref);
                const text = await (0, miniox_1.getTextObject)(this.config.minio, ref.bucket, ref.key);
                return { entry, text, bucket: ref.bucket };
            }));
            const payload = inputs.map(({ entry, text }) => ({
                line_idx: entry.msg.line_idx,
                text,
            }));
            const response = await this.config.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
                temperature: 0.2,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a localization editor. Given JSON input containing translated lines, improve each line. Preserve placeholders and formatting. Return JSON with an array field "lines" mirroring the input order. Each object must contain line_idx and text fields. Respond with JSON only.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({ lines: payload }),
                    },
                ],
            });
            const raw = response.choices[0]?.message?.content ?? '{"lines":[]}';
            const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            const outputs = new Map();
            for (const item of parsed.lines ?? []) {
                outputs.set(item.line_idx, item.text);
            }
            for (const { entry, bucket } of inputs) {
                const { msg } = entry;
                const postedited = outputs.get(msg.line_idx) ?? payload.find((p) => p.line_idx === msg.line_idx)?.text ?? '';
                const outRef = msg.out_ref ??
                    (0, refs_1.buildStageRef)('postedited', msg.file_id, msg.line_idx, bucket);
                const dest = (0, refs_1.parseObjectRef)(outRef);
                await (0, miniox_1.putTextObject)(this.config.minio, dest.bucket, dest.key, postedited);
                const nextOutRef = (0, refs_1.buildStageRef)('cleaned', msg.file_id, msg.line_idx, dest.bucket);
                const nextMessage = {
                    ...msg,
                    content_ref: outRef,
                    out_ref: nextOutRef,
                    attempt: 1,
                    dedup_id: (0, schema_1.dedupId)('special_chars', msg.file_id, msg.line_idx),
                };
                entry.resolve({ next: nextMessage });
            }
            span.setStatus({ code: api_1.SpanStatusCode.OK });
        }
        catch (err) {
            span.recordException(err);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR });
            for (const entry of batch) {
                entry.reject(err);
            }
        }
        finally {
            span.end();
        }
    }
}
exports.PosteditBatcher = PosteditBatcher;

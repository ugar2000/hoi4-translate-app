"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedis = createRedis;
exports.delay = delay;
exports.fieldsToObject = fieldsToObject;
exports.objectToArray = objectToArray;
const ioredis_1 = __importDefault(require("ioredis"));
function createRedis(connectionName) {
    const host = process.env.REDIS_HOST ?? 'redis';
    const port = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);
    return new ioredis_1.default({
        host,
        port,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectionName,
    });
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function fieldsToObject(fields) {
    const output = {};
    for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i];
        const value = fields[i + 1];
        if (key === undefined || value === undefined) {
            continue;
        }
        output[key.toString()] = value.toString();
    }
    return output;
}
function objectToArray(payload) {
    const entries = [];
    for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) {
            continue;
        }
        entries.push(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return entries;
}

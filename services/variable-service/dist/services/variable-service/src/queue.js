"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToQueue = exports.variableQueue = void 0;
const bull_1 = __importDefault(require("bull"));
exports.variableQueue = new bull_1.default('variables', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});
const addToQueue = async (hash, variable) => {
    await exports.variableQueue.add({ hash, variable });
};
exports.addToQueue = addToQueue;
//# sourceMappingURL=queue.js.map
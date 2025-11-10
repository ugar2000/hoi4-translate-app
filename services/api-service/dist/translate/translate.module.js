"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const translate_controller_1 = require("./translate.controller");
const translate_service_1 = require("./translate.service");
const translate_gateway_1 = require("./translate.gateway");
const coordinator_client_1 = require("./coordinator.client");
// import { createMinio } from '../../../../packages/miniox';
// export const MINIO_TOKEN = 'MINIO_CLIENT';
let TranslateModule = class TranslateModule {
};
exports.TranslateModule = TranslateModule;
exports.TranslateModule = TranslateModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [translate_controller_1.TranslateController],
        providers: [
            translate_service_1.TranslateService,
            translate_gateway_1.TranslateGateway,
            {
                provide: coordinator_client_1.CoordinatorClient,
                useFactory: (config) => {
                    const address = config.get('COORDINATOR_ADDRESS', 'localhost:50051');
                    return new coordinator_client_1.CoordinatorClient(address);
                },
                inject: [config_1.ConfigService],
            },
            // {
            //   provide: MINIO_TOKEN,
            //   useFactory: () => createMinio('api-service'),
            // },
        ],
        exports: [coordinator_client_1.CoordinatorClient /* , MINIO_TOKEN */],
    })
], TranslateModule);

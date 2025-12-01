"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableSeparator = void 0;
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const VARIABLE_PATTERN = /\[([^\]]+)\]/g;
const SPECIAL_CODES = [
    "§!", "§C", "§L", "§W", "§B", "§G", "§R", "§b", "§g", "§Y", "§H",
    "§T", "§O", "§0", "§1", "§2", "§3", "§4", "§5", "§6", "§7", "§8",
    "§9", "§t"
];
const SORTED_SPECIAL_CODES = SPECIAL_CODES.sort((a, b) => b.length - a.length);
class VariableSeparator {
    generateHash(text) {
        return (0, crypto_1.createHash)('md5').update(text + (0, uuid_1.v4)()).digest('hex').slice(0, 8);
    }
    extractVariables(text) {
        const variables = [];
        let processedText = text;
        SORTED_SPECIAL_CODES.forEach(code => {
            const regex = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            if (regex.test(processedText)) {
                const hash = this.generateHash(code);
                variables.push({ hash, value: code });
                processedText = processedText.replace(regex, `{${hash}}`);
            }
        });
        let match;
        while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
            const fullMatch = match[0];
            const hash = this.generateHash(fullMatch);
            variables.push({ hash, value: fullMatch });
            processedText = processedText.replace(fullMatch, `{${hash}}`);
        }
        return { variables, processedText };
    }
    separateVariables(text) {
        const { variables, processedText } = this.extractVariables(text);
        return {
            processedText,
            variables
        };
    }
    restoreVariables(text, variables) {
        let restoredText = text;
        variables.forEach(({ hash, value }) => {
            const regex = new RegExp(`{${hash}}`, 'g');
            restoredText = restoredText.replace(regex, value);
        });
        return restoredText;
    }
}
exports.VariableSeparator = VariableSeparator;
//# sourceMappingURL=variableSeparator.js.map
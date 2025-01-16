import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SeparationResult, Variable } from './types';

const VARIABLE_PATTERN = /\[([^\]]+)\]/g;

const SPECIAL_CODES = [
  "§!", "§C", "§L", "§W", "§B", "§G", "§R", "§b", "§g", "§Y", "§H", 
  "§T", "§O", "§0", "§1", "§2", "§3", "§4", "§5", "§6", "§7", "§8", 
  "§9", "§t"
];

// Sort by length in descending order to handle longer codes first
const SORTED_SPECIAL_CODES = SPECIAL_CODES.sort((a, b) => b.length - a.length);

export class VariableSeparator {
  private generateHash(text: string): string {
    return createHash('md5').update(text + uuidv4()).digest('hex').slice(0, 8);
  }

  private extractVariables(text: string): { variables: Variable[]; processedText: string } {
    const variables: Variable[] = [];
    let processedText = text;

    // First handle special formatting codes
    SORTED_SPECIAL_CODES.forEach(code => {
      const regex = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (regex.test(processedText)) {
        const hash = this.generateHash(code);
        variables.push({ hash, value: code });
        processedText = processedText.replace(regex, `{${hash}}`);
      }
    });

    // Then handle Paradox variables
    let match;
    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      const fullMatch = match[0];
      const hash = this.generateHash(fullMatch);
      variables.push({ hash, value: fullMatch });
      processedText = processedText.replace(fullMatch, `{${hash}}`);
    }

    return { variables, processedText };
  }

  public separateVariables(text: string): SeparationResult {
    const { variables, processedText } = this.extractVariables(text);
    return {
      processedText,
      variables
    };
  }

  public restoreVariables(text: string, variables: Variable[]): string {
    let restoredText = text;
    variables.forEach(({ hash, value }) => {
      const regex = new RegExp(`{${hash}}`, 'g');
      restoredText = restoredText.replace(regex, value);
    });
    return restoredText;
  }
}

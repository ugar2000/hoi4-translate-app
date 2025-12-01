import { SeparationResult, Variable } from './types';
export declare class VariableSeparator {
    private generateHash;
    private extractVariables;
    separateVariables(text: string): SeparationResult;
    restoreVariables(text: string, variables: Variable[]): string;
}

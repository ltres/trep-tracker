import { Board } from "./types";

export interface AiServiceI{
    getInsight(board: Board): Promise<string>;
    getApiKey(): string | null;
    setApiKey(key: string | null): void;
}
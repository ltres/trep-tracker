import { ChatGPTService } from "../service/chat-gpt.service";
import { ClaudeService } from "../service/claude.service";
import { StorageService } from "../service/storage.service";
import { Environment } from "../types/environment";

export const environment = {
    storageService: StorageService,
    aiService: ChatGPTService,
    version: '0.8.0-beta',
};

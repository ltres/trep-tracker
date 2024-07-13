import { version } from "uuid";
import { StorageService } from "../service/storage.service";
import { Environment } from "../types/environment";
import { ClaudeService } from "../service/claude.service";
import { ChatGPTService } from "../service/chat-gpt.service";

export const environment = {
    storageService: StorageService,
    aiService: ChatGPTService,
    version: '0.8.0-beta',
};
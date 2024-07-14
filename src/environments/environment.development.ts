import { ChatGPTService } from "../service/chat-gpt.service";
import { ClaudeService } from "../service/claude.service";
import { LocalFileStorageService } from "../service/local-file-storage.service";
import { Environment } from "../types/environment";

export const environment = {
    storageService: LocalFileStorageService,
    aiService: ChatGPTService
};

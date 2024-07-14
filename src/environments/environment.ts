import { version } from "uuid";
import { LocalFileStorageService } from "../service/local-file-storage.service";
import { Environment } from "../types/environment";
import { ClaudeService } from "../service/claude.service";
import { ChatGPTService } from "../service/chat-gpt.service";

export const environment = {
    storageService: LocalFileStorageService,
    aiService: ChatGPTService
};
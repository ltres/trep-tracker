import { ChatGPTService } from "../service/chat-gpt.service";
import { ClaudeService } from "../service/claude.service";
import { ElectronService } from "../service/electron.service";

export const environment = {
    storageService: ElectronService,
    aiService: ChatGPTService
};
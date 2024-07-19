import { ChatGPTService } from "../service/chat-gpt.service";
import { ElectronService } from "../service/electron.service";

export const environment = {
    storageService: ElectronService,
    aiService: ChatGPTService
};
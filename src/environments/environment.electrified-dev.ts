import { ChatGPTService } from "../service/chat-gpt.service";
import { ElectronService } from "../service/electron.service";

export const environment = {
    storageService: ElectronService,
    aiService: ChatGPTService,
    userVersion: "0.17.0-beta",
    environment: 'electrified-dev'
};
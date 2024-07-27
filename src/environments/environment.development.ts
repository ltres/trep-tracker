import { ChatGPTService } from "../service/chat-gpt.service";
import { LocalFileStorageService } from "../service/local-file-storage.service";

export const environment = {
    storageService: LocalFileStorageService,
    aiService: ChatGPTService,
    userVersion: "0.17.0-beta",
    environment: 'development'
};

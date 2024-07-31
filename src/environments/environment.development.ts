import { ChatGPTService } from '../service/chat-gpt.service';
import { LocalFileStorageService } from '../service/local-file-storage.service';

export const environment = {
  storageService: LocalFileStorageService,
  aiService: ChatGPTService,
  userVersion: '1.2.0-preview',
  environment: 'development',
};

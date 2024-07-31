import { LocalFileStorageService } from '../service/local-file-storage.service';
import { ChatGPTService } from '../service/chat-gpt.service';

export const environment = {
  storageService: LocalFileStorageService,
  aiService: ChatGPTService,
  userVersion: '1.2.0-preview',
  environment: 'default',
};

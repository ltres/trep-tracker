import { ChatGPTService } from '../service/chat-gpt.service';
import { LocalFileStorageService } from '../service/local-file-storage.service';

export const environment = {
  storageService: LocalFileStorageService,
  aiService: ChatGPTService,
  userVersion: '1.1.3-alpha',
  environment: 'github-pages',
};

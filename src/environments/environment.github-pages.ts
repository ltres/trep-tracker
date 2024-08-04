import { LocalFileStorageService } from '../service/local-file-storage.service';
import { Environment } from '../types/types';

export const environment: Environment = {
  storageService: LocalFileStorageService,
  userVersion: '1.6.0-beta',
  environment: 'github-pages',
};

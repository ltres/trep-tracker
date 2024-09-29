import{ LocalFileStorageService }from'../service/local-file-storage.service';
import{ Environment }from'../types/types';

export const environment: Environment = {
  storageService: LocalFileStorageService,
  userVersion: '2.3.0-beta',
  environment: 'default',
};

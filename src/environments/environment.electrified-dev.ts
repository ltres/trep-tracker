import { ElectronService } from '../service/electron.service';
import { Environment } from '../types/types';

export const environment: Environment = {
  storageService: ElectronService,
  userVersion: '1.6.0-preview',
  environment: 'electrified-dev',
};

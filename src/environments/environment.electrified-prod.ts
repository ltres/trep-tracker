import { ElectronService } from '../service/electron.service';
import { Environment } from '../types/types';

export const environment: Environment = {
  storageService: ElectronService,
  userVersion: '1.3.0-alpha',
  environment: 'electrified-prod',
};

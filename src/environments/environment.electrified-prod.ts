import { ElectronService } from '../service/electron.service';
import { Environment } from '../types/types';

export const environment: Environment = {
  storageService: ElectronService,
  userVersion: '2.0.1-beta',
  environment: 'electrified-prod',
};

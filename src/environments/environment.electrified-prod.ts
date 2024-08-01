import { ElectronService } from '../service/electron.service';
import { Environment } from './environment';

export const environment: Environment = {
  storageService: ElectronService,
  userVersion: '1.2.1-preview',
  environment: 'electrified-prod',
};

import{ ElectronService }from'../service/electron.service';
import{ Environment }from'../types/types';

export const environment: Environment = {
  storageService: ElectronService,
  userVersion: '2.5.1-beta',
  environment: 'electrified-dev',
};

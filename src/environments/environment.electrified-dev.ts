import{ ElectronService }from'../service/electron.service';
import{ Environment }from'../types/types';

export const environment: Environment = {
  storageService: ElectronService,
  userVersion: '2.4.0-beta',
  environment: 'electrified-dev',
};

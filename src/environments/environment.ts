import { version } from "uuid";
import { StorageService } from "../service/storage.service";
import { Environment } from "../types/environment";

export const environment = {
    storageService: StorageService,
    version: '0.8.0-beta',
};


export abstract class StorageServiceAbstract{
    abstract init(): void;
    abstract isStatusPresent():boolean;
    abstract openAppStatus(fileEvent?: Event): Promise<string | undefined> 
    abstract createStatusFile(): Promise<string | undefined> 
    abstract writeToStatusFile( status: Object ): void 
    
}
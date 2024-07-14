

export abstract class StorageServiceAbstract {
    /**
     * True if a status is present
     */
    abstract isStatusLocationConfigured(): boolean;

    /**
     * Returns the current status location
     * */
    abstract getStatusLocation(): string | undefined;

    /**
     * Reads the status file and returns the content.
     * Can accept a file chooser event.
     */
    abstract openStatus(event?:Event): Promise<string | undefined>

    /**
     * Creates a new status. Returns the path to the new status file.
     */
    abstract createNewStatus(): Promise<string | undefined>

    /**
     * Writes the status object to the current status location
     * @param status 
     */
    abstract writeToStatus(status: Object): void

}
import { Observable } from "rxjs";


export abstract class StorageServiceAbstract {
    /**
     * True if a status is present
     */
    abstract isStatusPresent(): boolean;

    /**
     * Returns the current status
     * */
    abstract getStatus(): string | null;

    /**
     * Reads the status file and returns the content.
     * Can accept a file chooser event.
     */
    abstract openStatus(event?:Event): Promise<string | undefined>

    /**
     * Creates a new status. Returns true when finished.
     */
    abstract createNewStatus(): Promise<boolean>

    /**
     * Writes the status object to the current status location
     * @param status 
     */
    abstract writeToStatus(status: Object): void

    /**
     * Returns an observable that emits the status content when it changes outside the Angular app
     */
    abstract getStatusChangeOutsideAppObservable(): Observable<string | null>

}
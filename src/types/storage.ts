import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';

export abstract class StorageServiceAbstract {
  constructor(protected zone?: NgZone,){ };
    
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
   * Can accept a file chooser event or a stringified status.
   */
  abstract openStatus(event?: Event | string): Promise<string | undefined>;

  /**
   * Creates a new status. Returns true when finished.
   */
  abstract createNewStatus(): Promise<boolean>;

  /**
   * Writes the status object to the current status location
   * @param status
   */
  abstract writeToStatus(status: object): void;

  /**
   * Returns an observable that emits the status content when it changes outside the Angular app
   */
  abstract getStatusChangeOutsideAppObservable(): Observable<string | null>;
}

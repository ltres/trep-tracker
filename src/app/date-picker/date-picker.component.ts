import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { Recurrence } from "@ltres/angular-datetime-picker/lib/utils/constants";
import { locale } from "../../types/config";
import { DateTimeAdapter } from "@ltres/angular-datetime-picker";

const ONE_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'date-picker',
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements AfterViewInit{
  @Input() startDate: Date | undefined = new Date(Date.now() - ONE_DAY);
  @Input() endDate: Date | undefined = new Date(Date.now() + ONE_DAY)
  @Input() recurrence: Recurrence | undefined;

  @Output() onDatesSelected:EventEmitter<[Date, Date]> = new EventEmitter();
  @Output() onCancel:EventEmitter<void> = new EventEmitter();
  @Output() onRecurrenceUpdate:EventEmitter<Recurrence | undefined> = new EventEmitter();

  @ViewChild('trigger') trigger: ElementRef<{click:() =>unknown}> | null = null;
  public selectedMoments: Date[] | undefined;
  protected initialized = false;

  dateTime = false
  today = new Date();

  constructor(dateTimeAdapter: DateTimeAdapter<unknown>){
    dateTimeAdapter.setLocale(locale.long);
  }

  ngAfterViewInit(){ 
    this.startDate = this.startDate ?? new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 0, 1, 0);
    this.endDate = this.endDate ??  new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 23, 59, 0);

    this.selectedMoments =[
      this.startDate,
      this.endDate
    ]
    this.initialized = true
    this.trigger?.nativeElement.click();
  }

  protected selectedTrigger(date: Date | Date[]): void {
    if(!date || !Array.isArray(date) || date.length !== 2){
      console.warn("Undefined date");
      return;
    }
    this.onDatesSelected.emit([date[0],date[1]])
  }

  protected cancelTrigger(): void {
    this.onCancel.emit()
  }
  
  getEndAt(): Date {
    return this.endDate ?? new Date();
  }
  getStartAt(): Date {
    return this.startDate ?? new Date();
  }
  getRecurrence(): Recurrence | undefined {
    return this.recurrence
  }
  updateRecurrence($event: Recurrence) {
    this.onRecurrenceUpdate.emit($event);
  }

}

import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { locale, recurrenceValues, timeframeValues } from "../../types/constants";
import { DateTimeAdapter } from "@ltres/angular-datetime-picker";
import { PickerOutput, Recurrence, Timeframe } from "../../types/types";

const ONE_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'date-picker',
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements AfterViewInit{
  @ViewChild('trigger') trigger: ElementRef<{click:() =>unknown}> | null = null;
  @Input() showRecurrences = false;
  @Input() showTimeframes = false;
  @Input() hideCalendar = false;

  @Input() startDate: Date | undefined = new Date(Date.now() - ONE_DAY);
  @Input() endDate: Date | undefined = new Date(Date.now() + ONE_DAY)
  @Input() selectedRecurrence: Recurrence | undefined;
  @Input() selectedTimeframe: [Timeframe | undefined, Timeframe | undefined] = [undefined, undefined];

  @Output() onSetClicked: EventEmitter<PickerOutput> = new EventEmitter();
  @Output() onCancel:EventEmitter<void> = new EventEmitter();

  public selectedMoments: Date[] | undefined;
  protected recurrenceValues = recurrenceValues
  protected timeframeValues= timeframeValues

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
  
  protected setButtonClicked( date: Date | Date[] | [null,null] ): void {
    if(!date || !Array.isArray(date) || date.length !== 2 || date[0] === null || date[1] === null ){
      // no dates, timeframe?
      if(!this.selectedTimeframe){
        throw new Error("No dates nor timeframe selected");
      }
      this.onSetClicked.emit({
        timeframe: this.selectedTimeframe
      })
    }else{
      this.onSetClicked.emit({
        dates: date as [Date,Date],
        recurrence: this.selectedRecurrence
      })
    }
  }

  protected cancelClicked(): void {
    this.onCancel.emit()
  }
  
  getEndAt(): Date {
    return this.endDate ?? new Date();
  }
  getStartAt(): Date {
    return this.startDate ?? new Date();
  }

  deleteTimeframes(){
    this.selectedTimeframe = [undefined,undefined];
  }

}

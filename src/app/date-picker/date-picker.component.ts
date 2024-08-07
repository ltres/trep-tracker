import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";

const ONE_DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'date-picker',
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements AfterViewInit{

  @Input() startDate: Date | undefined = new Date(Date.now() - ONE_DAY);
  @Input() endDate: Date | undefined = new Date(Date.now() + ONE_DAY)
  @Output() onDatesSelected:EventEmitter<[(Date|undefined),(Date|undefined)]> = new EventEmitter();
  
  @ViewChild('trigger') trigger: ElementRef<{click:() =>unknown}> | null = null;
  public selectedMoments: Date[] | undefined;
  protected initialized = false;

  dateTime = false
  today = new Date();

  ngAfterViewInit(){ 
    this.startDate = this.startDate ?? new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 0, 1, 0);
    this.endDate = this.endDate ?? new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), 23, 59, 0);

    this.selectedMoments =[
      this.startDate,
      this.endDate
    ]
    this.initialized = true
    this.trigger?.nativeElement.click();
  }

  protected selectedTrigger(date: [(Date|undefined),(Date|undefined)] | undefined): void {
    if(!date){
      console.warn("Undefined date");
      return;
    }
    this.onDatesSelected.emit(date)
  }
  
  getEndAt(): Date {
    return this.endDate ?? new Date();
  }
  getStartAt(): Date {
    return this.startDate ?? new Date();
  }

}

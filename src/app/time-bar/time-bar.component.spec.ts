import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeBarComponent } from './time-bar.component';

describe('TimeBarComponent', () => {
  let component: TimeBarComponent;
  let fixture: ComponentFixture<TimeBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeBarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TimeBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

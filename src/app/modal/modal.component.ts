import{ Component, OnDestroy }from'@angular/core';
import{ ModalService, ModalSize }from'../../service/modal.service';
import{ Subscription }from'rxjs';

@Component( {
  selector: 'modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
} )
export class ModalComponent implements OnDestroy{
  size: ModalSize = 'standard';
  subscription: Subscription | undefined;
  constructor( protected modalService: ModalService ){
    this.subscription = this.modalService.displayModal$.subscribe( ( modal ) => {
      this.size = modal.size;
    } );
  }

  closeModal(){
    this.modalService.setDisplayModal( false );
  }
  ngOnDestroy(): void{
    this.subscription?.unsubscribe();
  }

}

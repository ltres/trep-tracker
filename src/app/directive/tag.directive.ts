import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { RegistryService } from '../../service/registry.service';

@Directive({
    selector: '[tag]',
    //standalone: true
})
export class TagDirective implements OnInit, OnDestroy {
    constructor(
        private registry: RegistryService,
        private el: ElementRef,
    ) { 
        console.log('Directive created');
    }

    ngOnDestroy(): void {
        console.log('Directive destroyed');
    }
    ngOnInit() {
        // Directive has been instantiated
        console.log('Directive instantiated');
    } 
}

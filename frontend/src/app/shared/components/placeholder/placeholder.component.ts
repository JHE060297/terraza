import { Component, Input } from '@angular/core';
import { sharedImports } from '../../shared.imports';

@Component({
    selector: 'app-placeholder',
    imports: [sharedImports],
    templateUrl: './placeholder.component.html',
    styleUrls: ['./placeholder.component.scss']
})
export class PlaceholderComponent {
    @Input() title: string = 'Módulo en Desarrollo';
    @Input() message: string = 'Esta funcionalidad estará disponible próximamente.';
    @Input() icon: string = 'build';
}
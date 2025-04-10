import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { sharedImports } from '../../shared/shared.imports';

@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [sharedImports],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent {
  constructor(private router: Router) { }

  goToHome() {
    this.router.navigate(['/']);
  }
}
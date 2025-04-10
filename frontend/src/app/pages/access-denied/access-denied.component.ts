import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { sharedImports } from '../../shared/shared.imports';

@Component({
  standalone: true,
  selector: 'app-access-denied',
  imports: [sharedImports],
  template: `
    <div class="access-denied-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Acceso Denegado</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="icon-container">
            <mat-icon class="error-icon">lock</mat-icon>
          </div>
          <p>No tienes permisos para acceder a esta sección.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="goBack()">Volver</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f5f5f5;
    }
    
    mat-card {
      max-width: 400px;
      text-align: center;
      padding: 30px;
    }
    
    .icon-container {
      margin: 30px 0;
    }
    
    .error-icon {
      font-size: 60px;
      height: 60px;
      width: 60px;
      color: #f44336;
    }
    
    mat-card-actions {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }
  `]
})
export class AccessDeniedComponent {
  constructor(private location: Location) { }

  goBack(): void {
    this.location.back();
  }
}
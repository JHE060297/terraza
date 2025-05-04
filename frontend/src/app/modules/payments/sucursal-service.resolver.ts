// sucursal-service.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { SucursalService } from '../../core/services/sucursales.service';

@Injectable({
    providedIn: 'root'
})
export class SucursalServiceResolver implements Resolve<SucursalService> {
    constructor(private sucursalService: SucursalService) { }

    resolve() {
        return this.sucursalService;
    }
}
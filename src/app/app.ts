import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './layouts/overlays/toast-outlet.component';
import { ConfirmOutletComponent } from './layouts/overlays/confirm-outlet.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent, ConfirmOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ChangePasswordModal } from '@auth/change-password-modal/change-password-modal';
import { AppUpdateService } from '@shared/services/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ChangePasswordModal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('maltiti-admin-portal');

  constructor() {
    /* Watches for a cached build that can no longer load its own chunks, and
       for a newer version waiting to take over. Started here because it has to
       be listening before the first route is resolved. */
    inject(AppUpdateService).start();
  }
}

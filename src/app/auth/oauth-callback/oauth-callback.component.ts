import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { microsoftAuthCallback } from '../store/auth.actions';
import { StorageService } from '@services/storage.service';
import { APP_ROUTES } from '@config/routes.config';

@Component({
  selector: 'app-oauth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressSpinnerModule, MessageModule],
  template: `
    <div class="oauth-callback-container">
      <p-progressSpinner strokeWidth="4" />
      <p class="oauth-callback-message">Completing sign in&hellip;</p>
    </div>
  `,
  styles: [`
    .oauth-callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      gap: 1.5rem;
    }
    .oauth-callback-message {
      font-size: 1rem;
      color: var(--text-color-secondary, #6c757d);
      margin: 0;
    }
  `],
})
export class OAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    const accessToken = this.route.snapshot.queryParamMap.get('accessToken');

    if (!accessToken) {
      void this.router.navigate([APP_ROUTES.auth.oauthError.fullPath], {
        queryParams: { message: encodeURIComponent('No access token was received from the server.') },
      });
      return;
    }

    StorageService.saveToken(accessToken);
    this.store.dispatch(microsoftAuthCallback({ accessToken }));
  }
}

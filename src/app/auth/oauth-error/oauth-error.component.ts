import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { APP_ROUTES } from '@config/routes.config';

@Component({
  selector: 'app-oauth-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, MessageModule, ButtonModule, RouterLink],
  template: `
    <div class="oauth-error-container">
      <div class="oauth-error-wrapper">
        <p-card>
          <ng-template pTemplate="header">
            <div class="oauth-error-header">
              <h1 class="oauth-error-title">Sign-in Failed</h1>
              <p class="oauth-error-subtitle">Maltiti A. Enterprise — Admin Portal</p>
            </div>
          </ng-template>

          <p-message severity="error" styleClass="w-full mb-4">
            {{ errorMessage() }}
          </p-message>

          <p-button
            icon="pi pi-arrow-left"
            label="Back to Login"
            styleClass="w-full"
            [routerLink]="loginPath"
          />
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .oauth-error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100dvh;
      width: 100%;
      background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%);
      padding: 1rem;
    }
    .oauth-error-wrapper {
      width: 100%;
      max-width: 450px;
    }
    .oauth-error-header {
      text-align: center;
      padding: 2rem 1rem 1rem;
      background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
      color: white;
      border-radius: 16px 16px 0 0;
      margin: -1rem -1rem 0 -1rem;
    }
    .oauth-error-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: white;
    }
    .oauth-error-subtitle {
      font-size: 1rem;
      font-weight: 400;
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
    }
    :host ::ng-deep .p-card-body { padding: 2rem; }
    :host ::ng-deep .p-card-content { padding: 0; }
  `],
})
export class OAuthErrorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  public readonly errorMessage = signal('An unexpected error occurred during sign-in.');
  public readonly loginPath = APP_ROUTES.auth.login.fullPath;

  public ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('message');
    if (raw) {
      this.errorMessage.set(decodeURIComponent(raw));
    }
  }
}

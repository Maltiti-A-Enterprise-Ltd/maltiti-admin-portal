import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { authLogin } from '../store/auth.actions';
import { selectAuthError, selectAuthLoading } from '../store/auth.selectors';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    FloatLabelModule,
    MessageModule,
    DividerModule,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  public readonly loading = this.store.selectSignal(selectAuthLoading);
  public readonly error = this.store.selectSignal(selectAuthError);

  public readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  public get emailControl() {
    return this.loginForm.controls.email;
  }

  public get passwordControl() {
    return this.loginForm.controls.password;
  }

  public loginWithMicrosoft(): void {
    window.location.href = environment.microsoftAuthUrl;
  }

  public onSubmit(): void {
    if (this.loginForm.valid) {
      const credentials = this.loginForm.getRawValue();
      this.store.dispatch(authLogin({credentials}));
      return
    }
    this.loginForm.markAllAsTouched();

  }
}


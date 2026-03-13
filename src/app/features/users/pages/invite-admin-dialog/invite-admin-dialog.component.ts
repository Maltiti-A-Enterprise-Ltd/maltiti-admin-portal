/**
 * Invite Admin Dialog Component
 * Modal dialog for inviting new administrators
 * Uses reactive forms with validation
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import * as UsersActions from '../../store/users.actions';
import { Actions, ofType } from '@ngrx/effects';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-invite-admin-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonComponent, InputComponent],
  templateUrl: './invite-admin-dialog.component.html',
})
export class InviteAdminDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  public readonly visible = input.required<boolean>();

  // Outputs
  public readonly visibleChange = output<boolean>();
  public readonly adminInvited = output<void>();

  // Signals
  public readonly loading = signal(false);

  // Form
  public readonly inviteForm = this.fb.group({
    email: this.fb.control('', {
      validators: [Validators.required, Validators.email],
    }),
    name: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
  });

  public get nameControl(): FormControl {
    return this.inviteForm.get('name') as FormControl;
  }

  public get emailControl(): FormControl {
    return this.inviteForm.get('email') as FormControl;
  }

  constructor() {
    this.listenToCreateAdminSuccess();
  }

  private listenToCreateAdminSuccess(): void {
    this.actions$
      .pipe(ofType(UsersActions.createAdminSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loading.set(false);
        this.adminInvited.emit();
        this.visibleChange.emit(false);
      });

    this.actions$
      .pipe(ofType(UsersActions.createAdminFailure), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loading.set(false);
      });
  }

  public onSave(): void {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const formValue = this.inviteForm.value;
    this.store.dispatch(
      UsersActions.createAdmin({
        dto: {
          email: formValue.email!,
          name: formValue.name!,
        },
      }),
    );

    this.loading.set(true);
  }

  public onCancel(): void {
    this.inviteForm.reset();
    this.visibleChange.emit(false);
  }

  public onHide(): void {
    this.inviteForm.reset();
    this.loading.set(false);
  }
}

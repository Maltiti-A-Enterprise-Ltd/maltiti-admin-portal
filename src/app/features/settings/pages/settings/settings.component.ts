/**
 * Settings Component
 * Allows authenticated users to view and update their profile information
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, filter, finalize } from 'rxjs';
import { ProfileService } from '@services/profile.service';
import { ProfileResponseDto, UpdateProfileDto } from '@models/profile.model';
import { Store } from '@ngrx/store';
import { changePassword } from '@auth/store/auth.actions';
import { selectAuthError, selectAuthLoading, selectUserId } from '@auth/store/auth.selectors';
import { PasswordInputComponent } from '@shared/components/password-input/password-input.component';
import { InputComponent } from '@shared/components/input/input.component';
import { CustomValidators } from '@shared/validators/custom-validators';

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    FileUploadModule,
    MessageModule,
    ProgressSpinnerModule,
    DynamicDialogModule,
    PasswordInputComponent,
    InputComponent,
  ],
  providers: [DialogService],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly store = inject(Store);

  // Signals for state management
  public readonly profile = signal<ProfileResponseDto | null>(null);
  public readonly loading = signal(false);
  public readonly saving = signal(false);
  public readonly uploading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly success = signal<string | null>(null);
  public readonly activeTab = signal(0);
  public readonly changingPassword = signal(false);
  public readonly userId = this.store.selectSignal(selectUserId);

  // Form
  public readonly profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: [{ value: '', disabled: true }],
    phoneNumber: ['', [Validators.pattern(/^(\+?\d{1,3}[- ]?)?\d{10,15}$/)]],
  });

  // Password change form
  public readonly passwordForm: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, CustomValidators.strongPassword]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: CustomValidators.passwordMatch },
  );

  public readonly canSave = computed(() => this.profileForm.valid && !this.saving());
  public readonly canChangePassword = computed(
    () => this.passwordForm.valid && !this.changingPassword(),
  );
  public readonly currentPasswordControl = computed(
    () => this.passwordForm.get('currentPassword') as FormControl,
  );
  public readonly newPasswordControl = computed(
    () => this.passwordForm.get('newPassword') as FormControl,
  );
  public readonly confirmPasswordControl = computed(
    () => this.passwordForm.get('confirmPassword') as FormControl,
  );
  public readonly nameControl = computed(() => this.profileForm.get('name') as FormControl);
  public readonly emailControl = computed(() => this.profileForm.get('email') as FormControl);
  public readonly phoneControl = computed(() => this.profileForm.get('phoneNumber') as FormControl);

  constructor() {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.profileService
      .getProfile()
      .pipe(
        takeUntilDestroyed(),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          this.profile.set(data);
          this.profileForm.patchValue({
            name: data.name,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
          });
        },
        error: (err) => {
          this.error.set('Failed to load profile information. Please try again.');
          console.error('Profile load error:', err);
        },
      });
  }

  public onSave(): void {
    if (!this.canSave()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.profileForm.value;
    const updateData: UpdateProfileDto = {
      name: formValue.name,
      phoneNumber: formValue.phoneNumber || undefined,
    };

    this.profileService
      .updateProfile(updateData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (updatedProfile) => {
          this.profile.set(updatedProfile);
          this.profileForm.markAsPristine();
          this.success.set('Profile updated successfully!');
          // Clear success message after 3 seconds
          setTimeout(() => this.success.set(null), 3000);
        },
        error: (err) => {
          this.error.set('Failed to update profile. Please check your input and try again.');
          console.error('Profile update error:', err);
        },
      });
  }

  public onCancel(): void {
    const currentProfile = this.profile();
    if (currentProfile) {
      this.profileForm.patchValue({
        name: currentProfile.name,
        email: currentProfile.email,
        phoneNumber: currentProfile.phoneNumber || '',
      });
      this.profileForm.markAsPristine();
    }
  }

  public onAvatarUpload(event: FileSelectEvent): void {
    const file = event.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('File size must be less than 5MB.');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);

    this.profileService
      .uploadAvatar(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.uploading.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          const currentProfile = this.profile();
          if (currentProfile) {
            this.profile.set({ ...currentProfile, avatarUrl: data });
          }
          this.success.set('Avatar uploaded successfully!');
          setTimeout(() => this.success.set(null), 3000);
        },
        error: (err) => {
          this.error.set('Failed to upload avatar. Please try again.');
          console.error('Avatar upload error:', err);
        },
      });
  }

  public onChangePassword(): void {
    if (!this.canChangePassword()) {
      return;
    }

    this.changingPassword.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.passwordForm.value;
    this.store.dispatch(
      changePassword({
        id: this.userId()!,
        currentPassword: formValue.currentPassword,
        newPassword: formValue.newPassword,
        confirmPassword: formValue.confirmPassword,
      }),
    );

    // Listen to auth state changes
    combineLatest([this.store.select(selectAuthLoading), this.store.select(selectAuthError)])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(([loading]) => !loading),
      )
      .subscribe(([error]) => {
        this.changingPassword.set(false);
        if (error) {
          this.error.set(
            'Failed to change password. Please check your current password and try again.',
          );
        } else {
          this.success.set('Password changed successfully!');
          this.passwordForm.reset();
          setTimeout(() => this.success.set(null), 3000);
        }
      });
  }
}

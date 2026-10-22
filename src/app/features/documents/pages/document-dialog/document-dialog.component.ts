/**
 * Adding a document to the register, and correcting one already on it.
 *
 * The link is only asked for when adding. Replacing the file afterwards is a
 * new *version* with its own dialog, so a renewal always leaves the copy it
 * replaced behind — which is the whole reason the register keeps a history.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { FieldRendererComponent } from '@shared/components/field-renderer/field-renderer.component';
import { DialogFormSeeder } from '@shared/utils/dialog-form-seeder';
import { DocumentApiService } from '../../services/document-api.service';
import {
  CompanyDocument,
  DocumentCategory,
  DocumentSource,
} from '../../models/document.model';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_SOURCE_OPTIONS,
  REMINDER_LEAD_OPTIONS,
} from '../../constants/document-options';
import { buildDocumentPayload } from '../../utils/document-payload';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-document-dialog',
  standalone: true,
  // PrimeTemplate registers `pTemplate="footer"`; without it the dialog
  // renders with no Save or Cancel button.
  imports: [ReactiveFormsModule, Dialog, Button, PrimeTemplate, FieldRendererComponent],
  templateUrl: './document-dialog.component.html',
  styleUrl: './document-dialog.component.scss',
})
export class DocumentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DocumentApiService);
  private readonly messageService = inject(MessageService);

  public readonly visible = input.required<boolean>();
  public readonly document = input<CompanyDocument | null>();

  public readonly visibleChange = output<boolean>();
  public readonly saved = output<void>();

  public readonly saving = signal(false);
  public readonly errorMessage = signal<string | null>(null);

  public readonly form = this.fb.group({
    title: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    category: this.fb.control<DocumentCategory>(DocumentCategory.CERTIFICATION, {
      validators: [Validators.required],
    }),
    issuer: this.fb.control(''),
    referenceNumber: this.fb.control(''),
    description: this.fb.control(''),
    /* A picker, not text: an expiry typed as a string is the one field in
       here that silently stops the reminders working. */
    expiresAt: this.fb.control<Date | null>(null),
    /* A string, matching the select's options. `''` is "don't remind me". */
    reminderLeadDays: this.fb.control(''),

    // Only asked for when adding. See the class comment.
    url: this.fb.control(''),
    source: this.fb.control<DocumentSource>(DocumentSource.MICROSOFT_365),
  });

  public readonly categoryOptions = DOCUMENT_CATEGORY_OPTIONS;
  public readonly sourceOptions = DOCUMENT_SOURCE_OPTIONS;
  public readonly reminderOptions = REMINDER_LEAD_OPTIONS;

  public readonly isEdit = computed(() => !!this.document());
  public readonly dialogTitle = computed(() =>
    this.isEdit() ? 'Edit document' : 'Add document',
  );

  /** Yesterday is almost always a typo on a document being filed today. */
  public readonly minExpiry = new Date();

  private readonly expiryPicked = toSignal(this.form.controls.expiresAt.valueChanges, {
    initialValue: this.form.controls.expiresAt.value,
  });

  /**
   * The reminder choice only applies to something that expires.
   *
   * Hidden rather than disabled on a document with no date: a lead time with
   * nothing to count back from is a setting that quietly does nothing.
   */
  public readonly canRemind = computed(() => !!this.expiryPicked());

  constructor() {
    const seeder = new DialogFormSeeder();

    effect(() => {
      const visible = this.visible();
      const document = this.document();

      if (!visible) {
        seeder.markClosed();
        return;
      }

      if (!seeder.shouldSeed(document?.id ?? null)) {
        return;
      }

      this.errorMessage.set(null);
      this.applyLinkRules(!document);

      if (document) {
        this.seedFrom(document);
      } else {
        this.resetForm();
      }
    });
  }

  public onHide(): void {
    this.visibleChange.emit(false);
    this.resetForm();
  }

  public onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const document = this.document();
    const payload = buildDocumentPayload(this.form.getRawValue());

    const request = document
      ? this.api.update(document.id, payload.update)
      : this.api.create(payload.create);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: document ? 'Document updated' : 'Document added to the register',
        });
        this.saved.emit();
        this.visibleChange.emit(false);
        this.resetForm();
      },
      error: (error) => {
        this.saving.set(false);
        /* The API owns the rules about links and lead times, so its wording
           is the only thing that explains what is actually wrong. */
        this.errorMessage.set(
          error?.error?.message ?? 'Could not save the document. Please try again.',
        );
      },
    });
  }

  /** The link is required when adding and absent when correcting. */
  private applyLinkRules(adding: boolean): void {
    const { url } = this.form.controls;

    url.setValidators(adding ? [Validators.required] : []);
    url.updateValueAndValidity({ emitEvent: false });
  }

  private seedFrom(document: CompanyDocument): void {
    this.form.reset({
      title: document.title,
      category: document.category,
      issuer: document.issuer ?? '',
      referenceNumber: document.referenceNumber ?? '',
      description: document.description ?? '',
      expiresAt: document.expiresAt ? new Date(document.expiresAt) : null,
      /* `?? ''` not `|| ''`: zero is "tell me on the day", and losing it here
         would silently turn a reminder off on every edit. */
      reminderLeadDays: String(document.reminderLeadDays ?? ''),
      url: '',
      source: DocumentSource.MICROSOFT_365,
    });
  }

  private resetForm(): void {
    this.form.reset({
      title: '',
      category: DocumentCategory.CERTIFICATION,
      issuer: '',
      referenceNumber: '',
      description: '',
      expiresAt: null,
      reminderLeadDays: '',
      url: '',
      source: DocumentSource.MICROSOFT_365,
    });
  }
}

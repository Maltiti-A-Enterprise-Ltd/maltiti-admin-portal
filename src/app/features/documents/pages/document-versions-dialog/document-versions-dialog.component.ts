/**
 * Every copy of a document there has ever been, and how to add the next one.
 *
 * Renewing is the common reason to open this, so the form to add a version
 * sits at the top rather than under the history — and the history below it is
 * what makes the renewal safe to do: last year's certificate is the evidence
 * that the consignment shipped in March was covered, and that question gets
 * asked long after the new one has arrived.
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
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { FieldRendererComponent } from '@shared/components/field-renderer/field-renderer.component';
import { DocumentApiService } from '../../services/document-api.service';
import {
  CompanyDocument,
  DOCUMENT_SOURCE_LABELS,
  DocumentSource,
  DocumentVersion,
} from '../../models/document.model';
import { DOCUMENT_SOURCE_OPTIONS } from '../../constants/document-options';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-document-versions-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Dialog,
    Button,
    TagModule,
    SkeletonModule,
    PrimeTemplate,
    FieldRendererComponent,
  ],
  templateUrl: './document-versions-dialog.component.html',
  styleUrl: './document-versions-dialog.component.scss',
})
export class DocumentVersionsDialogComponent {
  private readonly api = inject(DocumentApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  public readonly visible = input.required<boolean>();
  /** The row that was clicked. Its history is fetched on open. */
  public readonly document = input<CompanyDocument | null>();

  public readonly visibleChange = output<boolean>();
  public readonly saved = output<void>();

  public readonly loading = signal(false);
  public readonly saving = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly adding = signal(false);

  /** Fetched rather than taken from the row: the list omits the history. */
  private readonly loaded = signal<CompanyDocument | null>(null);

  public readonly title = computed(() => this.document()?.title ?? 'Document');
  public readonly versions = computed(() => this.loaded()?.versions ?? []);
  public readonly sourceOptions = DOCUMENT_SOURCE_OPTIONS;
  public readonly sourceLabels = DOCUMENT_SOURCE_LABELS;

  public readonly form = this.fb.group({
    url: this.fb.control('', { validators: [Validators.required] }),
    source: this.fb.control<DocumentSource>(DocumentSource.MICROSOFT_365),
    note: this.fb.control(''),
  });

  constructor() {
    effect(() => {
      const id = this.document()?.id;

      if (!this.visible() || !id) {
        return;
      }

      this.load(id);
    });
  }

  public onHide(): void {
    this.visibleChange.emit(false);
    this.adding.set(false);
    this.loaded.set(null);
    this.form.reset({ url: '', source: DocumentSource.MICROSOFT_365, note: '' });
  }

  public startAdding(): void {
    this.errorMessage.set(null);
    this.adding.set(true);
  }

  public cancelAdding(): void {
    this.adding.set(false);
    this.form.reset({ url: '', source: DocumentSource.MICROSOFT_365, note: '' });
  }

  public onSave(): void {
    const id = this.document()?.id;

    if (this.form.invalid || !id) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const { url, source, note } = this.form.getRawValue();

    this.api
      .addVersion(id, {
        url: url?.trim() ?? '',
        source: source ?? DocumentSource.MICROSOFT_365,
        note: note?.trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.loaded.set(updated);
          this.cancelAdding();
          this.messageService.add({
            severity: 'success',
            summary: 'New version added',
            detail: `${updated.title} is now v${updated.currentVersion?.versionNumber ?? 1}.`,
          });
          /* The row's expiry and version count both move, so the register
             behind this dialog has to be re-read. */
          this.saved.emit();
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(
            error?.error?.message ?? 'Could not add the new version. Please try again.',
          );
        },
      });
  }

  /** `12 Oct 2026` — the day is what matters, not the minute. */
  public formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  public isCurrent(version: DocumentVersion): boolean {
    return version.versionNumber === this.versions()[0]?.versionNumber;
  }

  private load(id: string): void {
    this.loading.set(true);

    this.api.getOne(id).subscribe({
      next: (document) => {
        this.loaded.set(document);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load the version history.',
        });
      },
    });
  }
}

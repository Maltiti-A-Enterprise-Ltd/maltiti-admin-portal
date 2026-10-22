/**
 * The company's document register.
 *
 * Ordered by the API with the expired certificates first, because that is the
 * one thing this page exists to surface — an organic certificate that has
 * lapsed stops a consignment leaving, and nobody discovers that by browsing.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Button } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { DocumentApiService } from '../../services/document-api.service';
import {
  CompanyDocument,
  DOCUMENT_CATEGORY_LABELS,
  DocumentCategory,
} from '../../models/document.model';
import { DOCUMENT_CATEGORY_OPTIONS } from '../../constants/document-options';
import {
  countNeedingAttention,
  expiryDisplay,
  formatDay,
} from '../../utils/document-display';
import { DocumentDialogComponent } from '../document-dialog/document-dialog.component';
import { DocumentVersionsDialogComponent } from '../document-versions-dialog/document-versions-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-documents-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TableModule,
    TagModule,
    Button,
    SelectModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    DocumentDialogComponent,
    DocumentVersionsDialogComponent,
  ],
  templateUrl: './documents-list.component.html',
  styleUrl: './documents-list.component.scss',
  providers: [ConfirmationService],
})
export class DocumentsListComponent implements OnInit {
  private readonly api = inject(DocumentApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly documents = signal<CompanyDocument[]>([]);
  public readonly loading = signal(false);

  public readonly dialogVisible = signal(false);
  public readonly versionsVisible = signal(false);
  public readonly selected = signal<CompanyDocument | null>(null);

  // ─── Filters ────────────────────────────────────────────────────────────────
  public readonly searchControl = new FormControl('');
  public readonly categoryControl = new FormControl<DocumentCategory | null>(null);
  /** Off by default: the register is for looking things up, not only chasing. */
  public readonly expiringOnly = signal(false);

  public readonly categoryOptions = DOCUMENT_CATEGORY_OPTIONS;

  /**
   * A method rather than the map itself: the table's row variable is `any`,
   * and indexing a `Record` with that is refused under strict templates.
   */
  public categoryLabel(category: DocumentCategory): string {
    return DOCUMENT_CATEGORY_LABELS[category] ?? category;
  }

  /**
   * A document that expires but asked not to be chased.
   *
   * Worth saying out loud on the row — the alternative is leaving an admin
   * to infer from silence that the morning email has it covered.
   */
  public isUnchased(document: CompanyDocument): boolean {
    return !!document.expiresAt && document.reminderLeadDays === null;
  }

  protected readonly expiryDisplay = expiryDisplay;
  protected readonly formatDay = formatDay;

  /**
   * How many are asking to be dealt with.
   *
   * Counted from everything loaded, so the chip does not read zero merely
   * because the list is filtered to one category.
   */
  private readonly allDocuments = signal<CompanyDocument[]>([]);
  public readonly needingAttention = computed(() =>
    countNeedingAttention(this.allDocuments()),
  );

  constructor() {
    /* Wired here rather than in `ngOnInit`: `takeUntilDestroyed` needs an
       injection context, and passing the ref explicitly from a lifecycle hook
       is the other half of the same bargain. Debounced, because the search
       box re-queries on every keystroke otherwise. */
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());

    // No debounce: picking from a dropdown is one deliberate action.
    this.categoryControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  public ngOnInit(): void {
    this.load();
  }

  public load(): void {
    this.loading.set(true);

    this.api
      .getAll({
        search: this.searchControl.value ?? undefined,
        category: this.categoryControl.value ?? undefined,
        expiringOnly: this.expiringOnly() || undefined,
      })
      .subscribe({
        next: (documents) => {
          this.documents.set(documents);
          this.loading.set(false);

          /* The unfiltered set backs the attention count, so it is only
             refreshed when nothing is narrowing the list. */
          if (!this.isFiltered()) {
            this.allDocuments.set(documents);
          }
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load the document register.',
          });
        },
      });
  }

  public isFiltered(): boolean {
    return (
      !!this.searchControl.value?.trim() ||
      !!this.categoryControl.value ||
      this.expiringOnly()
    );
  }

  public toggleExpiringOnly(): void {
    this.expiringOnly.update((on) => !on);
    this.load();
  }

  public clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.categoryControl.setValue(null, { emitEvent: false });
    this.expiringOnly.set(false);
    this.load();
  }

  public onAdd(): void {
    this.selected.set(null);
    this.dialogVisible.set(true);
  }

  public onEdit(document: CompanyDocument): void {
    this.selected.set(document);
    this.dialogVisible.set(true);
  }

  public onVersions(document: CompanyDocument): void {
    this.selected.set(document);
    this.versionsVisible.set(true);
  }

  public onDelete(document: CompanyDocument): void {
    this.confirmationService.confirm({
      header: 'Remove from the register',
      message:
        `Remove "${document.title}"? The file itself stays where it is — ` +
        'this only removes the record of it, and every version with it.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.remove(document.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Removed',
              detail: `${document.title} is no longer on the register.`,
            });
            this.load();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Could not remove the document.',
            }),
        });
      },
    });
  }
}

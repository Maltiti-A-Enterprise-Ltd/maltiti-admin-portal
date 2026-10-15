import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import {
  PAYMENT_INSTRUCTION_OPTIONS,
  PaymentInstructionDto,
  PaymentInstructionType,
} from '../../models/sale.model';
import {
  paymentInstructionsProblem,
  previewInstruction,
  totalPercentage,
} from '../../utils/payment-instructions';

/** What the editor hands back to the sale form. */
export interface PaymentTerms {
  instructions: PaymentInstructionDto[];
  remarks: string | null;
}

/**
 * How an invoice says it is to be paid, and anything else worth printing.
 *
 * Its own component rather than more controls on the sale form, which is at
 * its length limit — and because a list of instructions with add, remove and
 * a running total is a self-contained thing with its own rules.
 *
 * Deliberately not a reactive FormArray. The list is short, re-orderable
 * only by removing and re-adding, and the parent wants one value out; a
 * FormArray would add control bookkeeping for no gain.
 */
@Component({
  selector: 'app-payment-terms-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    TextareaModule,
    MessageModule,
  ],
  templateUrl: './payment-terms-editor.component.html',
  styleUrl: './payment-terms-editor.component.scss',
})
export class PaymentTermsEditorComponent {
  public readonly changed = output<PaymentTerms>();

  public readonly instructions = signal<PaymentInstructionDto[]>([]);
  public readonly remarks = signal<string>('');

  public readonly options = PAYMENT_INSTRUCTION_OPTIONS;

  public readonly total = computed(() => totalPercentage(this.instructions()));

  /** Why these terms would be refused, or null while they are fine. */
  public readonly problem = computed(() =>
    paymentInstructionsProblem(this.instructions()),
  );

  /** How the list will read on the invoice. */
  public readonly preview = computed(() =>
    this.instructions().map(previewInstruction),
  );

  /* Seeded once. The parent loads a sale asynchronously, and re-seeding
     after that would fight the admin as they type. */
  private seeded = false;

  /** Called by the parent once a sale has loaded. */
  public seed(terms: PaymentTerms | null): void {
    if (this.seeded) {
      return;
    }

    this.seeded = true;
    this.instructions.set([...(terms?.instructions ?? [])]);
    this.remarks.set(terms?.remarks ?? '');
  }

  /**
   * Adds the first milestone not already in the list.
   *
   * Offering a duplicate and then refusing it is a worse experience than
   * never offering it; when all three are used the button is hidden.
   */
  public add(): void {
    const used = new Set(this.instructions().map((entry) => entry.type));
    const next = this.options.find((option) => !used.has(option.value));

    if (!next) {
      return;
    }

    this.instructions.update((list) => [
      ...list,
      { type: next.value, percentage: null },
    ]);
    this.emit();
  }

  public remove(index: number): void {
    this.instructions.update((list) =>
      list.filter((_, position) => position !== index),
    );
    this.emit();
  }

  public setType(index: number, type: PaymentInstructionType): void {
    this.instructions.update((list) =>
      list.map((entry, position) =>
        position === index ? { ...entry, type } : entry,
      ),
    );
    this.emit();
  }

  public setPercentage(index: number, percentage: number | null): void {
    this.instructions.update((list) =>
      list.map((entry, position) =>
        position === index ? { ...entry, percentage } : entry,
      ),
    );
    this.emit();
  }

  public setRemarks(value: string): void {
    this.remarks.set(value);
    this.emit();
  }

  /** True once every milestone is in use, so there is nothing left to add. */
  public readonly canAdd = computed(
    () => this.instructions().length < this.options.length,
  );

  private emit(): void {
    this.changed.emit({
      instructions: this.instructions(),
      /* Blank is a clear, not a value — an empty box should remove the
         remark rather than print an empty heading. */
      remarks: this.remarks().trim() || null,
    });
  }
}

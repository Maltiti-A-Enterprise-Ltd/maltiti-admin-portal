/**
 * Image Section Component
 * Handles image upload, preview and removal for products
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-section',
  standalone: true,
  imports: [ReactiveFormsModule, FileUpload, InputText, TooltipModule],
  templateUrl: './image-section.component.html',
  styleUrl: './image-section.component.scss',
})
export class ImageSectionComponent {
  public readonly viewMode = input<boolean>(false);
  public readonly primaryImageControl = input<FormControl | null>(null);
  public readonly additionalImagesControl = input<FormControl | null>(null);

  public readonly primaryImageUpload = output<FileSelectEvent>();
  public readonly additionalImagesUpload = output<FileSelectEvent>();

  public onPrimaryImageUpload(event: FileSelectEvent): void {
    this.primaryImageUpload.emit(event);
  }

  public onAdditionalImagesUpload(event: FileSelectEvent): void {
    this.additionalImagesUpload.emit(event);
  }

  /**
   * Clears the primary image.
   *
   * Written as an empty string rather than null because the field is sent
   * through `cleared`, which maps a blank to an explicit null for the API —
   * leaving it out would mean "unchanged" and the old image would stay.
   */
  public removePrimaryImage(): void {
    this.primaryImageControl()?.setValue('');
    this.primaryImageControl()?.markAsDirty();
  }

  /**
   * Drops one of the additional images.
   *
   * By index, not by URL: the same image can legitimately be added twice,
   * and removing by value would take both.
   */
  public removeAdditionalImage(index: number): void {
    const control = this.additionalImagesControl();
    const images: string[] = control?.value ?? [];

    control?.setValue(images.filter((_, position) => position !== index));
    control?.markAsDirty();
  }
}

/**
 * Image Section Component
 * Handles image upload and preview for products
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-section',
  standalone: true,
  imports: [ReactiveFormsModule, FileUpload, InputText],
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
}

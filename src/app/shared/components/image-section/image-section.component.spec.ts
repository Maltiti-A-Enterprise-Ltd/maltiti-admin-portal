import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ImageSectionComponent } from './image-section.component';

describe('ImageSectionComponent — removing images', () => {
  let fixture: ComponentFixture<ImageSectionComponent>;
  let component: ImageSectionComponent;
  let primary: FormControl<string | null>;
  let additional: FormControl<string[] | null>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageSectionComponent],
    }).compileComponents();

    primary = new FormControl<string | null>('https://cdn/main.jpg');
    additional = new FormControl<string[] | null>([
      'https://cdn/a.jpg',
      'https://cdn/b.jpg',
      'https://cdn/c.jpg',
    ]);

    fixture = TestBed.createComponent(ImageSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('primaryImageControl', primary);
    fixture.componentRef.setInput('additionalImagesControl', additional);
    fixture.componentRef.setInput('viewMode', false);
    fixture.detectChanges();
  });

  const removeButtons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.image-remove'));

  it('offers a remove button for the primary image and each extra one', () => {
    expect(removeButtons().length).toBe(4);
  });

  /*
   * Emptying has to be sent as a blank, not left as it was: the payload
   * builder maps a blank to an explicit null, and an omitted field means
   * "unchanged" to the API — so clearing would look like it worked and not.
   */
  it('clears the primary image to a blank, not to null', () => {
    component.removePrimaryImage();

    expect(primary.value).toBe('');
  });

  it('marks the form dirty so the save button wakes up', () => {
    expect(primary.dirty).toBeFalse();

    component.removePrimaryImage();

    expect(primary.dirty).toBeTrue();
  });

  it('drops only the image that was removed', () => {
    component.removeAdditionalImage(1);

    expect(additional.value).toEqual(['https://cdn/a.jpg', 'https://cdn/c.jpg']);
  });

  it('removes the first and last without disturbing the rest', () => {
    component.removeAdditionalImage(0);

    expect(additional.value).toEqual(['https://cdn/b.jpg', 'https://cdn/c.jpg']);

    component.removeAdditionalImage(1);

    expect(additional.value).toEqual(['https://cdn/b.jpg']);
  });

  /*
   * The same image can legitimately be uploaded twice. Removing by value
   * would take both, which is why this goes by index.
   */
  it('removes one of a pair of identical images, not both', () => {
    additional.setValue(['https://cdn/same.jpg', 'https://cdn/same.jpg']);

    component.removeAdditionalImage(0);

    expect(additional.value).toEqual(['https://cdn/same.jpg']);
  });

  it('survives an index that is not there', () => {
    component.removeAdditionalImage(99);

    expect(additional.value?.length).toBe(3);
  });

  it('survives a control holding nothing', () => {
    additional.setValue(null);

    expect(() => component.removeAdditionalImage(0)).not.toThrow();
    expect(additional.value).toEqual([]);
  });

  /* Viewing a product is not editing it. */
  it('offers no remove buttons in view mode', () => {
    fixture.componentRef.setInput('viewMode', true);
    fixture.detectChanges();

    expect(removeButtons().length).toBe(0);
  });

  /* Clicked rather than called, so this also covers the binding. The
     component is OnPush and a FormControl value change is not a signal, so
     only a real event in its own template marks it for re-render — which is
     exactly what happens when an admin clicks. */
  it('drops the button for an image once it is clicked away', () => {
    removeButtons()[1].click();
    fixture.detectChanges();

    // The primary button plus two surviving additional images.
    expect(removeButtons().length).toBe(3);
    expect(additional.value).toEqual(['https://cdn/b.jpg', 'https://cdn/c.jpg']);
  });

  it('removes the primary preview when its button is clicked', () => {
    removeButtons()[0].click();
    fixture.detectChanges();

    expect(primary.value).toBe('');
    expect(fixture.nativeElement.querySelector('.image-preview')).toBeNull();
  });
});

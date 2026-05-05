import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { formatPrice } from '../../../site-content';

export interface ComplementProduct {
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

@Component({
  selector: 'app-complement-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './complement-modal.component.html',
  styleUrl: './complement-modal.component.scss',
})
export class ComplementModalComponent {
  @Input({ required: true }) complement: ComplementProduct | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() add = new EventEmitter<string>();

  protected readonly formatPrice = formatPrice;

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected onAdd(): void {
    if (this.complement) {
      this.add.emit(this.complement.slug);
    }
  }
}

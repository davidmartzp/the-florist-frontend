import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';

export interface BannerSlide {
  image: string;
  mobileImage?: string;
  alt: string;
}

@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-carousel.component.html',
  styleUrls: ['./banner-carousel.component.scss'],
})
export class BannerCarouselComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  @Input({ required: true }) slides: BannerSlide[] = [];
  @Input() interval = 5000;

  protected readonly currentIndex = signal(0);
  protected readonly isTransitioning = signal(false);

  ngOnInit(): void {
    if (this.slides.length > 1) {
      this.startAutoPlay();
    }

    this.destroyRef.onDestroy(() => {
      this.stopAutoPlay();
    });
  }

  protected goToSlide(index: number): void {
    if (index === this.currentIndex() || this.isTransitioning()) {
      return;
    }

    this.isTransitioning.set(true);
    this.currentIndex.set(index);

    setTimeout(() => {
      this.isTransitioning.set(false);
    }, 800);
  }

  protected nextSlide(): void {
    const next = (this.currentIndex() + 1) % this.slides.length;
    this.goToSlide(next);
  }

  protected prevSlide(): void {
    const prev = (this.currentIndex() - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prev);
  }

  private startAutoPlay(): void {
    this.intervalId = setInterval(() => {
      this.nextSlide();
    }, this.interval);
  }

  private stopAutoPlay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

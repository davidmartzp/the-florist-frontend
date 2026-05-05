import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface HeroStat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-section.component.html',
  styleUrls: ['./hero-section.component.scss'],
})
export class HeroSectionComponent {
  @Input({ required: true }) heroImage = '';
  @Input({ required: true }) stats: HeroStat[] = [];
  @Input() occasions: string[] = [];
}

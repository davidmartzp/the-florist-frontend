import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-story-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './story-section.component.html',
  styleUrls: ['./story-section.component.scss'],
})
export class StorySectionComponent {
  @Input({ required: true }) commitments: string[] = [];
}

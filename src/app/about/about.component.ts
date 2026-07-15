import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// No mockup exists for this route yet — a minimal placeholder so the nav's "About" link
// (present in all three mockups) goes somewhere real instead of a dead href="#".
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {}

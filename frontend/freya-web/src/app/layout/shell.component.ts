import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IdeaCaptureService, BadgeTarget } from '../core/idea-capture';
import { NavPrefsService } from '../core/nav-prefs.service';
import { IdeaCaptureComponent } from '../shared/idea-capture/idea-capture.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IdeaCaptureComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  private readonly ideas = inject(IdeaCaptureService);
  private readonly navPrefs = inject(NavPrefsService);

  readonly badgeCounts = this.ideas.badgeCountByTarget;
  readonly visibleBadges = this.ideas.visibleBadges;
  readonly visibleTabs = this.navPrefs.visibleTabs;

  dismiss(target: BadgeTarget, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.ideas.dismissTarget(target);
  }

  dismissBadge(id: string): void {
    this.ideas.dismissBadge(id);
  }

  onNavClick(target: BadgeTarget | null | undefined): void {
    if (!target) return;
    if (this.badgeCounts()[target] > 0) {
      this.ideas.dismissTarget(target);
    }
  }
}

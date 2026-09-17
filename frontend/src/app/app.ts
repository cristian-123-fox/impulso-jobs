import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly navigating = signal(false);
  protected readonly progress = signal(0);

  constructor() {
    if (!this.isBrowser) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          this.navigating.set(true);
          this.progress.set(0);
          this.simulateProgress();
        } else if (
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError
        ) {
          this.progress.set(100);
          clearTimeout(timer);
          timer = setTimeout(() => {
            this.navigating.set(false);
            this.progress.set(0);
          }, 300);
        }
      });
  }

  private simulateProgress(): void {
    const step = () => {
      if (!this.navigating()) return;
      this.progress.update((p) => {
        if (p >= 90) return p;
        const increment = p < 50 ? 10 : p < 70 ? 5 : 2;
        return Math.min(p + increment, 90);
      });
      setTimeout(step, 200);
    };
    step();
  }
}

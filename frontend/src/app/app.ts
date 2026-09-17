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
import { IjSpinner } from './shared/ui/spinner/spinner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IjSpinner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly navigating = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        if (e instanceof NavigationStart) {
          this.navigating.set(true);
        } else if (
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError
        ) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            this.navigating.set(false);
          }, 300);
        }
      });
  }
}

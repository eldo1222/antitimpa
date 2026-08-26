/**
 * Favicon & Title dynamic updater
 * Updates document title and dynamic favicon across the entire application.
 */

export function updateFavicon(iconUrl?: string): void {
  if (typeof document === 'undefined') return;

  const defaultSvgFavicon = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="28" fill="%23ff5b14"/><text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="white">AT</text></svg>`;

  const hrefToSet = iconUrl && iconUrl.trim().length > 0 ? iconUrl.trim() : defaultSvgFavicon;

  // Find all existing favicon link tags
  const existingLinks = document.querySelectorAll<HTMLLinkElement>(
    "link[rel*='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
  );

  if (existingLinks.length > 0) {
    existingLinks.forEach(link => {
      link.href = hrefToSet;
    });
  } else {
    // Create new link elements
    const linkIcon = document.createElement('link');
    linkIcon.rel = 'icon';
    linkIcon.type = hrefToSet.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/x-icon';
    linkIcon.href = hrefToSet;
    document.head.appendChild(linkIcon);

    const linkApple = document.createElement('link');
    linkApple.rel = 'apple-touch-icon';
    linkApple.href = hrefToSet;
    document.head.appendChild(linkApple);
  }
}

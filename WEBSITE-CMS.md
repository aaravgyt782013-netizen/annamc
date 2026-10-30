# Anna MC Website CMS

The Website CMS is available to the owner from **/admin → Website CMS**. It saves structured content to the existing **site_settings** table under the **site_content** key; it does not write to HTML files or require a new database table. Public pages load **site-content.js** and **/api/content** to apply the saved content.

## Controls available in the admin panel

- **Brand identity:** website name, tagline, logo, favicon, primary colour, support email and an informational maintenance banner.
- **Homepage hero:** version badge, performance badge, two heading lines, description, join-button label and the address copied by the Join Server button.
- **Homepage sections:** show/hide live player status, game-mode status, metrics and the editable highlights cards.
- **Network status:** proxy, LifeSteal and Practice addresses, Java version label and Bedrock display details. The three Java addresses are also used by the public live-status endpoint. Bedrock fields only control display content; they do not install or configure Geyser/Floodgate.
- **Announcement bar:** a dismissible site-wide notice with an optional HTTPS link.
- **Social links:** Discord, YouTube, Instagram, TikTok and X. Valid links are added to the public footer.
- **Navigation and footer:** show/hide the Store, Features, Forums, Wiki, Vote and Staff navigation links; update copyright/disclaimer text and the footer legal/contact links.
- **SEO:** default title, description, keywords, social-share image, plus page-specific title/description records.
- **Custom page sections:** add up to 12 extra sections on Home, Store, Features, Forums, Wiki, Vote, Staff, Contact, Privacy or Terms. Blocks support an eyebrow, heading, plain-text body, optional image and optional link/button. They are appended to the selected page's main content; they do not replace the original page template.

## Editing custom page sections

The **Custom content sections for each page** editor accepts JSON. Example:

```json
{
  "home": [
    {
      "id": "season-01",
      "eyebrow": "SEASON 01",
      "title": "A new era begins",
      "body": "Join the network for the next chapter of Anna MC.",
      "imageUrl": "/images/season-01.webp",
      "buttonLabel": "Explore features",
      "buttonUrl": "/features.html",
      "active": true
    }
  ],
  "features": [],
  "store": []
}
```

Use a public image path in the repository (for example /images/banner.webp) or a trusted HTTPS image URL. All block content is inserted as text, not executable HTML. Keep each page's value an array of blocks. Save the Website CMS form after editing.

## Advanced page editor

The Advanced page editor is for elements that do not yet have a dedicated form field. **textOverrides** maps a CSS selector to replacement text; **hideSelectors** hides matching elements. Example:

```json
{
  "theme": {
    "primary": "#e6c34f",
    "--custom-accent": "#88ccff"
  },
  "textOverrides": {
    "main h1": "A new page heading"
  },
  "hideSelectors": [
    ".legacy-promo-banner"
  ]
}
```

Text overrides replace an element's entire text content, so do not target a container that includes buttons, icons or other important child elements. These rules are applied on public pages by the shared CMS renderer. Use CSS selectors carefully and preview each page after saving.

## Existing admin modules

The other admin sections continue to manage Store products, Orders & support notes, Announcements, Game modes, Voting links, Staff access and the Activity log. Access is role-limited; the Website CMS is owner-only.

## Important boundaries

- Maintenance mode displays a notice only. It does not shut down the website, disable checkout or change Minecraft server state.
- The homepage copy address (home.serverAddress) is intentionally separate from the status probe address (network.proxyAddress) because a public join address can differ from an internal/proxy query target.
- Changing server addresses changes the website's status checks; it does not change DNS, Velocity, Paper, Pterodactyl or server configuration.
- The current store checkout is still a purchase/invoice workflow preview. A payment provider, verified payment webhook, ticket integration and automated Minecraft rank delivery need separate implementation and credentials before taking real payments or promising automatic rewards.
- The CMS can edit the fields and custom sections described above. New interactive page types, new database-backed modules, integrations and major layout changes still require source-code work. Keep a backup of the repository before large changes.

## Validation

Run **npm run check** locally or use the GitHub Actions workflow. It checks server/API JavaScript files and the inline scripts embedded in the website HTML pages.

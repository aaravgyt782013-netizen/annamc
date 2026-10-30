# Anna MC Website CMS

Open **/admin → Website CMS** as the owner. The CMS stores structured content in the existing **site_settings** table using the `site_content` key. The website can be maintained from the admin panel without editing HTML for the controls listed below.

## What the admin panel controls

- **Brand and global identity:** site name, tagline, logo, favicon, primary colour, support email and a site-wide maintenance notice.
- **Homepage hero:** version/performance labels, both title lines, description, join label and address, optional background image, and a second CTA button.
- **Homepage content:** show or hide player status, game-mode status, metrics and highlights; edit all three metric labels/values/captions; add, edit, reorder and remove up to eight highlights.
- **Network display and status checks:** public proxy, LifeSteal and Practice Java addresses, Java version, and optional Bedrock display details. The three Java addresses feed public status probes. This does not change DNS, Velocity, Paper, Pterodactyl, Geyser or Floodgate configuration.
- **Announcement bar:** site-wide notice text, optional link, and visibility.
- **Navigation:** show or hide Store, Play/Features, Forums, Wiki, Vote and Staff links; change each visible label and destination.
- **Footer and social links:** copyright, disclaimer, contact email, legal-link visibility, and Discord/YouTube/Instagram/TikTok/X links.
- **Search previews and page introductions:** default SEO title, description, keywords and social image, plus page-specific browser/search title, visible heading, intro and hero image.
- **Visual page builder:** select Home, Store, Features, Forums, Forum thread, Wiki, Vote, Staff, Contact, Privacy or Terms. Add up to 12 sections per page, edit text, image and button, publish/unpublish, reorder or remove.
- **Existing admin modules:** Store products, Orders & support notes, Announcements, Game modes, Voting links, Staff access and Activity log remain separate modules with role permissions.

## Use the page builder

1. Open Website CMS and choose the page in **Visual page builder**.
2. Tap **Add section to this page**.
3. Enter the heading, body, optional eyebrow, image URL and button details.
4. Use arrow controls to change order. Untick **Publish this section** to keep it saved but hidden.
5. Tap **Save all website changes**, then preview the selected page.

For images, use a repository path such as `/images/season.webp` or a trusted HTTPS image URL. Text is rendered as text, not raw HTML, so it cannot execute scripts.

## Advanced page editor

The advanced editor remains available for elements not yet covered by visual controls. `textOverrides` maps a CSS selector to replacement text and `hideSelectors` hides matching elements. Avoid targeting containers that include icons or buttons because a text override replaces the entire element's text.

## Important boundaries

- Maintenance mode is a visible notice only. It does not shut down the website, stop checkout or change Minecraft server state.
- Bedrock settings control display details only; configure Geyser/Floodgate separately on the Minecraft network.
- Updating the public join address changes website copy. Network proxy/backend fields also change website status probes, but do not change Minecraft server configuration itself.
- Store checkout remains an invoice/workflow preview. A payment provider, verified webhook, Discord ticket integration and safe automated rank delivery are separate integrations and are not made live by these CMS controls.
- The CMS changes the fields and content blocks described here. New interactive app features, new database modules and major template redesigns still require source-code work. Keep a backup before large changes.

## Validation

Run `npm run check` or use the GitHub Actions validation workflow. It checks API scripts, the shared CMS renderer and inline scripts in website pages.
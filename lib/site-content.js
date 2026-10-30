"use strict";

const DEFAULT_CONTENT = {
  site: {
    name: "Anna MC",
    tagline: "Ascend to Eternity",
    logoUrl: "/anna-mc-logo.svg",
    faviconUrl: "/anna-mc-logo.svg",
    themeColor: "#f2ca50",
    supportEmail: "",
    maintenanceMode: false
  },
  home: {
    eyebrow: "VERSION 1.21.x",
    performanceBadge: "LAG-FREE",
    titleLine1: "ASCEND TO",
    titleLine2: "ETERNITY",
    description: "The ultimate Minecraft survival experience. Where custom mechanics meet a community of legends.",
    joinButtonLabel: "JOIN SERVER",
    serverAddress: "sg-4.madflex.shop:19139",
    showLiveStatus: true,
    showModeStatus: true,
    showMetrics: true,
    showHighlights: true,
    highlightsTitle: "BUILT FOR THE NEXT GENERATION",
    highlightsSubtitle: "A carefully crafted network with competitive gameplay, reliable performance and a community-first experience.",
    highlights: [
      { id: "custom-gameplay", icon: "⚔", title: "Custom gameplay", description: "Unique mechanics, balanced progression and meaningful competition." },
      { id: "performance", icon: "⚡", title: "Optimised network", description: "A smooth experience built around stability and responsive gameplay." },
      { id: "community", icon: "✦", title: "Community first", description: "Events, fair staff support and a place to build your reputation." }
    ]
  },
  network: {
    proxyAddress: "sg-4.madflex.shop:19139",
    lifestealAddress: "sg-3.madflex.shop:19132",
    practiceAddress: "sg-1.madflex.shop:19138",
    javaVersion: "1.21.x",
    bedrockEnabled: false,
    bedrockAddress: "",
    bedrockPort: 19132
  },
  announcement: { enabled: false, text: "", linkLabel: "", linkUrl: "" },
  social: { discord: "", youtube: "", instagram: "", tiktok: "", x: "" },
  navigation: { store: true, features: true, forums: true, wiki: true, vote: true, staff: true },
  footer: {
    copyright: "© 2026 Anna MC Network.",
    disclaimer: "Not an official Minecraft product.",
    contactEmail: "",
    showPrivacy: true,
    showTerms: true,
    showContact: true,
    showStaff: true
  },
  seo: {
    title: "Anna MC | Ascend to Eternity",
    description: "Join Anna MC for custom Minecraft gameplay, competitive game modes and a welcoming community.",
    keywords: "Anna MC, Minecraft server, LifeSteal, Practice, Minecraft PvP",
    ogImage: ""
  },
  pages: {
    home: { title: "Anna MC | Ascend to Eternity", description: "Join Anna MC for custom Minecraft gameplay and a community of legends." },
    store: { title: "Store | Anna MC", description: "Explore ranks, perks and upgrades for the Anna MC network." },
    features: { title: "Features | Anna MC", description: "Discover the features and custom gameplay of Anna MC." },
    forums: { title: "Community Forums | Anna MC", description: "Join the Anna MC community discussions." },
    wiki: { title: "Wiki | Anna MC", description: "Guides, rules and information for Anna MC players." },
    vote: { title: "Vote | Anna MC", description: "Support Anna MC by voting on server lists." },
    staff: { title: "Staff | Anna MC", description: "Meet the team and apply to join Anna MC staff." },
    contact: { title: "Contact | Anna MC", description: "Get in touch with the Anna MC team." },
    privacy: { title: "Privacy Policy | Anna MC", description: "Read the Anna MC privacy policy." },
    terms: { title: "Terms of Service | Anna MC", description: "Read the Anna MC terms of service." }
  },
  pageSections: { home: [], store: [], features: [], forums: [], wiki: [], vote: [], staff: [], contact: [], privacy: [], terms: [] }
};

const text = (value, fallback, max) => typeof value === "string" ? value.trim().slice(0, max) : fallback;
const bool = (value, fallback) => typeof value === "boolean" ? value : fallback;
const hex = (value, fallback) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const address = (value, fallback) => typeof value === "string" && value.trim().length <= 160 && /^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(value.trim()) ? value.trim() : fallback;
function safeUrl(value, fallback = "") {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const input = value.trim();
  if (input.startsWith("/") && !input.startsWith("//")) return input.slice(0, 500);
  try { const parsed = new URL(input); return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString().slice(0, 500) : fallback; }
  catch { return fallback; }
}
function normalizeContent(input = {}) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const site = src.site || {}, home = src.home || {}, network = src.network || {}, announcement = src.announcement || {}, social = src.social || {}, navigation = src.navigation || {}, footer = src.footer || {}, seo = src.seo || {}, pages = src.pages || {};
  const result = structuredClone(DEFAULT_CONTENT);
  result.site = {
    name: text(site.name, result.site.name, 80) || result.site.name,
    tagline: text(site.tagline, result.site.tagline, 140),
    logoUrl: safeUrl(site.logoUrl, result.site.logoUrl),
    faviconUrl: safeUrl(site.faviconUrl, result.site.faviconUrl),
    themeColor: hex(site.themeColor, result.site.themeColor),
    supportEmail: text(site.supportEmail, "", 254),
    maintenanceMode: bool(site.maintenanceMode, false)
  };
  for (const key of ["eyebrow","performanceBadge","titleLine1","titleLine2","description","joinButtonLabel","highlightsTitle","highlightsSubtitle"]) {
    result.home[key] = text(home[key], result.home[key], key === "description" || key === "highlightsSubtitle" ? 500 : 120);
  }
  result.home.serverAddress = address(home.serverAddress, result.home.serverAddress);
  for (const key of ["showLiveStatus","showModeStatus","showMetrics","showHighlights"]) result.home[key] = bool(home[key], result.home[key]);
  if (Array.isArray(home.highlights)) {
    result.home.highlights = home.highlights.slice(0, 8).map((item, i) => ({
      id: /^[a-z0-9_-]{2,48}$/.test(String(item?.id || "")) ? String(item.id) : "highlight-" + (i + 1),
      icon: text(item?.icon, "✦", 8),
      title: text(item?.title, "New highlight", 80),
      description: text(item?.description, "", 240)
    })).filter(item => item.title);
  }
  result.network = {
    proxyAddress: address(network.proxyAddress, result.network.proxyAddress),
    lifestealAddress: address(network.lifestealAddress, result.network.lifestealAddress),
    practiceAddress: address(network.practiceAddress, result.network.practiceAddress),
    javaVersion: text(network.javaVersion, result.network.javaVersion, 32),
    bedrockEnabled: bool(network.bedrockEnabled, false),
    bedrockAddress: address(network.bedrockAddress, ""),
    bedrockPort: Number.isInteger(network.bedrockPort) && network.bedrockPort >= 1 && network.bedrockPort <= 65535 ? network.bedrockPort : 19132
  };
  result.announcement = {
    enabled: bool(announcement.enabled, false),
    text: text(announcement.text, "", 240),
    linkLabel: text(announcement.linkLabel, "", 60),
    linkUrl: safeUrl(announcement.linkUrl, "")
  };
  for (const key of ["discord","youtube","instagram","tiktok","x"]) result.social[key] = safeUrl(social[key], "");
  for (const key of Object.keys(result.navigation)) result.navigation[key] = bool(navigation[key], result.navigation[key]);
  result.footer = {
    copyright: text(footer.copyright, result.footer.copyright, 180),
    disclaimer: text(footer.disclaimer, result.footer.disclaimer, 180),
    contactEmail: text(footer.contactEmail, result.site.supportEmail, 254),
    showPrivacy: bool(footer.showPrivacy, true),
    showTerms: bool(footer.showTerms, true),
    showContact: bool(footer.showContact, true),
    showStaff: bool(footer.showStaff, true)
  };
  result.seo = {
    title: text(seo.title, result.seo.title, 160),
    description: text(seo.description, result.seo.description, 320),
    keywords: text(seo.keywords, result.seo.keywords, 500),
    ogImage: safeUrl(seo.ogImage, "")
  };
  for (const key of Object.keys(result.pages)) {
    const page = pages[key] || {};
    result.pages[key] = {
      title: text(page.title, result.pages[key].title, 160),
      description: text(page.description, result.pages[key].description, 320)
    };
  }
  const pageSections = src.pageSections && typeof src.pageSections === "object" ? src.pageSections : {};
  for (const key of Object.keys(result.pageSections)) {
    const blocks = Array.isArray(pageSections[key]) ? pageSections[key].slice(0, 12) : [];
    result.pageSections[key] = blocks.map((item, i) => ({
      id: /^[a-z0-9_-]{2,48}$/.test(String(item?.id || "")) ? String(item.id) : "section-" + (i + 1),
      eyebrow: text(item?.eyebrow, "", 80),
      title: text(item?.title, "New section", 120),
      body: text(item?.body, "", 1200),
      imageUrl: safeUrl(item?.imageUrl, ""),
      buttonLabel: text(item?.buttonLabel, "", 80),
      buttonUrl: safeUrl(item?.buttonUrl, ""),
      active: bool(item?.active, true)
    })).filter(item => item.title);
  }
  return result;
}

module.exports = { DEFAULT_CONTENT, normalizeContent };

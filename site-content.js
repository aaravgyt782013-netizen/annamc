"use strict";
(async function(){
  const root=document.documentElement;
  const get=(obj,path)=>path.split(".").reduce((v,k)=>v&&v[k]!==undefined?v[k]:undefined,obj);
  const safeUrl=value=>{try{const u=new URL(value,location.origin);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}};
  const toast=message=>{
    let el=document.getElementById("anna-cms-toast");
    if(!el){el=document.createElement("div");el.id="anna-cms-toast";el.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1000;padding:12px 18px;border:1px solid rgba(242,202,80,.4);border-radius:12px;background:#141416;color:#f7e7aa;font:600 13px Inter,system-ui,sans-serif;box-shadow:0 12px 35px #0008";document.body.appendChild(el)}
    el.textContent=message;el.hidden=false;clearTimeout(el._timer);el._timer=setTimeout(()=>el.hidden=true,3000);
  };
  try{
    const response=await fetch("/api/content",{credentials:"same-origin",cache:"no-store"});
    if(!response.ok)throw new Error("CMS content unavailable");
    const data=await response.json(),content=data.content||{};
    window.ANNA_SITE_CONTENT=content;
    const themeColor=content.site?.themeColor;
    if(/^#[0-9a-f]{6}$/i.test(themeColor||"")){
      root.style.setProperty("--admin-primary",themeColor);root.style.setProperty("--primary",themeColor);
      document.querySelectorAll('meta[name="theme-color"]').forEach(n=>n.content=themeColor);
      const style=document.createElement("style");style.textContent=".text-primary{color:"+themeColor+"!important}.bg-primary{background-color:"+themeColor+"!important}.border-primary{border-color:"+themeColor+"!important}.text-primary-container{color:"+themeColor+"!important}.bg-primary-container{background-color:"+themeColor+"!important}";
      document.head.appendChild(style);
    }
    const logo=safeUrl(content.site?.logoUrl||"/anna-mc-logo.svg");
    if(logo)document.querySelectorAll('img[src*="anna-mc-logo"],img[data-cms-logo]').forEach(img=>{img.src=logo;img.alt=(content.site?.name||"Anna MC")+" logo";});
    const favicon=safeUrl(content.site?.faviconUrl||content.site?.logoUrl||"/anna-mc-logo.svg");
    if(favicon)document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach(link=>link.href=favicon);
    const page=(location.pathname.split("/").pop()||"index.html").replace(".html","")||"home";
    const pageKey=page==="index"?"home":page;
    const pageSeo=content.pages?.[pageKey]||{};
    const brandName=content.site?.name||"Anna MC";
    const title=(pageSeo.title||content.seo?.title||brandName).replace(/Anna MC/g,brandName),description=(pageSeo.description||content.seo?.description||content.site?.tagline||"");
    if(title){
      document.title=title;
      for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]']){const m=document.querySelector(selector);if(m)m.content=title;}
    }
    if(description){
      let meta=document.querySelector('meta[name="description"]');
      if(meta)meta.content=description;else{meta=document.createElement("meta");meta.name="description";meta.content=description;document.head.appendChild(meta);}
      for(const selector of ['meta[property="og:description"]','meta[name="twitter:description"]']){const m=document.querySelector(selector);if(m)m.content=description;}
    }
    if(content.seo?.keywords){let keywords=document.querySelector('meta[name="keywords"]');if(keywords)keywords.content=content.seo.keywords;}
    if(content.seo?.ogImage){const image=safeUrl(content.seo.ogImage);for(const selector of ['meta[property="og:image"]','meta[name="twitter:image"]']){const m=document.querySelector(selector);if(image&&m)m.content=image;}}
    document.querySelectorAll("[data-cms]").forEach(el=>{const value=get(content,el.getAttribute("data-cms"));if(value!==undefined&&value!==null)el.textContent=String(value);});
    document.querySelectorAll("[data-cms-href]").forEach(el=>{const url=safeUrl(get(content,el.getAttribute("data-cms-href")));if(url)el.setAttribute("href",url);});
    document.querySelectorAll("[data-cms-src]").forEach(el=>{const url=safeUrl(get(content,el.getAttribute("data-cms-src")));if(url)el.setAttribute("src",url);});
    document.querySelectorAll("[data-cms-show]").forEach(el=>{if(get(content,el.getAttribute("data-cms-show"))===false)el.hidden=true;});
    document.querySelectorAll("[data-cms-server-address]").forEach(el=>{el.textContent=content.home?.serverAddress||content.network?.proxyAddress||"";});
    document.querySelectorAll("[data-cms-copy-server]").forEach(el=>el.addEventListener("click",async()=>{
      const address=content.home?.serverAddress||content.network?.proxyAddress||"";
      if(!address)return;
      try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(address);else throw new Error("Clipboard unavailable");toast("Server address copied: "+address);}
      catch{window.prompt("Copy the Anna MC server address",address);}
    }));
    const nav=content.navigation||{};
    const navSelectors={store:'a[href*="store"]',features:'a[href*="features"]',forums:'a[href*="forums"]',wiki:'a[href*="wiki"]',vote:'a[href*="vote"]',staff:'a[href*="staff"]'};
    for(const [key,selector] of Object.entries(navSelectors))if(nav[key]===false)document.querySelectorAll("header "+selector).forEach(el=>el.hidden=true);
    const footer=content.footer||{};
    document.querySelectorAll("[data-cms-footer-copyright]").forEach(el=>el.textContent=[footer.copyright,footer.disclaimer].filter(Boolean).join(" "));
    const footerNode=document.querySelector("footer");
    if(footerNode){
      if(footer.showPrivacy===false){const a=footerNode.querySelector('a[href*="privacy"]');if(a)a.hidden=true;}
      if(footer.showTerms===false){const a=footerNode.querySelector('a[href*="terms"]');if(a)a.hidden=true;}
      if(footer.showContact===false){const a=footerNode.querySelector('a[href*="contact"]');if(a)a.hidden=true;}
      if(footer.showStaff===false){const a=footerNode.querySelector('a[href*="staff"]');if(a)a.hidden=true;}
    }
    const notice=content.announcement||{};
    const maintenance=content.site?.maintenanceMode===true;
    const noticeText=maintenance?"Website maintenance is in progress. Some features may be temporarily unavailable.":notice.text;
    if((maintenance||(notice.enabled&&noticeText))&&noticeText){
      const bar=document.createElement("aside");bar.className="anna-cms-announcement";bar.setAttribute("role","status");
      const label=document.createElement("span");label.textContent=noticeText;bar.appendChild(label);
      const linkUrl=safeUrl(notice.linkUrl);
      if(!maintenance&&linkUrl&&notice.linkLabel){const link=document.createElement("a");link.href=linkUrl;link.textContent=notice.linkLabel;link.rel="noopener";bar.appendChild(link);}
      const close=document.createElement("button");close.type="button";close.textContent="×";close.setAttribute("aria-label","Dismiss notice");close.addEventListener("click",()=>bar.remove());bar.appendChild(close);
      document.body.prepend(bar);const header=document.querySelector("header");if(header)header.style.top="42px";
      const style=document.createElement("style");style.textContent=".anna-cms-announcement{position:relative;z-index:70;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:10px 42px;background:#171719;color:#f2ca50;border-bottom:1px solid rgba(242,202,80,.28);font:600 13px/1.4 Inter,system-ui,sans-serif;text-align:center}.anna-cms-announcement a{color:#fff;text-decoration:underline;text-underline-offset:3px}.anna-cms-announcement button{position:absolute;right:14px;top:4px;background:transparent;border:0;color:#fff;font-size:23px;cursor:pointer}";
      document.head.appendChild(style);
    }
    const home=content.home||{};
    if(pageKey==="home"&&home.showHighlights!==false&&Array.isArray(home.highlights)&&home.highlights.length){
      const main=document.querySelector("main");
      if(main&&!document.getElementById("anna-cms-highlights")){
        const section=document.createElement("section");section.id="anna-cms-highlights";section.className="anna-cms-highlights";
        const title=document.createElement("h2");title.textContent=home.highlightsTitle||"Why play Anna MC";
        const subtitle=document.createElement("p");subtitle.textContent=home.highlightsSubtitle||"";
        const grid=document.createElement("div");grid.className="anna-cms-highlights-grid";
        for(const item of home.highlights){const card=document.createElement("article");card.className="anna-cms-highlight-card";const icon=document.createElement("span");icon.className="anna-cms-highlight-icon";icon.textContent=item.icon||"✦";const heading=document.createElement("h3");heading.textContent=item.title||"";const body=document.createElement("p");body.textContent=item.description||"";card.append(icon,heading,body);grid.appendChild(card);}
        section.append(title,subtitle,grid);main.appendChild(section);
        const style=document.createElement("style");style.textContent=".anna-cms-highlights{margin:34px auto 60px;max-width:1100px;padding:30px 22px;text-align:center;color:#f5f5f5}.anna-cms-highlights>h2{font:800 clamp(22px,4vw,34px)/1.2 'Space Grotesk',sans-serif;letter-spacing:.04em;color:#f2ca50}.anna-cms-highlights>p{max-width:720px;margin:12px auto 26px;color:#aaa;font:400 15px/1.65 Inter,system-ui,sans-serif}.anna-cms-highlights-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;text-align:left}.anna-cms-highlight-card{padding:22px;border:1px solid rgba(242,202,80,.18);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));min-height:175px}.anna-cms-highlight-icon{display:inline-flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:50%;background:rgba(242,202,80,.1);color:#f2ca50;font-size:23px}.anna-cms-highlight-card h3{margin:16px 0 8px;font:700 17px 'Space Grotesk',sans-serif}.anna-cms-highlight-card p{color:#aaa;font:400 14px/1.6 Inter,system-ui,sans-serif}";document.head.appendChild(style);
      }
    }
    const customBlocks=content.pageSections?.[pageKey]||[];
    const pageMain=document.querySelector("main");
    if(pageMain&&Array.isArray(customBlocks)&&customBlocks.some(block=>block.active!==false)){
      const wrapper=document.createElement("section");wrapper.id="anna-cms-page-sections";wrapper.className="anna-cms-page-sections";
      for(const block of customBlocks.filter(item=>item.active!==false)){
        const card=document.createElement("article");card.className="anna-cms-page-block";
        if(block.eyebrow){const eyebrow=document.createElement("p");eyebrow.className="anna-cms-page-eyebrow";eyebrow.textContent=block.eyebrow;card.appendChild(eyebrow);}
        const heading=document.createElement("h2");heading.textContent=block.title||"";card.appendChild(heading);
        if(block.body){const body=document.createElement("p");body.textContent=block.body;card.appendChild(body);}
        const imageUrl=safeUrl(block.imageUrl);if(imageUrl){const image=document.createElement("img");image.src=imageUrl;image.alt=block.title||"Anna MC";image.loading="lazy";card.appendChild(image);}
        const buttonUrl=safeUrl(block.buttonUrl);if(buttonUrl&&block.buttonLabel){const link=document.createElement("a");link.href=buttonUrl;link.textContent=block.buttonLabel;link.rel="noopener";card.appendChild(link);}
        wrapper.appendChild(card);
      }
      if(wrapper.children.length)pageMain.appendChild(wrapper);
      const style=document.createElement("style");style.textContent=".anna-cms-page-sections{max-width:1100px;margin:32px auto 60px;padding:0 20px;display:grid;gap:18px}.anna-cms-page-block{padding:clamp(20px,4vw,34px);border:1px solid rgba(242,202,80,.18);border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.018));color:#eee}.anna-cms-page-eyebrow{color:#f2ca50;font:700 11px Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}.anna-cms-page-block h2{font:800 clamp(21px,3vw,30px)/1.2 'Space Grotesk',sans-serif;margin:8px 0 12px}.anna-cms-page-block>p:not(.anna-cms-page-eyebrow){color:#b4b4b4;font:400 15px/1.7 Inter,system-ui,sans-serif;white-space:pre-line;max-width:850px}.anna-cms-page-block img{display:block;width:100%;max-height:380px;object-fit:cover;border-radius:14px;margin-top:16px}.anna-cms-page-block a{display:inline-flex;margin-top:15px;padding:10px 16px;border-radius:10px;background:#f2ca50;color:#171719;font:700 12px Inter,system-ui,sans-serif;text-decoration:none}";
      document.head.appendChild(style);
    }
    if(pageKey==="home"&&content.network?.bedrockEnabled&&content.network?.bedrockAddress){
      const main=document.querySelector("main");
      if(main&&!document.getElementById("anna-cms-edition-info")){
        const section=document.createElement("section");section.id="anna-cms-edition-info";section.className="anna-cms-edition-info";
        const heading=document.createElement("h2");heading.textContent="CONNECT TO ANNA MC";
        const java=document.createElement("div");java.className="anna-cms-edition-item";
        const javaTitle=document.createElement("strong");javaTitle.textContent="Java Edition";
        const javaBody=document.createElement("span");javaBody.textContent=(content.home?.serverAddress||content.network.proxyAddress||"")+" · "+(content.network.javaVersion||"1.21.x");
        java.append(javaTitle,javaBody);
        const bedrock=document.createElement("div");bedrock.className="anna-cms-edition-item";
        const bedrockTitle=document.createElement("strong");bedrockTitle.textContent="Bedrock Edition";
        const bedrockBody=document.createElement("span");bedrockBody.textContent=content.network.bedrockAddress+" · Port "+content.network.bedrockPort;
        bedrock.append(bedrockTitle,bedrockBody);
        section.append(heading,java,bedrock);main.appendChild(section);
        const style=document.createElement("style");style.textContent=".anna-cms-edition-info{max-width:900px;margin:30px auto 50px;padding:24px;border:1px solid rgba(242,202,80,.2);border-radius:18px;background:#101012;color:#f5f5f5}.anna-cms-edition-info h2{font:800 17px 'Space Grotesk',sans-serif;color:#f2ca50;letter-spacing:.12em;margin:0 0 16px}.anna-cms-edition-item{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px 0;border-top:1px solid #ffffff18;font:13px Inter,system-ui,sans-serif}.anna-cms-edition-item span{color:#aaa;overflow-wrap:anywhere}";
        document.head.appendChild(style);
      }
    }
    const socials=content.social||{},socialLinks=Object.entries(socials).filter(([,url])=>safeUrl(url));
    if(footerNode&&content.site?.tagline){
      const brandLogo=footerNode.querySelector('img[src*="anna-mc-logo"],img[data-cms-logo]');
      const brandBlock=brandLogo?.parentElement?.parentElement;
      if(brandBlock&&!brandBlock.querySelector(".anna-cms-brand-tagline")){
        const tagline=document.createElement("p");tagline.className="anna-cms-brand-tagline";tagline.textContent=content.site.tagline;
        const copyright=brandBlock.querySelector("[data-cms-footer-copyright]")?.parentElement;
        if(copyright)brandBlock.insertBefore(tagline,copyright);else brandBlock.appendChild(tagline);
        const style=document.createElement("style");style.textContent=".anna-cms-brand-tagline{margin:-4px 0 10px;color:#aaa;font:500 12px/1.5 Inter,system-ui,sans-serif;letter-spacing:.04em}";
        document.head.appendChild(style);
      }
    }
    if(footerNode&&content.footer?.contactEmail&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.footer.contactEmail)&&!footerNode.querySelector(".anna-cms-contact-email")){const contact=document.createElement("a");contact.className="anna-cms-contact-email";contact.href="mailto:"+content.footer.contactEmail;contact.textContent=content.footer.contactEmail;footerNode.appendChild(contact);const style=document.createElement("style");style.textContent=".anna-cms-contact-email{display:block;text-align:center;padding:0 16px 18px;color:#aaa;font:12px Inter,system-ui,sans-serif;text-decoration:none}";document.head.appendChild(style);}\n    if(footerNode&&socialLinks.length&&!footerNode.querySelector(".anna-cms-socials")){
      const row=document.createElement("div");row.className="anna-cms-socials";
      for(const [name,url] of socialLinks){const a=document.createElement("a");a.href=safeUrl(url);a.target="_blank";a.rel="noopener noreferrer";a.textContent=name==="x"?"X":name.charAt(0).toUpperCase()+name.slice(1);row.appendChild(a);}
      footerNode.appendChild(row);const style=document.createElement("style");style.textContent=".anna-cms-socials{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;padding:0 18px 22px}.anna-cms-socials a{color:#aaa;font:700 11px Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;text-decoration:none}.anna-cms-socials a:hover{color:#f2ca50}";document.head.appendChild(style);
    }
    // Also apply the existing advanced selector editor consistently across every public page.
    try{
      const advancedResponse=await fetch("/api/site-config",{credentials:"same-origin",cache:"no-store"});
      if(advancedResponse.ok){
        const advanced=(await advancedResponse.json()).config||{};
        for(const [key,value] of Object.entries(advanced.theme||{})){
          if(typeof value!=="string"||/[;{}<>]/.test(value))continue;
          if(/^--[a-zA-Z0-9_-]{1,60}$/.test(key))root.style.setProperty(key,value);
          else if(["primary","secondary","tertiary","background","surface"].includes(key)){root.style.setProperty("--admin-"+key,value);root.style.setProperty("--"+key,value);}
        }
        for(const [selector,value] of Object.entries(advanced.textOverrides||{})){
          if(typeof value!=="string")continue;try{document.querySelectorAll(selector).forEach(el=>el.textContent=value);}catch{}
        }
        for(const selector of advanced.hideSelectors||[]){if(typeof selector!=="string")continue;try{document.querySelectorAll(selector).forEach(el=>{el.hidden=true;el.setAttribute("aria-hidden","true");});}catch{}}
      }
    }catch(error){console.warn("Advanced site display rules could not be loaded.",error.message);}
  }catch(error){console.warn("Anna MC CMS could not be loaded:",error.message);}
})();

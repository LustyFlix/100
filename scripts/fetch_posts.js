const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const FLARESOLVERR_URL = "https://mabelle-supervenient-talitha.ngrok-free.dev/v1";

const SITEMAP_URLS = [
  'https://missav.ws/sitemap_items_51.xml',
'https://missav.ws/sitemap_items_52.xml',
'https://missav.ws/sitemap_items_53.xml',
'https://missav.ws/sitemap_items_54.xml',
'https://missav.ws/sitemap_items_55.xml',
'https://missav.ws/sitemap_items_56.xml',
'https://missav.ws/sitemap_items_57.xml',
'https://missav.ws/sitemap_items_58.xml',
'https://missav.ws/sitemap_items_59.xml',
'https://missav.ws/sitemap_items_60.xml',
'https://missav.ws/sitemap_items_61.xml',
'https://missav.ws/sitemap_items_62.xml',
'https://missav.ws/sitemap_items_63.xml',
'https://missav.ws/sitemap_items_64.xml',
'https://missav.ws/sitemap_items_65.xml',
'https://missav.ws/sitemap_items_66.xml',
'https://missav.ws/sitemap_items_67.xml',
'https://missav.ws/sitemap_items_68.xml',
'https://missav.ws/sitemap_items_69.xml',
'https://missav.ws/sitemap_items_70.xml',
'https://missav.ws/sitemap_items_71.xml',
'https://missav.ws/sitemap_items_72.xml',
'https://missav.ws/sitemap_items_73.xml',
'https://missav.ws/sitemap_items_74.xml',
'https://missav.ws/sitemap_items_75.xml',
'https://missav.ws/sitemap_items_76.xml',
'https://missav.ws/sitemap_items_77.xml',
'https://missav.ws/sitemap_items_78.xml',
'https://missav.ws/sitemap_items_79.xml',
'https://missav.ws/sitemap_items_80.xml',
'https://missav.ws/sitemap_items_81.xml',
'https://missav.ws/sitemap_items_82.xml',
'https://missav.ws/sitemap_items_83.xml',
'https://missav.ws/sitemap_items_84.xml',
'https://missav.ws/sitemap_items_85.xml',
'https://missav.ws/sitemap_items_86.xml',
'https://missav.ws/sitemap_items_87.xml',
'https://missav.ws/sitemap_items_88.xml',
'https://missav.ws/sitemap_items_89.xml',
'https://missav.ws/sitemap_items_90.xml',
'https://missav.ws/sitemap_items_91.xml',
'https://missav.ws/sitemap_items_92.xml',
'https://missav.ws/sitemap_items_93.xml',
'https://missav.ws/sitemap_items_94.xml',
'https://missav.ws/sitemap_items_95.xml',
'https://missav.ws/sitemap_items_96.xml',
'https://missav.ws/sitemap_items_97.xml',
'https://missav.ws/sitemap_items_98.xml',
'https://missav.ws/sitemap_items_99.xml',
'https://missav.ws/sitemap_items_100.xml'
];

const POSTS_DIR = path.join(__dirname, "../data/posts");
const INDEX_DIR = path.join(__dirname, "../data/index");
const META_DIR = path.join(__dirname, "../data/meta");

[POSTS_DIR, INDEX_DIR, META_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---------- FETCH ----------
async function fetchWithFlareSolverr(url) {
  const res = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout: 60000
    })
  });

  const data = await res.json();
  if (!data.solution) throw new Error("FlareSolverr failed");

  return data.solution.response;
}

async function smartFetch(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {}

  console.log("⚡ FlareSolverr:", url);
  return await fetchWithFlareSolverr(url);
}

// ---------- SITEMAP ----------
async function fetchSitemap(url) {
  const xml = await smartFetch(url);
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);

  return result.urlset.url.map(u => {
    if (u["xhtml:link"]) {
      const en = u["xhtml:link"].find(x => x.$.hreflang === "en");
      return en ? en.$.href : null;
    }
    return null;
  }).filter(Boolean);
}

// ---------- HELPERS ----------
function getKey(url) {
  const match = url.match(/([a-z0-9\-]+)$/i);
  return match ? match[1].toLowerCase() : "unknown";
}

function getIndexFile(key) {
  return path.join(INDEX_DIR, key[0] + ".json");
}

// function getMetaFile(key) {
//   return path.join(META_DIR, key[0] + ".json");
// }

function slugFromUrl(url) {
  // Clean URL
  const clean = url
    .replace(/https?:\/\/[^\/]+\//, "")
    .replace(/\/$/, "");

  // Split parts
  const parts = clean.split("/");

  // ✅ Detect language (common langs)
  const langs = ["en", "cn", "zh", "ja", "ko", "ms", "th", "de", "fr", "vi", "id", "fil", "pt"];

  let lang = "xx";
  for (const p of parts) {
    if (langs.includes(p)) {
      lang = p;
      break;
    }
  }

  // ✅ Always take LAST part as ID
  const id = parts[parts.length - 1] || "unknown";

  // ✅ Clean filename
  const safeId = id.replace(/[^a-z0-9\-]/gi, "").toLowerCase();
  const slug = `${lang}-${safeId}.html`;

  // 🔥 SMART SHARDING (works for ANY id format)
  const level1 = safeId.slice(0, 2) || "00";
  const level2 = safeId.slice(2, 4) || "00";
  const level3 = safeId.slice(4, 6) || "00";

  const dir = path.join(POSTS_DIR, lang, level1, level2, level3);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(lang, level1, level2, level3, slug);
}

// ---------- MAIN DOWNLOAD ----------
async function downloadPost(url) {
  try {
    const key = getKey(url);
    const indexFile = getIndexFile(key);

    // skip if exists
    if (fs.existsSync(indexFile)) {
      const data = JSON.parse(fs.readFileSync(indexFile));
      if (data[key]) {
        console.log("⏩ Skip:", key);
        return;
      }
    }

    const html = await smartFetch(url);

    const relativePath = slugFromUrl(url);
    const filePath = path.join(POSTS_DIR, relativePath);

    fs.writeFileSync(filePath, html);

    // INDEX
    let idx = {};
    if (fs.existsSync(indexFile)) {
      try { idx = JSON.parse(fs.readFileSync(indexFile)); } catch {}
    }
    idx[key] = relativePath;
    fs.writeFileSync(indexFile, JSON.stringify(idx));

    // META
    // const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || key;
    // const image = (html.match(/og:image" content="(.*?)"/i) || [])[1] || null;

    // const metaFile = getMetaFile(key);
    // let meta = {};
    // if (fs.existsSync(metaFile)) {
    //   try { meta = JSON.parse(fs.readFileSync(metaFile)); } catch {}
    // }

    // meta[key] = { title, image, path: relativePath };
    // fs.writeFileSync(metaFile, JSON.stringify(meta));

    console.log("✅ Saved:", key);

  } catch (err) {
    console.error("❌ Error:", url, err.message);
  }
}

// ---------- RUN ----------
(async () => {
  for (const sitemap of SITEMAP_URLS) {
    console.log("📄", sitemap);
    const urls = await fetchSitemap(sitemap);

    const BATCH = 3;
    for (let i = 0; i < urls.length; i += BATCH) {
      await Promise.all(urls.slice(i, i + BATCH).map(downloadPost));
    }
  }
})();

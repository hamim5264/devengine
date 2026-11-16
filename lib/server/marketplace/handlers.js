const { getServerFirebase, ADMIN_EMAIL } = require('../admin');
const { privateHeaders } = require('../calendar/security');
const crypto = require('node:crypto');

const DESIGNS_COL = 'landing_page_designs';
const CATEGORIES_COL = 'landing_page_categories';
const ORDERS_COL = 'landing_page_orders';
const REVIEWS_COL = 'landing_page_reviews';
const SETTINGS_DOC = 'landing_page_settings/main';

const SEED_DESIGNS = [
  {
    id: 'seed_flowstack_saas',
    slug: 'flowstack-saas',
    title: 'FlowStack SaaS',
    shortDescription: 'A focused software launch page with pricing proof and product storytelling.',
    fullDescription: 'FlowStack SaaS is a high-converting, production-ready landing page template designed specifically for modern SaaS platforms, developer tools, and AI startups. Features dark & light mode, interactive pricing matrix, testimonials, feature highlights, and motion micro-interactions.',
    category: 'saas',
    categoryName: 'SaaS',
    tags: ['SaaS', 'Dashboard', 'Framer', 'React', 'Next.js', 'Dark Mode'],
    price: 4900,
    originalPrice: 6900,
    discountPercent: 29,
    currency: 'BDT',
    isFree: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=1600&auto=format&fit=crop',
    ],
    desktopScreenshot: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
    tabletScreenshot: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop',
    mobileScreenshot: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
    liveDemoUrl: 'https://www.devenginehq.com',
    deliveryType: 'zip_file',
    whatsIncluded: [
      'Figma Component Library & UI Kit (.fig)',
      'Next.js 14 & Tailwind CSS Source Code',
      'Framer Motion Interactive Animations',
      'Responsive Mobile & Tablet Breakpoints',
      'SEO Optimized Meta & OpenGraph Tags',
      'Commercial Use License & Free Updates',
    ],
    technologies: ['Next.js', 'React', 'Tailwind CSS', 'TypeScript', 'Framer Motion', 'Figma'],
    license: 'Commercial License · Unlimited Client & Commercial Projects',
    isFeatured: true,
    isPopular: true,
    isTrending: false,
    displayOrder: 0,
    status: 'published',
    rating: 4.9,
    reviewCount: 142,
    salesCount: 3200,
    viewsCount: 1420,
    favoritesCount: 14,
    seoTitle: 'FlowStack SaaS | Landing Page Design',
    seoDescription: 'High-converting SaaS landing page with clean layout, engaging visuals, and interactive pricing proof.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed_framefolio',
    slug: 'framefolio',
    title: 'Framefolio',
    shortDescription: 'A refined portfolio page for designers, photographers, and independent makers.',
    fullDescription: 'Framefolio is a minimal, typography-focused portfolio landing page designed for world-class designers, digital artists, and creative agencies. Highlights client work, project case studies, awards, and an interactive contact reel.',
    category: 'portfolio',
    categoryName: 'Portfolio',
    tags: ['Portfolio', 'Creative', 'Minimal', 'Grid', 'Case Studies'],
    price: 3900,
    originalPrice: 5500,
    discountPercent: 29,
    currency: 'BDT',
    isFree: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1600&auto=format&fit=crop',
    ],
    desktopScreenshot: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop',
    tabletScreenshot: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1600&auto=format&fit=crop',
    mobileScreenshot: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
    liveDemoUrl: 'https://www.devenginehq.com',
    deliveryType: 'zip_file',
    whatsIncluded: [
      'Figma Component Library',
      'Next.js & Tailwind CSS Source',
      'Custom Case Study Layouts',
      'Dark / Light Switcher',
      'Commercial License',
    ],
    technologies: ['Next.js', 'Tailwind CSS', 'Figma', 'TypeScript'],
    license: 'Commercial License · Unlimited Projects',
    isFeatured: false,
    isPopular: false,
    isTrending: true,
    displayOrder: 1,
    status: 'published',
    rating: 4.8,
    reviewCount: 96,
    salesCount: 1800,
    viewsCount: 890,
    favoritesCount: 22,
    seoTitle: 'Framefolio | Creative Portfolio Design',
    seoDescription: 'Refined portfolio landing page for designers, photographers, and independent makers.',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed_northstar_creative',
    slug: 'northstar-creative',
    title: 'Northstar Creative',
    shortDescription: 'A focused agency landing page designed to put selected client work first.',
    fullDescription: 'Northstar Creative delivers a bold, editorial aesthetic tailored for boutique agencies, motion studios, and branding consultancies. Includes interactive services grid, client logos, video reels, and inquiry intake.',
    category: 'agency',
    categoryName: 'Agency',
    tags: ['Agency', 'Editorial', 'Studio', 'Branding', 'Creative'],
    price: 5900,
    originalPrice: 7900,
    discountPercent: 25,
    currency: 'BDT',
    isFree: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1600&auto=format&fit=crop',
    ],
    desktopScreenshot: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    tabletScreenshot: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1600&auto=format&fit=crop',
    mobileScreenshot: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
    liveDemoUrl: 'https://www.devenginehq.com',
    deliveryType: 'zip_file',
    whatsIncluded: [
      'Figma Design System',
      'Production Next.js Template',
      'Motion Interactions',
      'Commercial License',
      'Priority Support',
    ],
    technologies: ['Next.js', 'Tailwind CSS', 'Framer Motion', 'Figma'],
    license: 'Commercial License · Unlimited Projects',
    isFeatured: true,
    isPopular: false,
    isTrending: false,
    displayOrder: 2,
    status: 'published',
    rating: 4.8,
    reviewCount: 210,
    salesCount: 4600,
    viewsCount: 2300,
    favoritesCount: 45,
    seoTitle: 'Northstar Creative | Agency Landing Page Design',
    seoDescription: 'Focused agency landing page designed to put selected client work first.',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed_teamly',
    slug: 'teamly',
    title: 'Teamly',
    shortDescription: 'A modern SaaS landing page for team collaboration and productivity.',
    fullDescription: 'Teamly is a sleek, modern SaaS landing page engineered for collaboration suites, task managers, and developer productivity tools. Features interactive feature cards, pricing tiers, and client reviews.',
    category: 'saas',
    categoryName: 'SaaS',
    tags: ['SaaS', 'Productivity', 'Collaboration', 'Clean UI', 'Next.js'],
    price: 4500,
    originalPrice: 5900,
    discountPercent: 24,
    currency: 'BDT',
    isFree: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
    previewImages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
    ],
    desktopScreenshot: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
    mobileScreenshot: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/embed/L_LUpnjgPso',
    liveDemoUrl: 'https://www.devenginehq.com',
    deliveryType: 'zip_file',
    whatsIncluded: [
      'Figma UI Kit & Tokens',
      'Production Next.js Source',
      'Interactive Components',
      'Commercial License',
    ],
    technologies: ['Next.js', 'Tailwind CSS', 'React', 'Figma'],
    license: 'Commercial License · Unlimited Projects',
    isFeatured: true,
    isPopular: false,
    isTrending: true,
    displayOrder: 3,
    status: 'published',
    rating: 4.8,
    reviewCount: 210,
    salesCount: 2400,
    viewsCount: 1950,
    favoritesCount: 38,
    seoTitle: 'Teamly | Team Collaboration SaaS Landing Page',
    seoDescription: 'A modern SaaS landing page for team collaboration and productivity.',
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

const SEED_CATEGORIES = [
  { id: 'cat_all', name: 'All', slug: 'all', description: 'Explore every curated landing page design', icon: 'dashboard', displayOrder: 0, isActive: true },
  { id: 'cat_saas', name: 'SaaS', slug: 'saas', description: 'Modern software & cloud service landing pages', icon: 'cloud', displayOrder: 1, isActive: true },
  { id: 'cat_crypto', name: 'Crypto & Trading', slug: 'crypto-trading', description: 'Engaging fintech, blockchain & trading platform designs', icon: 'currency_bitcoin', displayOrder: 2, isActive: true },
  { id: 'cat_agency', name: 'Agency', slug: 'agency', description: 'Creative studios, branding and design agencies', icon: 'palette', displayOrder: 3, isActive: true },
  { id: 'cat_ecommerce', name: 'E-Commerce', slug: 'ecommerce', description: 'High-converting online store & product landing pages', icon: 'shopping_bag', displayOrder: 4, isActive: true },
  { id: 'cat_ai', name: 'AI & Technology', slug: 'ai-technology', description: 'Artificial intelligence, deep tech & future labs', icon: 'psychology', displayOrder: 5, isActive: true },
  { id: 'cat_startup', name: 'Startup', slug: 'startup', description: 'High-velocity launchpads for early-stage ventures', icon: 'rocket_launch', displayOrder: 6, isActive: true },
  { id: 'cat_portfolio', name: 'Portfolio', slug: 'portfolio', description: 'Personal branding, creator & executive portfolios', icon: 'person', displayOrder: 7, isActive: true },
  { id: 'cat_healthcare', name: 'Healthcare', slug: 'healthcare', description: 'Medical clinics, health tech & wellness platforms', icon: 'medical_services', displayOrder: 8, isActive: true },
  { id: 'cat_realestate', name: 'Real Estate', slug: 'real-estate', description: 'Luxury architecture, property & estate showcases', icon: 'apartment', displayOrder: 9, isActive: true },
  { id: 'cat_mobileapps', name: 'Mobile Apps', slug: 'mobile-apps', description: 'iOS & Android native application showcase pages', icon: 'smartphone', displayOrder: 10, isActive: true },
  { id: 'cat_comingsoon', name: 'Coming Soon', slug: 'coming-soon', description: 'Pre-launch hype, waitlists & newsletter capture', icon: 'schedule', displayOrder: 11, isActive: true },
];

const SEED_REVIEWS = [
  {
    id: 'rev_seed_1',
    designId: 'seed_flowstack_saas',
    designTitle: 'FlowStack SaaS',
    customerName: 'Alex Rivera',
    customerEmail: 'alex@flowstack.io',
    rating: 5,
    comment: 'The motion craft and typography hierarchy are unmatched. Took our developer tool conversion up by 32% in week one.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-02-10T14:20:00.000Z',
  },
  {
    id: 'rev_seed_2',
    designId: 'seed_framefolio',
    designTitle: 'Framefolio',
    customerName: 'Liam Vance',
    customerEmail: 'liam@vance.design',
    rating: 5,
    comment: 'Minimal, gorgeous typography, and the dark mode switch is pure elegance. Client inquiries jumped by 40% after re-launching with Framefolio.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-02-12T10:15:00.000Z',
  },
  {
    id: 'rev_seed_3',
    designId: 'seed_northstar_creative',
    designTitle: 'Northstar Creative',
    customerName: 'Sophia Chen',
    customerEmail: 'sophia@northstar.co',
    rating: 5,
    comment: 'Best agency landing page architecture on the market. Next.js code is pristine and Framer Motion transitions run at 60fps.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-02-14T09:30:00.000Z',
  },
  {
    id: 'rev_seed_4',
    designId: 'seed_teamly',
    designTitle: 'Teamly',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus@teamly.dev',
    rating: 5,
    comment: 'Instant production-ready code. Our team was able to deploy in 2 days. Highly recommended for any SaaS team.',
    isVerifiedPurchase: true,
    status: 'approved',
    createdAt: '2026-02-15T11:45:00.000Z',
  },
];

async function seedDefaultDesignsAndCategories(db) {
  const batch = db.batch();

  // 1. Seed Designs
  for (const d of SEED_DESIGNS) {
    const ref = db.collection(DESIGNS_COL).doc(d.id);
    batch.set(ref, d, { merge: true });
  }

  // 2. Seed Categories
  for (const c of SEED_CATEGORIES) {
    const ref = db.collection(CATEGORIES_COL).doc(c.id);
    batch.set(ref, { ...c, createdAt: new Date().toISOString() }, { merge: true });
  }

  // 3. Seed Reviews
  for (const r of SEED_REVIEWS) {
    const ref = db.collection(REVIEWS_COL).doc(r.id);
    batch.set(ref, { ...r, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();
}

async function requireMarketplaceStaffOrAdmin(req, auth, db) {
  const match = /^Bearer ([^\s]{20,8192})$/.exec(req.headers.authorization || '');
  if (!match) {
    const err = new Error('admin_sign_in_required');
    err.status = 401;
    throw err;
  }
  const token = match[1];
  let claims;
  try {
    claims = await auth.verifyIdToken(token, true);
  } catch {
    const err = new Error('admin_sign_in_required');
    err.status = 401;
    throw err;
  }
  if (claims.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { uid: claims.uid, email: claims.email, role: 'admin' };
  }
  const staffDoc = await db.collection('staff_members').doc(claims.uid).get();
  if (staffDoc.exists) {
    const data = staffDoc.data() || {};
    if (data.status === 'active') {
      const allowed = data.allowedModules || [];
      if (allowed.includes('commerce') || allowed.includes('all')) {
        return { uid: claims.uid, email: claims.email, role: 'staff' };
      }
    }
  }
  const err = new Error('admin_only');
  err.status = 403;
  throw err;
}

async function marketplaceAdminHandler(req, res) {
  privateHeaders(res);

  try {
    const { auth, db } = getServerFirebase();
    const adminUser = await requireMarketplaceStaffOrAdmin(req, auth, db);
    const body = req.body || {};
    const action = body.action || req.query.action || 'fetch_all';

    // ── SEED ACTION EXPLICIT ──
    if (action === 'seed_defaults') {
      await seedDefaultDesignsAndCategories(db);
      return res.status(200).json({ success: true, message: 'Default showcase designs & categories seeded into database.' });
    }

    // ── 0. FETCH ALL ADMIN DATA (FAST BUNDLE) ──
    if (action === 'fetch_all') {
      let [designsSnap, categoriesSnap, ordersSnap, reviewsSnap, settingsSnap] = await Promise.all([
        db.collection(DESIGNS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        db.collection(CATEGORIES_COL).orderBy('displayOrder', 'asc').get(),
        db.collection(ORDERS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        db.collection(REVIEWS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        db.doc(SETTINGS_DOC).get(),
      ]);

      // If empty in database, automatically seed showcase data!
      if (designsSnap.empty || categoriesSnap.empty) {
        await seedDefaultDesignsAndCategories(db);
        [designsSnap, categoriesSnap, reviewsSnap] = await Promise.all([
          db.collection(DESIGNS_COL).orderBy('createdAt', 'desc').limit(200).get(),
          db.collection(CATEGORIES_COL).orderBy('displayOrder', 'asc').get(),
          db.collection(REVIEWS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        ]);
      }

      const designs = designsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const settings = settingsSnap.exists ? settingsSnap.data() : null;

      return res.status(200).json({
        success: true,
        designs,
        categories,
        orders,
        reviews,
        settings,
      });
    }

    // ── 1. LIST DESIGNS (ADMIN) ──
    if (action === 'list_admin') {
      const snap = await db.collection(DESIGNS_COL).orderBy('createdAt', 'desc').limit(200).get();
      const designs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, designs });
    }

    // ── 2. SAVE DESIGN (CREATE OR UPDATE WITH MANUAL METRICS OVERRIDES) ──
    if (action === 'save_design') {
      const item = body.design || {};
      if (!item.title || !item.slug) {
        return res.status(400).json({ error: 'Title and slug are required.' });
      }

      const id = item.id || db.collection(DESIGNS_COL).doc().id;
      const ref = db.collection(DESIGNS_COL).doc(id);
      const existing = (await ref.get()).data() || {};

      const price = Number(item.price) || 0;
      const originalPrice = Number(item.originalPrice) || price;
      const discountPercent = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

      const designRecord = {
        id,
        slug: String(item.slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        title: String(item.title).trim(),
        shortDescription: String(item.shortDescription || '').trim(),
        fullDescription: String(item.fullDescription || '').trim(),
        category: String(item.category || 'saas').trim(),
        categoryName: String(item.categoryName || 'SaaS').trim(),
        tags: Array.isArray(item.tags) ? item.tags.map(t => String(t).trim()).filter(Boolean) : [],
        price,
        originalPrice,
        discountPercent,
        currency: item.currency || 'BDT',
        isFree: Boolean(item.isFree),

        // Visual Assets (Supports both direct upload storage URLs and external image/video URLs)
        thumbnailUrl: String(item.thumbnailUrl || '').trim(),
        previewImages: Array.isArray(item.previewImages) ? item.previewImages.filter(Boolean) : [],
        desktopScreenshot: String(item.desktopScreenshot || '').trim(),
        tabletScreenshot: String(item.tabletScreenshot || '').trim(),
        mobileScreenshot: String(item.mobileScreenshot || '').trim(),
        videoUrl: String(item.videoUrl || '').trim(),

        // Demo & Delivery
        liveDemoUrl: String(item.liveDemoUrl || '').trim(),
        deliveryType: item.deliveryType || 'download_link',
        deliveryFileUrl: String(item.deliveryFileUrl || '').trim(),
        whatsIncluded: Array.isArray(item.whatsIncluded) ? item.whatsIncluded.filter(Boolean) : [
          'Full Responsive Code (Next.js & React)',
          'Framer Motion Smooth Animations',
          'Figma Design System & Components',
          'Commercial Lifetime License',
          'Free Updates & Support'
        ],
        technologies: Array.isArray(item.technologies) ? item.technologies.filter(Boolean) : [
          'Next.js', 'React', 'Framer Motion', 'Tailwind CSS', 'TypeScript'
        ],
        license: String(item.license || 'Commercial License · Single End Product').trim(),

        // Marketplace Controls
        isFeatured: Boolean(item.isFeatured),
        isPopular: Boolean(item.isPopular),
        isTrending: Boolean(item.isTrending),
        displayOrder: Number(item.displayOrder) || 0,
        status: ['published', 'draft', 'archived'].includes(item.status) ? item.status : 'published',

        // Manual Engagement Metrics (Admin manual overrides or preserved dynamic counter)
        rating: item.rating !== undefined && item.rating !== null && item.rating !== '' ? Number(item.rating) : (existing.rating !== undefined ? existing.rating : 5.0),
        reviewCount: item.reviewCount !== undefined && item.reviewCount !== null && item.reviewCount !== '' ? Number(item.reviewCount) : (existing.reviewCount || 0),
        salesCount: item.salesCount !== undefined && item.salesCount !== null && item.salesCount !== '' ? Number(item.salesCount) : (existing.salesCount || 0),
        viewsCount: item.viewsCount !== undefined && item.viewsCount !== null && item.viewsCount !== '' ? Number(item.viewsCount) : (existing.viewsCount || 0),
        favoritesCount: item.favoritesCount !== undefined && item.favoritesCount !== null && item.favoritesCount !== '' ? Number(item.favoritesCount) : (existing.favoritesCount || 0),

        // SEO
        seoTitle: String(item.seoTitle || item.title).trim(),
        seoDescription: String(item.seoDescription || item.shortDescription || '').trim(),

        // Metadata
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: adminUser.email || 'Administrator',
      };

      await ref.set(designRecord, { merge: true });
      return res.status(200).json({ success: true, design: designRecord });
    }

    // ── 3. DELETE DESIGN ──
    if (action === 'delete_design') {
      const designId = body.id;
      if (!designId) return res.status(400).json({ error: 'Missing design ID' });
      await db.collection(DESIGNS_COL).doc(designId).delete();
      return res.status(200).json({ success: true });
    }

    // ── 4. CATEGORIES CRUD ──
    if (action === 'save_category') {
      const cat = body.category || {};
      if (!cat.name || !cat.slug) return res.status(400).json({ error: 'Name and slug required' });
      const id = cat.id || db.collection(CATEGORIES_COL).doc().id;
      const ref = db.collection(CATEGORIES_COL).doc(id);
      const catRecord = {
        id,
        name: cat.name.trim(),
        slug: cat.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        description: (cat.description || '').trim(),
        icon: cat.icon || 'dashboard',
        coverImageUrl: cat.coverImageUrl || '',
        displayOrder: Number(cat.displayOrder) || 0,
        isActive: cat.isActive !== false,
        createdAt: cat.createdAt || new Date().toISOString(),
      };
      await ref.set(catRecord, { merge: true });
      return res.status(200).json({ success: true, category: catRecord });
    }

    if (action === 'delete_category') {
      const catId = body.id;
      const catSlug = body.slug;
      if (!catId) return res.status(400).json({ error: 'Missing category ID' });

      // Verify no published designs actively depend on this category
      if (catSlug) {
        const inUseSnap = await db.collection(DESIGNS_COL).where('category', '==', catSlug).limit(1).get();
        if (!inUseSnap.empty) {
          return res.status(400).json({ error: 'Cannot delete: Category is actively used by existing designs. Reassign them first.' });
        }
      }
      await db.collection(CATEGORIES_COL).doc(catId).delete();
      return res.status(200).json({ success: true });
    }

    // ── 5. ORDERS & SALES ──
    if (action === 'orders_list') {
      const snap = await db.collection(ORDERS_COL).orderBy('createdAt', 'desc').limit(200).get();
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, orders });
    }

    if (action === 'update_order') {
      const orderId = body.orderId;
      const newStatus = body.status; // "Verified" | "Rejected" | "Pending Verification"
      const deliveryStatus = body.deliveryStatus;

      if (!orderId) return res.status(400).json({ error: 'Missing order ID' });
      const orderRef = db.collection(ORDERS_COL).doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' });

      const patch = { updatedAt: new Date().toISOString() };
      if (newStatus) {
        patch.status = newStatus;
        if (newStatus === 'Verified') {
          patch.verifiedAt = new Date().toISOString();
          patch.deliveryStatus = 'Delivered';
          patch.downloadToken = crypto.randomUUID();

          // Increment design sales count
          const designId = orderSnap.data().designId;
          if (designId) {
            const desRef = db.collection(DESIGNS_COL).doc(designId);
            const desDoc = await desRef.get();
            const currentSales = (desDoc.exists ? desDoc.data().salesCount : 0) || 0;
            await desRef.update({
              salesCount: currentSales + 1,
            }).catch(() => {});
          }
        }
      }
      if (deliveryStatus) patch.deliveryStatus = deliveryStatus;

      await orderRef.update(patch);
      return res.status(200).json({ success: true, order: { ...orderSnap.data(), ...patch } });
    }

    // ── 6. REVIEWS MODERATION & MANUAL REVIEW CREATION ──
    if (action === 'reviews_list') {
      const snap = await db.collection(REVIEWS_COL).orderBy('createdAt', 'desc').limit(200).get();
      const reviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, reviews });
    }

    if (action === 'add_manual_review') {
      const rev = body.review || {};
      if (!rev.designId || !rev.customerName || !rev.comment) {
        return res.status(400).json({ error: 'Design, Customer Name, and Comment are required.' });
      }
      const reviewId = rev.id || `man_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reviewRecord = {
        id: reviewId,
        designId: String(rev.designId).trim(),
        designTitle: String(rev.designTitle || 'Landing Page Design').trim(),
        customerUid: rev.customerUid || `manual_${Date.now()}`,
        customerName: String(rev.customerName).trim(),
        customerEmail: String(rev.customerEmail || '').trim(),
        rating: Math.max(1, Math.min(5, Number(rev.rating) || 5)),
        comment: String(rev.comment).trim(),
        isVerifiedPurchase: rev.isVerifiedPurchase !== false,
        status: rev.status || 'approved',
        createdAt: rev.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection(REVIEWS_COL).doc(reviewId).set(reviewRecord);

      // Recalculate average rating & review count for the design
      const allRevSnap = await db.collection(REVIEWS_COL)
        .where('designId', '==', reviewRecord.designId)
        .where('status', '==', 'approved')
        .get();
      const count = allRevSnap.size;
      let totalRating = 0;
      allRevSnap.docs.forEach(doc => { totalRating += (Number(doc.data().rating) || 5); });
      const avg = count > 0 ? Number((totalRating / count).toFixed(1)) : 5.0;

      await db.collection(DESIGNS_COL).doc(reviewRecord.designId).update({
        rating: avg,
        reviewCount: count,
      }).catch(() => {});

      return res.status(200).json({ success: true, review: reviewRecord });
    }

    if (action === 'update_review_status') {
      const reviewId = body.id;
      const status = body.status; // "approved" | "hidden" | "deleted"
      if (!reviewId) return res.status(400).json({ error: 'Missing review ID' });
      if (status === 'deleted') {
        await db.collection(REVIEWS_COL).doc(reviewId).delete();
      } else {
        await db.collection(REVIEWS_COL).doc(reviewId).update({ status, updatedAt: new Date().toISOString() });
      }
      return res.status(200).json({ success: true });
    }

    // ── 7. REAL MARKETPLACE ANALYTICS ──
    if (action === 'analytics') {
      const [designsSnap, ordersSnap, reviewsSnap] = await Promise.all([
        db.collection(DESIGNS_COL).get(),
        db.collection(ORDERS_COL).get(),
        db.collection(REVIEWS_COL).get(),
      ]);

      const designs = designsSnap.docs.map(d => d.data());
      const orders = ordersSnap.docs.map(d => d.data());
      const reviews = reviewsSnap.docs.map(d => d.data());

      const publishedCount = designs.filter(d => d.status === 'published').length;
      const draftCount = designs.filter(d => d.status === 'draft').length;

      const verifiedOrders = orders.filter(o => o.status === 'Verified');
      const grossSales = verifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const averageOrderValue = verifiedOrders.length ? Math.round(grossSales / verifiedOrders.length) : 0;

      // Unique customers
      const uniqueCustomers = new Set(orders.map(o => o.customerEmail || o.customerUid).filter(Boolean)).size;

      // Top Selling Designs
      const bestSelling = [...designs]
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 5)
        .map(d => ({ title: d.title, sales: d.salesCount || 0, price: d.price, slug: d.slug }));

      // Average rating across all approved reviews
      const approvedReviews = reviews.filter(r => r.status === 'approved');
      const avgRating = approvedReviews.length
        ? (approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / approvedReviews.length).toFixed(1)
        : '5.0';

      return res.status(200).json({
        success: true,
        analytics: {
          totalDesigns: designs.length,
          publishedCount,
          draftCount,
          totalOrders: orders.length,
          verifiedSalesCount: verifiedOrders.length,
          grossSales,
          averageOrderValue,
          uniqueCustomers,
          averageRating: avgRating,
          totalReviews: approvedReviews.length,
          bestSelling,
        },
      });
    }

    // ── 8. SETTINGS ──
    if (action === 'save_settings') {
      const settings = body.settings || {};
      const record = {
        marketplaceTitle: String(settings.marketplaceTitle || 'Explore Landing Page Designs').trim(),
        marketplaceSubtitle: String(settings.marketplaceSubtitle || 'Discover professionally crafted landing pages built with motion & clean code.').trim(),
        defaultCurrency: settings.defaultCurrency || 'BDT',
        itemsPerPage: Number(settings.itemsPerPage) || 12,
        defaultLicense: String(settings.defaultLicense || 'Commercial License · Unlimited Projects').trim(),
        allowFreeListings: Boolean(settings.allowFreeListings),
        bannerNotice: String(settings.bannerNotice || '').trim(),
        updatedAt: new Date().toISOString(),
      };
      await db.doc(SETTINGS_DOC).set(record, { merge: true });
      return res.status(200).json({ success: true, settings: record });
    }

    return res.status(400).json({ error: 'Unknown marketplace action' });
  } catch (err) {
    console.error('[marketplaceAdminHandler] Error:', err);
    const status = err.status || (err.safeCode === 'admin_sign_in_required' ? 401 : 500);
    return res.status(status).json({ error: err.message || 'Marketplace operation failed.' });
  }
}

module.exports = { marketplaceAdminHandler };

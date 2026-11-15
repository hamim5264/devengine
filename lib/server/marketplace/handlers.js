const { getServerFirebase, ADMIN_EMAIL } = require('../admin');
const { privateHeaders } = require('../calendar/security');
const crypto = require('node:crypto');

const DESIGNS_COL = 'landing_page_designs';
const CATEGORIES_COL = 'landing_page_categories';
const ORDERS_COL = 'landing_page_orders';
const REVIEWS_COL = 'landing_page_reviews';
const SETTINGS_DOC = 'landing_page_settings/main';

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

    // ── 0. FETCH ALL ADMIN DATA (FAST BUNDLE) ──
    if (action === 'fetch_all') {
      const [designsSnap, categoriesSnap, ordersSnap, reviewsSnap, settingsSnap] = await Promise.all([
        db.collection(DESIGNS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        db.collection(CATEGORIES_COL).orderBy('displayOrder', 'asc').get(),
        db.collection(ORDERS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        db.collection(REVIEWS_COL).orderBy('createdAt', 'desc').limit(200).get(),
        db.doc(SETTINGS_DOC).get(),
      ]);

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

    // ── 2. SAVE DESIGN (CREATE OR UPDATE) ──
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
        currency: item.currency || 'USD',
        isFree: Boolean(item.isFree),

        // Visual Assets
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

        // Metrics (preserve existing)
        rating: existing.rating !== undefined ? existing.rating : 5.0,
        reviewCount: existing.reviewCount || 0,
        salesCount: existing.salesCount || 0,
        viewsCount: existing.viewsCount || 0,
        favoritesCount: existing.favoritesCount || 0,

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
            await db.collection(DESIGNS_COL).doc(designId).update({
              salesCount: (orderSnap.data().salesCount || 0) + 1,
            }).catch(() => {});
          }
        }
      }
      if (deliveryStatus) patch.deliveryStatus = deliveryStatus;

      await orderRef.update(patch);
      return res.status(200).json({ success: true, order: { ...orderSnap.data(), ...patch } });
    }

    // ── 6. REVIEWS MODERATION ──
    if (action === 'reviews_list') {
      const snap = await db.collection(REVIEWS_COL).orderBy('createdAt', 'desc').limit(200).get();
      const reviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, reviews });
    }

    if (action === 'update_review_status') {
      const reviewId = body.id;
      const status = body.status; // "approved" | "hidden"
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
        defaultCurrency: settings.defaultCurrency || 'USD',
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

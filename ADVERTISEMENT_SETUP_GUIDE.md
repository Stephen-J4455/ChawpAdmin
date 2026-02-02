# Advertisement Management Setup Guide

## Quick Start

### Step 1: Verify Database

Ensure the `chawp_hero_cards` table exists in Supabase:

```sql
-- Check if table exists
SELECT * FROM chawp_hero_cards LIMIT 1;

-- If table doesn't exist, run this schema (already done in supabase/hero_cards_schema.sql)
CREATE TABLE chawp_hero_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  subtitle VARCHAR NOT NULL,
  image_url VARCHAR,
  button_text VARCHAR DEFAULT 'Learn More',
  icon VARCHAR DEFAULT 'arrow-forward',
  gradient_start VARCHAR DEFAULT '#2a2f4a',
  gradient_end VARCHAR DEFAULT '#6366f1',
  action_type VARCHAR DEFAULT 'navigate',
  action_value VARCHAR DEFAULT 'discover',
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_hero_cards_active_order ON chawp_hero_cards(is_active, order_index);
```

### Step 2: Verify Storage

Ensure `chawp-assets` bucket exists in Supabase Storage:

1. Go to Supabase Dashboard → Storage
2. Create bucket named `chawp-assets` if it doesn't exist
3. Set bucket to **Public** for image access
4. Create folder `advertisements/` (optional, for organization)

### Step 3: Verify Admin Access

Make sure the admin user has appropriate permissions:

```sql
-- Check admin user role
SELECT id, email, role FROM chawp_admin_users WHERE email = 'admin@example.com';

-- Roles should be either 'admin' or 'super_admin'
-- super_admin has additional debug access
```

### Step 4: Test Advertisement Upload

In ChawpAdmin:

1. Login with admin credentials
2. Navigate to **Adverts** tab (should appear in bottom navigation)
3. Click **+ Add** button
4. Fill in test advertisement:
   - Title: "Test Advertisement"
   - Subtitle: "Testing the advertisement system"
   - Select or upload an image
5. Click **Save Advertisement**
6. Verify advertisement appears in the list

### Step 5: Verify in Main App

In the Chawp user app:

1. Go to Home screen
2. Check if your advertisement appears in hero carousel
3. Tap advertisement to test action (navigate, WhatsApp, or URL)
4. Verify it works correctly

## Troubleshooting

### Adverts Tab Not Showing

**Issue**: Advertisement management tab not visible in ChawpAdmin

**Solution**:

- Verify ChawpAdmin `App.js` imports `AdvertisementManagementPage`
- Check that `bottomNavItems` includes `advertisements` entry
- Ensure `mountedPages` properly includes and renders advertisements page
- Rebuild app with `npm start` or `npx expo start`

### Upload Fails

**Issue**: Image upload returns error

**Solution**:

```javascript
// Check Supabase storage config in src/config/supabase.js
console.log("Storage URL:", supabase.storage.from("chawp-assets"));

// Verify bucket exists:
// 1. Supabase Dashboard → Storage
// 2. Look for 'chawp-assets' bucket
// 3. Bucket should be marked as Public

// Check file permissions
// - Bucket must allow public read
// - Upload paths should be writable
```

### Advertisements Don't Appear in App

**Issue**: Advertisements managed but don't show in Chawp app

**Solution**:

```javascript
// In Chawp/App.js, verify hero cards loading:
1. Check fetchHeroCards() is called in useEffect
2. Verify supabase.from("chawp_hero_cards") query works
3. Check fallback cards display when database empty
4. Use console.log to debug hero card state
```

### Color Format Issues

**Issue**: Custom colors not displaying correctly

**Solution**:

- Use valid hex colors: `#2E6BFF`
- Don't use shorthand: avoid `#FFF`, use `#FFFFFF`
- Don't use named colors: avoid `red`, use `#FF0000`
- Test colors in [Hex Color Picker](https://www.colorhexa.com/)

### WhatsApp Action Not Working

**Issue**: WhatsApp button doesn't open chat

**Solution**:

- Check `action_type` is exactly `whatsapp`
- Verify WhatsApp is installed on device
- Test with format: `whatsapp://send?text=Hello%20World`
- For phone number: `whatsapp://send?phone=+1234567890&text=Hello`

## Database Queries for Management

### View All Advertisements

```sql
SELECT * FROM chawp_hero_cards
ORDER BY order_index ASC, created_at DESC;
```

### View Only Active Advertisements

```sql
SELECT * FROM chawp_hero_cards
WHERE is_active = true
ORDER BY order_index ASC;
```

### Count Advertisements

```sql
SELECT COUNT(*) as total,
       COUNT(CASE WHEN is_active THEN 1 END) as active
FROM chawp_hero_cards;
```

### Update Multiple Advertisements

```sql
-- Deactivate all except first 4
UPDATE chawp_hero_cards
SET is_active = false
WHERE order_index >= 4;
```

### Delete All Inactive Advertisements

```sql
DELETE FROM chawp_hero_cards
WHERE is_active = false
AND created_at < NOW() - INTERVAL '30 days';
```

## Performance Tips

### Optimizing Image Uploads

```javascript
// Recommended image specs
- Format: JPG or PNG
- Size: 400x300 pixels (4:3 ratio)
- File Size: 50-200 KB
- Quality: 80% compression

// Example optimization (use image editor first):
1. Crop to 4:3 aspect ratio
2. Resize to max 400 pixels width
3. Export as JPG with 80% quality
4. Result: ~100 KB file
```

### Database Query Optimization

```sql
-- Add this index for faster queries
CREATE INDEX idx_hero_cards_order
ON chawp_hero_cards(is_active DESC, order_index ASC);

-- Monitor query performance
EXPLAIN ANALYZE
SELECT * FROM chawp_hero_cards
WHERE is_active = true
ORDER BY order_index;
```

### Caching Strategy

```javascript
// Adverts are fetched on app startup
// To refresh: pull down to refresh or restart app

// Caching behavior:
- Images cached by device (browser cache)
- CDN may cache for 1-24 hours
- To force refresh: change image URL or clear cache
```

## Example Advertisement Configurations

### Example 1: Food Ordering Campaign

```json
{
  "title": "Order Your Favorite Food",
  "subtitle": "Fresh & delicious meals delivered to your door",
  "button_text": "Browse Menu",
  "icon": "restaurant",
  "gradient_start": "#2a2f4a",
  "gradient_end": "#6366f1",
  "action_type": "navigate",
  "action_value": "discover",
  "order_index": 0,
  "is_active": true
}
```

### Example 2: Vendor Signup

```json
{
  "title": "Become a Vendor",
  "subtitle": "Join thousands of vendors earning daily",
  "button_text": "Register Now",
  "icon": "storefront",
  "gradient_start": "#374151",
  "gradient_end": "#10b981",
  "action_type": "whatsapp",
  "action_value": "Hi! I want to become a vendor on Chawp.",
  "order_index": 2,
  "is_active": true
}
```

### Example 3: External Link

```json
{
  "title": "Check Our Website",
  "subtitle": "Learn more about our service",
  "button_text": "Visit",
  "icon": "globe",
  "gradient_start": "#1e293b",
  "gradient_end": "#f59e0b",
  "action_type": "url",
  "action_value": "https://chawp.com",
  "order_index": 3,
  "is_active": true
}
```

## Integration Checklist

- [ ] Database table `chawp_hero_cards` exists
- [ ] Supabase storage bucket `chawp-assets` exists and is public
- [ ] Admin user has correct role
- [ ] `AdvertisementManagementPage.js` created
- [ ] API functions added to `adminApi.js`
- [ ] App.js imports and renders `AdvertisementManagementPage`
- [ ] Navigation item added to `bottomNavItems`
- [ ] Test advertisement created
- [ ] Advertisement appears in main app
- [ ] Image upload works
- [ ] Actions (navigate/WhatsApp/URL) work correctly
- [ ] Documentation reviewed

## Next Steps

1. Login to ChawpAdmin
2. Navigate to Adverts tab
3. Create first test advertisement
4. Upload test image
5. Verify in Chawp app
6. Create real advertisements with proper branding
7. Test all action types
8. Monitor performance

## Support

If you encounter issues:

1. Check browser console for errors
2. Review Supabase logs for API errors
3. Verify image URLs are accessible
4. Test database queries directly in Supabase SQL editor
5. Check app logs for missing imports or crashes

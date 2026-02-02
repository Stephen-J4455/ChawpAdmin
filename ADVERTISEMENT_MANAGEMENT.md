# Advertisement Management System - ChawpAdmin

## Overview

The Advertisement Management System allows administrators to create, edit, delete, and manage advertisements (hero cards) that appear throughout the Chawp application. This feature enables dynamic content management without requiring code changes.

## Features

### 1. **Advertisement CRUD Operations**

- **Create**: Add new advertisements with custom title, subtitle, button text, and action
- **Read**: View all advertisements in a list with key details
- **Update**: Edit existing advertisements including image and metadata
- **Delete**: Remove advertisements with confirmation

### 2. **Image Upload**

- Upload custom images for each advertisement (4:3 aspect ratio recommended)
- Images stored in Supabase Storage under `chawp-assets/advertisements/`
- Automatic file naming with timestamps for uniqueness

### 3. **Advanced Customization**

- **Gradient Colors**: Set custom gradient start and end colors for card backgrounds
- **Action Types**: Choose between Navigate, WhatsApp, or External URL
- **Order Management**: Set display order via `order_index` field
- **Status Control**: Activate/deactivate advertisements without deletion
- **Custom Icons**: Assign Ionicon names for card display

### 4. **Action Types**

#### Navigate

- Directs users to specific app screens
- Supported values: `discover`, `orders`, `home`, `profile`, etc.
- Used for in-app navigation

#### WhatsApp

- Opens WhatsApp with predefined message
- Perfect for customer support or business inquiries
- Message text customizable in `action_value`

#### External URL

- Opens external links in device browser
- Full URL required (e.g., `https://example.com`)
- Useful for promotions, partnerships, etc.

## Database Schema

### chawp_hero_cards Table

```sql
Column Name        | Type      | Description
------------------|-----------|------------------------------------------
id                 | UUID      | Primary key
title              | VARCHAR   | Advertisement title
subtitle           | VARCHAR   | Brief description
image_url          | VARCHAR   | URL to advertisement image
button_text        | VARCHAR   | CTA button label (default: "Learn More")
icon               | VARCHAR   | Ionicon name (default: "arrow-forward")
gradient_start     | VARCHAR   | Hex color for gradient start
gradient_end       | VARCHAR   | Hex color for gradient end
action_type        | VARCHAR   | Action type: navigate/whatsapp/url
action_value       | VARCHAR   | Navigate route, WhatsApp msg, or URL
order_index        | INT       | Display order (ascending)
is_active          | BOOLEAN   | Advertisement visibility flag
created_at         | TIMESTAMP | Creation timestamp
updated_at         | TIMESTAMP | Last update timestamp
```

## Integration Points

### Admin API Functions

Located in `src/services/adminApi.js`:

```javascript
// Fetch all advertisements
await fetchAdverts();

// Create new advertisement
await createAdvert(advertData);

// Update existing advertisement
await updateAdvert(advertId, advertData);

// Delete advertisement
await deleteAdvert(advertId);

// Upload image to storage
await uploadAdvertImage(imageAsset);
```

### Pages Displaying Advertisements

1. **Chawp/App.js** - Home page hero cards carousel
2. **Chawp/DiscoveryPage.js** - Discovery page hero cards
3. Fallback cards shown when database is empty

## Usage Guide

### Creating an Advertisement

1. Navigate to **Adverts** tab in ChawpAdmin
2. Click **+ Add** button
3. Fill in the form:
   - **Title**: Main headline (required)
   - **Subtitle**: Description text (required)
   - **Button Text**: CTA label (default: "Learn More")
   - **Icon**: Ionicon name (e.g., "star", "gift", "restaurant")
   - **Colors**: Set gradient start and end colors
   - **Action Type**: Choose navigate, WhatsApp, or URL
   - **Action Value**: Specific destination or message
   - **Order Index**: Display sequence (0 = first)
   - **Active**: Toggle to show/hide
4. Click **Pick Image** to upload advertisement image
5. Click **Save Advertisement**

### Editing an Advertisement

1. Find advertisement in the list
2. Click **Edit** (pencil icon)
3. Modify fields as needed
4. Update image if necessary
5. Click **Save Advertisement**

### Deleting an Advertisement

1. Find advertisement in the list
2. Click **Delete** (trash icon)
3. Confirm deletion in popup
4. Advertisement removed immediately

### Best Practices

1. **Image Dimensions**: Use 4:3 aspect ratio images (e.g., 400x300)
2. **File Size**: Keep images under 500KB for optimal performance
3. **Order Index**: Use 0, 1, 2, 3 for main hero cards in sequence
4. **Colors**: Use Web-safe or Hex colors (e.g., #2E6BFF)
5. **WhatsApp Messages**: Keep messages concise and clear
6. **Active Flag**: Deactivate instead of deleting to preserve analytics
7. **Testing**: Test action links before publishing

## Gradient Color Presets

### Recommended Color Combinations

```
Food Ordering:
Start: #2a2f4a (dark slate)
End: #6366f1 (indigo)

Fast Delivery:
Start: #1e293b (charcoal)
End: #0ea5e9 (cyan)

Business Advertising:
Start: #1f2937 (gray)
End: #f59e0b (amber)

Vendor Registration:
Start: #374151 (dark gray)
End: #10b981 (green)
```

## Icon Reference

Common Ionicon names for hero cards:

- `arrow-forward` - Call to action
- `star` - Featured/Premium
- `gift` - Special offers
- `restaurant` - Food-related
- `bicycle` - Delivery
- `storefront` - Shop/Vendor
- `card` - Payment
- `notification` - Announcements
- `flash` - Quick/Fast
- `heart` - Favorites
- `people` - Community
- `settings` - Configuration

For more icons, visit [Ionicons](https://ionic.io/ionicons)

## Storage Configuration

### Supabase Storage Bucket

- **Bucket Name**: `chawp-assets`
- **Path**: `advertisements/`
- **Access**: Public (images accessible via URL)
- **Upload Limit**: Check Supabase plan

### Image URL Format

```
https://[supabase-url]/storage/v1/object/public/chawp-assets/advertisements/[filename]
```

## Troubleshooting

### Images Not Loading

- Check if image URL is publicly accessible
- Verify Supabase Storage bucket permissions
- Ensure file exists in storage

### Changes Not Appearing

- Refresh app or clear cache
- Check if advertisement is marked as active
- Verify database query in Chawp app

### Upload Failures

- Check file size (keep under 5MB)
- Ensure image format is JPG, PNG, or WebP
- Verify Supabase API key permissions
- Check network connectivity

## Performance Considerations

1. **Image Optimization**: Compress images before upload
2. **Loading**: App fetches advertisements on startup
3. **Caching**: Images cached by device/CDN
4. **Limit**: Keep active advertisements under 20 for optimal carousel performance
5. **Database**: Queries ordered by `order_index` for consistency

## Security Notes

- Only administrators can manage advertisements
- Images uploaded to public storage but require valid URL
- Action values for URLs validated on display
- WhatsApp messages sanitized to prevent injection

## Future Enhancements

- [ ] Analytics tracking for advertisement clicks
- [ ] A/B testing support (multiple variants)
- [ ] Scheduled advertisements (start/end dates)
- [ ] Target audience/region filtering
- [ ] Campaign performance dashboard
- [ ] Video advertisement support
- [ ] Deep linking with app routing
- [ ] Bulk import/export of advertisements

## Related Files

- Admin Component: `ChawpAdmin/src/pages/AdvertisementManagementPage.js`
- API Functions: `ChawpAdmin/src/services/adminApi.js`
- App Display: `Chawp/App.js` (Hero Cards Section)
- Discovery Page: `Chawp/DiscoveryPage.js`
- Database Schema: `supabase/hero_cards_schema.sql`

## Support

For issues or questions:

1. Check this documentation
2. Review error logs in NotificationContext
3. Verify Supabase configuration in `src/config/supabase.js`
4. Test with fallback cards in main app

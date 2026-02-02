# Advertisement Management API Reference

## Overview

The Advertisement Management API provides functions to perform CRUD operations on advertisements stored in the Supabase database and uploaded to cloud storage.

## Location

All functions are defined in: `ChawpAdmin/src/services/adminApi.js`

## Functions

### 1. fetchAdverts()

Retrieves all advertisements from the database, ordered by display index.

**Signature:**

```javascript
fetchAdverts(): Promise<Array<Advertisement>>
```

**Returns:**

- `Array<Advertisement>` - List of advertisement objects

**Example:**

```javascript
const adverts = await fetchAdverts();
// Returns:
// [
//   {
//     id: "uuid-1",
//     title: "Order Food",
//     subtitle: "Fast delivery",
//     image_url: "https://...",
//     ...
//   },
//   ...
// ]
```

**Error Handling:**

```javascript
try {
  const adverts = await fetchAdverts();
} catch (error) {
  console.error("Error fetching advertisements:", error);
  // Handle error - show user notification
}
```

**Database Query:**

```sql
SELECT * FROM chawp_hero_cards
ORDER BY order_index ASC
```

---

### 2. createAdvert(advertData)

Creates a new advertisement in the database.

**Signature:**

```javascript
createAdvert(advertData: AdvertisementData): Promise<Advertisement>
```

**Parameters:**

```javascript
advertData: {
  title: string(required); // Advertisement title
  subtitle: string(required); // Brief description
  image_url: string(optional); // URL to uploaded image
  button_text: string; // CTA button label (default: "Learn More")
  icon: string; // Ionicon name (default: "arrow-forward")
  gradient_start: string; // Hex color (default: "#2a2f4a")
  gradient_end: string; // Hex color (default: "#6366f1")
  action_type: string; // "navigate" | "whatsapp" | "url"
  action_value: string; // Route, message, or URL
  order_index: number; // Display order (0 = first)
  is_active: boolean; // Visibility flag (default: true)
}
```

**Returns:**

- `Advertisement` - Created advertisement object with ID

**Example:**

```javascript
const newAdvert = await createAdvert({
  title: "Special Offer",
  subtitle: "Get 50% off your first order",
  image_url: "https://...",
  button_text: "Order Now",
  icon: "gift",
  gradient_start: "#FF6B6B",
  gradient_end: "#FFE66D",
  action_type: "navigate",
  action_value: "discover",
  order_index: 0,
  is_active: true,
});

console.log(newAdvert.id); // UUID of created advertisement
```

**Validation:**

- `title` and `subtitle` are required (checked in UI)
- `image_url` optional (can be empty)
- `order_index` converted to integer
- Colors should be valid hex format (handled by UI color picker)

**Error Handling:**

```javascript
try {
  await createAdvert(advertData);
} catch (error) {
  if (error.message.includes("duplicate")) {
    // Handle duplicate error
  } else {
    // Handle other database errors
  }
}
```

**Database Query:**

```sql
INSERT INTO chawp_hero_cards (
  title, subtitle, image_url, button_text, icon,
  gradient_start, gradient_end, action_type, action_value,
  order_index, is_active
) VALUES (...)
RETURNING *
```

---

### 3. updateAdvert(advertId, advertData)

Updates an existing advertisement in the database.

**Signature:**

```javascript
updateAdvert(
  advertId: string (UUID),
  advertData: Partial<AdvertisementData>
): Promise<Advertisement>
```

**Parameters:**

```javascript
advertId: string              // UUID of advertisement to update
advertData: {
  // Any fields to update (all optional)
  title?: string
  subtitle?: string
  image_url?: string
  button_text?: string
  icon?: string
  gradient_start?: string
  gradient_end?: string
  action_type?: string
  action_value?: string
  order_index?: number
  is_active?: boolean
}
```

**Returns:**

- `Advertisement` - Updated advertisement object

**Example:**

```javascript
// Update specific fields
const updated = await updateAdvert("uuid-123", {
  title: "Updated Title",
  is_active: false, // Deactivate without deleting
});

// Update image only
const updatedImage = await updateAdvert("uuid-123", {
  image_url: "https://new-image-url.jpg",
});

// Update action
const updatedAction = await updateAdvert("uuid-123", {
  action_type: "whatsapp",
  action_value: "Hi, I'm interested in your offer",
});
```

**Partial Updates:**

- Only provided fields are updated
- Other fields remain unchanged
- `updated_at` timestamp automatically updated

**Error Handling:**

```javascript
try {
  const updated = await updateAdvert(advertId, { is_active: false });
} catch (error) {
  if (error.message.includes("not found")) {
    console.error("Advertisement not found");
  } else {
    console.error("Update failed:", error);
  }
}
```

**Database Query:**

```sql
UPDATE chawp_hero_cards
SET title = ?, subtitle = ?, ...
WHERE id = ?
RETURNING *
```

---

### 4. deleteAdvert(advertId)

Deletes an advertisement from the database.

**Signature:**

```javascript
deleteAdvert(advertId: string (UUID)): Promise<boolean>
```

**Parameters:**

```javascript
advertId: string; // UUID of advertisement to delete
```

**Returns:**

- `true` - Deletion successful
- Throws error if failed

**Example:**

```javascript
try {
  const success = await deleteAdvert("uuid-123");
  if (success) {
    console.log("Advertisement deleted");
  }
} catch (error) {
  console.error("Failed to delete:", error.message);
}
```

**Confirmation:**

- UI should show confirmation dialog before calling
- After deletion, refresh advertisement list
- Cannot undo delete operation

**Database Query:**

```sql
DELETE FROM chawp_hero_cards
WHERE id = ?
```

---

### 5. uploadAdvertImage(imageAsset)

Uploads an image to Supabase Storage and returns public URL.

**Signature:**

```javascript
uploadAdvertImage(imageAsset: ImageAsset): Promise<string>
```

**Parameters:**

```javascript
imageAsset: {
  uri: string     // Local file path (from ImagePicker)
  // Optional:
  width?: number
  height?: number
  type?: string   // "image" etc.
}
```

**Returns:**

- `string` - Public URL of uploaded image

**Example:**

```javascript
// From expo-image-picker
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
});

if (!result.canceled) {
  const imageUrl = await uploadAdvertImage(result.assets[0]);
  console.log("Uploaded to:", imageUrl);
  // Use imageUrl in advertisement data
}
```

**Upload Process:**

1. Converts image URI to blob
2. Generates unique filename with timestamp
3. Uploads to `chawp-assets/advertisements/` folder
4. Returns public URL for database storage

**URL Format:**

```
https://[project-id].supabase.co/storage/v1/object/public/chawp-assets/advertisements/advert-[timestamp].[ext]
```

**File Naming:**

```javascript
// Pattern: advert-[timestamp].[extension]
Examples:
- advert-1704067200000.jpg
- advert-1704067201000.png
```

**Configuration:**

- Cache control: 1 hour (3600 seconds)
- Bucket: `chawp-assets`
- Path: `advertisements/`
- Access: Public

**Error Handling:**

```javascript
try {
  const url = await uploadAdvertImage(imageAsset);
} catch (error) {
  if (error.message.includes("blob")) {
    console.error("Failed to process image");
  } else if (error.message.includes("upload")) {
    console.error("Upload failed - check network");
  } else {
    console.error("Storage error:", error.message);
  }
}
```

**Supported Formats:**

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif) - if storage allows

**Size Limits:**

- File size: Check Supabase plan limits
- Recommended: Under 500 KB
- Maximum: Typically 5-100 MB per plan

---

## Complete Workflow Example

### Creating Advertisement with Image

```javascript
import { createAdvert, uploadAdvertImage } from "../services/adminApi";
import * as ImagePicker from "expo-image-picker";

async function createAdvertisementWithImage() {
  try {
    // Step 1: Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) return;

    // Step 2: Upload image to storage
    const imageUrl = await uploadAdvertImage(result.assets[0]);
    console.log("Image uploaded:", imageUrl);

    // Step 3: Create advertisement record
    const advert = await createAdvert({
      title: "Amazing Offer",
      subtitle: "Limited time only - don't miss out!",
      image_url: imageUrl, // URL from storage
      button_text: "Shop Now",
      icon: "star",
      gradient_start: "#FF6B6B",
      gradient_end: "#FFE66D",
      action_type: "navigate",
      action_value: "discover",
      order_index: 0,
      is_active: true,
    });

    console.log("Advertisement created:", advert.id);
    return advert;
  } catch (error) {
    console.error("Error creating advertisement:", error);
    throw error;
  }
}
```

### Editing Advertisement

```javascript
async function editAdvertisement(advertId, updates) {
  try {
    // Step 1: If new image, upload it
    let imageUrl = updates.imageAsset
      ? await uploadAdvertImage(updates.imageAsset)
      : null;

    // Step 2: Prepare update data
    const updateData = {
      title: updates.title,
      subtitle: updates.subtitle,
      is_active: updates.is_active,
      // Only include image_url if new image uploaded
      ...(imageUrl && { image_url: imageUrl }),
    };

    // Step 3: Update in database
    const updated = await updateAdvert(advertId, updateData);
    console.log("Advertisement updated:", updated.id);
    return updated;
  } catch (error) {
    console.error("Error updating advertisement:", error);
    throw error;
  }
}
```

### Delete with Confirmation

```javascript
async function deleteAdvertisementWithConfirm(advert, onConfirm) {
  return new Promise((resolve) => {
    // Show confirmation dialog
    showConfirm({
      type: "warning",
      title: "Delete Advertisement",
      message: `Are you sure you want to delete "${advert.title}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmStyle: "destructive",
      onConfirm: async () => {
        try {
          await deleteAdvert(advert.id);
          onConfirm?.();
          resolve(true);
        } catch (error) {
          console.error("Delete failed:", error);
          resolve(false);
        }
      },
    });
  });
}
```

---

## Error Codes & Messages

| Error                           | Cause                              | Solution                        |
| ------------------------------- | ---------------------------------- | ------------------------------- |
| `No image selected`             | uploadAdvertImage called with null | Pick image before uploading     |
| `Failed to process image`       | Image conversion to blob failed    | Try different image or format   |
| `Upload failed - check network` | Network error during upload        | Check connection, retry         |
| `Validation error`              | Required fields missing            | Fill title and subtitle         |
| `Database error`                | Supabase error                     | Check internet, verify database |
| `Not found`                     | Advertisement doesn't exist        | Refresh list, try again         |

---

## Pagination & Filtering

### Fetch Active Only

```javascript
// Modified fetchAdverts to filter by status
const activeAdverts = await fetchAdverts();
// Filtered in UI: adverts.filter(a => a.is_active)
```

### Sort by Order Index

```javascript
// Already sorted in database query
const adverts = await fetchAdverts();
// adverts[0] = first advertisement (order_index=0)
```

### Pagination Implementation

```javascript
// For large lists, could implement:
async function fetchAdvertsPage(page = 1, pageSize = 10) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("chawp_hero_cards")
    .select("*", { count: "exact" })
    .order("order_index")
    .range(from, to);

  return { data, totalCount: count, page, pageSize };
}
```

---

## Rate Limiting & Throttling

**Recommended Limits:**

- Image upload: 1 per 2 seconds (to avoid storage quota)
- Create/Update: 1 per 1 second
- Delete: 1 per 3 seconds (with confirmation)
- Fetch: 1 per 5 seconds (cache results)

**Implementation:**

```javascript
let lastUploadTime = 0;

async function throttledUpload(imageAsset) {
  const now = Date.now();
  if (now - lastUploadTime < 2000) {
    throw new Error("Too many upload requests");
  }
  lastUploadTime = now;
  return uploadAdvertImage(imageAsset);
}
```

---

## Testing

### Unit Tests

```javascript
// Test data
const mockAdvert = {
  title: "Test",
  subtitle: "Testing",
  image_url: "https://...",
  action_type: "navigate",
  action_value: "discover",
  order_index: 0,
  is_active: true,
};

// Test create
test("createAdvert creates record", async () => {
  const result = await createAdvert(mockAdvert);
  expect(result.id).toBeDefined();
  expect(result.title).toBe(mockAdvert.title);
});

// Test update
test("updateAdvert modifies record", async () => {
  const advert = await createAdvert(mockAdvert);
  const updated = await updateAdvert(advert.id, {
    title: "Updated",
  });
  expect(updated.title).toBe("Updated");
});

// Test delete
test("deleteAdvert removes record", async () => {
  const advert = await createAdvert(mockAdvert);
  await deleteAdvert(advert.id);
  const adverts = await fetchAdverts();
  expect(adverts.find((a) => a.id === advert.id)).toBeUndefined();
});
```

---

## Performance Tips

1. **Cache Results**: Store fetched adverts in state
2. **Lazy Load Images**: Use progressive image loading
3. **Compress Images**: Optimize before upload
4. **Batch Operations**: Use bulk update/delete for multiple
5. **Indexes**: Database queries use order_index index

---

## Related Documentation

- [Advertisement Management Guide](./ADVERTISEMENT_MANAGEMENT.md)
- [Setup Guide](./ADVERTISEMENT_SETUP_GUIDE.md)
- [Feature Summary](./ADVERTISEMENT_FEATURE_SUMMARY.md)
- Database Schema: `supabase/hero_cards_schema.sql`

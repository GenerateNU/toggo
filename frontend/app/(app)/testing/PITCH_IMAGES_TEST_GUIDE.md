# Pitch Images E2E Test Guide

This test screen allows you to test the complete pitch image workflow with presigned URLs.

## Setup

1. Make sure your backend is running with S3/LocalStack configured
2. Make sure you're logged in to the app
3. Have a valid Trip ID ready (you can create one through the app or backend)

## How to Use the Test Screen

### Step 1: Enter Trip ID

- Enter a valid trip ID where you are a member
- You can get this from your app or backend database

### Step 2: Upload Images (Max 5)

- Tap "Upload Image" to pick an image from your device
- The image will be uploaded to S3 with medium and large variants
- You'll see the uploaded image IDs listed
- You can upload up to 5 images (pitch limit)
- Each uploaded image ID will be added to the list

### Step 3: Create Pitch with Images

- Enter a title and description for your pitch
- Tap "Create Pitch" to create a new pitch with the uploaded images
- The backend will:
  - Create the pitch record with image associations
  - Return a presigned upload URL for the audio file (logged to console)
  - Return the pitch with images containing `{id, medium_url}`

### Step 4: View Pitch Details

- After creating a pitch, you'll see the pitch details
- **Images section** shows:
  - Each image with its presigned `medium_url`
  - Visual indicator if the URL is a valid HTTP URL (presigned)
  - Image thumbnail loaded from the presigned URL
- You can:
  - **Add Another Image**: Upload and add more images to the pitch (up to 5 total)
  - **Remove All Images**: Clear all images from the pitch
- Tap "Refresh Pitch Details" to reload the data and get fresh presigned URLs

### Step 5: View All Pitches

- See all pitches for the trip
- Each pitch shows its images with thumbnails
- The current pitch is highlighted
- Tap "Refresh Pitch List" to reload

## What to Look For

### ✅ Success Indicators:

1. Images upload successfully and return image IDs
2. Pitch creation returns a presigned upload URL in the console
3. Pitch response includes `images` array with:
   - `id`: The image UUID
   - `medium_url`: A presigned S3 URL (starts with `http`)
4. Image thumbnails load successfully from the presigned URLs
5. Images appear in both single pitch view and list view
6. Adding/removing images works correctly

### ❌ Potential Issues:

1. **403 Forbidden**: Check if you're a member of the trip
2. **400 Bad Request**:
   - Image ID doesn't exist
   - Duplicate image IDs
   - More than 5 images
3. **Images not loading**:
   - Check if URLs are valid (should start with `http`)
   - Check S3/LocalStack configuration
   - URLs expire after 15 minutes (refresh to get new ones)

## Testing Scenarios

1. **Basic Flow**: Upload 1 image → Create pitch → Verify image appears
2. **Multiple Images**: Upload 3 images → Create pitch → Verify all 3 appear
3. **Add Images**: Create pitch with 1 image → Add 2 more → Verify all 3 appear
4. **Remove Images**: Create pitch with images → Remove all → Verify empty
5. **Max Limit**: Try to upload 6 images → Should see error
6. **List View**: Create multiple pitches with images → Verify list shows all correctly

## API Response Structure

The backend returns images in this format:

```json
{
  "id": "pitch-uuid",
  "trip_id": "trip-uuid",
  "title": "My Pitch",
  "audio_url": "https://s3.../audio.mp3?signature=...",
  "images": [
    {
      "id": "image-uuid",
      "medium_url": "https://s3.../medium/image.jpg?signature=..."
    }
  ]
}
```

Note: Large images are fetched on-demand (not included in the default response).

## Troubleshooting

- **Type errors**: The frontend types need to be regenerated with `image_ids` and `images` fields
- **CORS errors**: Check S3/LocalStack CORS configuration
- **Images not appearing**: Check browser console for network errors
- **Presigned URLs expired**: URLs expire after 15 minutes - refresh the data to get new ones

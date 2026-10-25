# Pozhi Backend API - Complete Documentation

## 🎯 API Endpoints Overview

Base URL: `http://localhost:3000/api/v1`

---

## 📊 Pricing Endpoints (Public - No Auth Required)

### 1. Get PassPhoto Pricing
```http
GET /api/v1/pricing/passphoto
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "categories": [
      {
        "id": "passport",
        "label": "Passport Size",
        "columns": 4,
        "rows": 2,
        "aspectLabel": "35 × 45 mm",
        "packs": [
          {
            "id": "p-8",
            "label": "8 + 2 Copies",
            "copies": 10,
            "price": 120.00,
            "description": null
          }
        ]
      }
    ]
  }
}
```

### 2. Get PhotoCopies Pricing
```http
GET /api/v1/pricing/photocopies
```

### 3. Get Frames Pricing
```http
GET /api/v1/pricing/frames
```

### 4. Get Album Pricing
```http
GET /api/v1/pricing/albums
```

### 5. Get Snap'n'Print Pricing
```http
GET /api/v1/pricing/snapnprint
```

### 6. Get All Pricing (Convenience)
```http
GET /api/v1/pricing/all
```

---

## 📤 Upload Endpoints (Private - Auth Required)

### Upload Files (Smart Storage Logic)

```http
POST /api/v1/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData: {
  files: File[] // Array of files
}
```

**Smart Storage Logic:**
- Single file < 20MB → **Supabase**
- Single file ≥ 20MB → **Cloudflare R2**
- Multiple files → **Cloudflare R2**

**Response:**
```json
{
  "success": true,
  "message": "2 file(s) uploaded successfully",
  "data": {
    "uploads": [
      {
        "id": "uuid",
        "storage_provider": "cloudflare_r2",
        "storage_url": "https://...",
        "file_size_bytes": 15043200,
        "original_filename": "photo.jpg"
      }
    ],
    "storage_provider": "cloudflare_r2"
  }
}
```

### Get User Uploads
```http
GET /api/v1/upload?limit=20&offset=0
Authorization: Bearer <token>
```

### Delete Upload
```http
DELETE /api/v1/upload/:uploadId
Authorization: Bearer <token>
```

---

## 🛒 Order Endpoints (Private - Auth Required)

### Create Order

```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "service_type": "PassPhoto",
  "items": [
    {
      "passphoto_pack_id": "uuid-from-pricing",
      "quantity": 1,
      "unit_price": 120.00,
      "details": {
        "category": "passport",
        "pack": "8 + 2 Copies"
      }
    }
  ],
  "customer_name": "Varun Anss",
  "customer_phone": "+91 9876543210",
  "delivery_address": "123 Main St, City",
  "event_date": null,
  "gift_wrap": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order_id": "uuid",
    "order_number": "POZHI-20260209-A3F9B2",
    "total_amount": 150.00,
    "payment_status": "pending",
    "order_status": "pending"
  }
}
```

### Get User Orders
```http
GET /api/v1/orders?limit=20&offset=0&status=pending
Authorization: Bearer <token>
```

### Get Order By ID
```http
GET /api/v1/orders/:id
Authorization: Bearer <token>
```

**Response includes order items:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "POZHI-20260209-A3F9B2",
    "service_type": "PassPhoto",
    "total_amount": 150.00,
    "gift_wrap": true,
    "gift_wrap_charge": 30.00,
    "customer_name": "Varun Anss",
    "customer_phone": "+91 9876543210",
    "order_status": "pending",
    "payment_status": "pending",
    "created_at": "2026-02-09T17:30:00Z",
    "items": [...]
  }
}
```

### Cancel Order
```http
PATCH /api/v1/orders/:id/cancel
Authorization: Bearer <token>
```

### Update Order Status (Admin Only)
```http
PATCH /api/v1/orders/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "order_status": "confirmed",
  "payment_status": "completed"
}
```

**Valid Order Statuses:**
- `pending`, `confirmed`, `processing`, `ready`, `delivered`, `cancelled`

**Valid Payment Statuses:**
- `pending`, `processing`, `completed`, `failed`, `refunded`

---

## 🔐 Authentication

All private endpoints require a Bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get token from:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/signup`

---

## 🏷️ Service Types

When creating orders, use these service types:

- `PassPhoto`
- `PhotoCopies`
- `Frames`
- `Album`
- `SnapnPrint`

---

## 📋 Order Items Structure

Depending on service type, include the appropriate ID:

### PassPhoto Order Item
```json
{
  "passphoto_pack_id": "uuid",
  "quantity": 1,
  "unit_price": 120.00,
  "details": { "category": "passport", "pack": "8 + 2" }
}
```

### PhotoCopies Order Item
```json
{
  "photocopies_single_id": "uuid",  // or photocopies_set_id
  "quantity": 5,
  "unit_price": 99.00,
  "details": { "size": "6x4", "type": "set" }
}
```

### Frames Order Item
```json
{
  "frame_size_id": "uuid",
  "frame_material": "glass",
  "user_upload_id": "uuid",  // The uploaded photo
  "quantity": 1,
  "unit_price": 449.00,
  "details": { "size": "8x12", "material": "glass" }
}
```

### Album Order Item
```json
{
  "album_capacity_id": "uuid",
  "quantity": 1,
  "unit_price": 1999.00,
  "details": { "capacity": 60, "cover_type": "custom" }
}
```

### Snap'n'Print Order Item (Booking)
```json
{
  "snapnprint_package_id": "uuid",
  "quantity": 1,
  "unit_price": 549.00,
  "details": { "category": "family", "package": "8 Copies" }
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "statusCode": 400
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

---

## 🔄 Rate Limits

- **Upload:** 20 uploads per hour per user
- **Create Order:** 5 orders per hour per user
- **View Orders:** 50 requests per 15 minutes

---

## 🧪 Testing with cURL

### Test Pricing Endpoint
```bash
curl http://localhost:3000/api/v1/pricing/passphoto
```

### Test Upload (with auth)
```bash
curl -X POST http://localhost:3000/api/v1/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg"
```

### Test Create Order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "PassPhoto",
    "items": [{"passphoto_pack_id": "uuid", "quantity": 1, "unit_price": 120}],
    "customer_name": "Test User",
    "customer_phone": "+91 9876543210",
    "gift_wrap": false
  }'
```

---

## 📚 Database Schema Reference

All API endpoints interact with these tables:

**Pricing Tables:**
- `passphoto_categories`, `passphoto_packs`
- `photocopies_single`, `photocopies_set`
- `frame_materials`, `frame_sizes`
- `album_capacities`
- `snapnprint_categories`, `snapnprint_packages`

**User & Orders:**
- `profiles`
- `user_uploads`
- `orders`
- `order_items`
- `storage_metrics`

**System:**
- `settings`
- `audit_logs`

---

## 🚀 Quick Start for Frontend

```typescript
import { fetchPassPhotoPricing, createOrder } from '@/services/api';

// Fetch pricing
const categories = await fetchPassPhotoPricing();

// Create order
const order = await createOrder({
  service_type: 'PassPhoto',
  items: [...],
  customer_name: 'John Doe',
  customer_phone: '+91 9876543210',
  gift_wrap: true
});
```

API service layer is already created at: `frontend/src/services/api.ts`

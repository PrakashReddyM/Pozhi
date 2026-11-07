// ==========================================
// API SERVICE - Fetch pricing from backend
// ==========================================

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Smart fix: Ensure the URL ends with /api/v1 for production connectivity
const API_BASE_URL = BACKEND_URL.endsWith('/api/v1') 
    ? BACKEND_URL 
    : `${BACKEND_URL}/api/v1`;

// ==========================================
// PRICING API
// ==========================================

export interface PassPhotoCategory {
    id: string;
    label: string;
    columns: number;
    rows: number;
    aspectLabel: string;
    packs: PassPhotoPack[];
}

export interface PassPhotoPack {
    id: string;
    label: string;
    copies: number;
    price: number;
    description?: string;
}

export interface PhotoCopySingle {
    id: string;
    sizeLabel: string;
    sizeKey: string;
    copies: string;
    price: number;
    aspectRatio: string;
}

export interface PhotoCopySet {
    id: string;
    sizeLabel: string;
    sizeKey: string;
    pricePerPiece: number;
    aspectRatio: string;
    copiesPerUnit: number;
}

export interface FrameMaterial {
    id: string;
    label: string;
    description: string;
}

export interface FrameSize {
    id: string;
    sizeLabel: string;
    dimensions: string;
    price: number;
    aspectRatio: string;
    orientation: 'portrait' | 'landscape';
}

export interface AlbumCapacity {
    id: string;
    label: string;
    images: number;
    price: number;
}

export interface SnapnPrintCategory {
    id: string;
    label: string;
    description?: string;
    packages: SnapnPrintPackage[];
}

export interface SnapnPrintPackage {
    id: string;
    label: string;
    price: number;
}

// ==========================================
// API UTILITIES (Cache & Retry)
// ==========================================

// Simple in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with retry and caching logic
 */
async function fetchWithCache<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 2
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
        const cached = apiCache.get(url);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data as T;
        }
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            // If server error or rate limit, throw to trigger retry
            if (response.status >= 500 || response.status === 429) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            // For client errors (4xx), don't retry, just throw
            throw new Error(`Client error: ${response.status}`);
        }

        const json = await response.json();

        // Cache successful GET responses
        if (!options.method || options.method === 'GET') {
            apiCache.set(url, { data: json.data, timestamp: Date.now() });
        }

        return json.data as T; // Assuming unified response structure { status: 'success', data: ... }

    } catch (error) {
        if (retries > 0) {
            // Exponential backoff: 500ms, 1000ms
            const delay = 500 * (3 - retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithCache<T>(endpoint, options, retries - 1);
        }
        throw error;
    }
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Fetch PassPhoto pricing (categories and packs)
 */
export async function fetchPassPhotoPricing(): Promise<PassPhotoCategory[]> {
    const data = await fetchWithCache<{ categories: PassPhotoCategory[] }>('/pricing/passphoto');
    return data.categories;
}

/**
 * Fetch PhotoCopies pricing (single and set options)
 */
export async function fetchPhotoCopiesPricing(): Promise<{
    single: PhotoCopySingle[];
    set: PhotoCopySet[];
}> {
    return await fetchWithCache<{ single: PhotoCopySingle[]; set: PhotoCopySet[] }>('/pricing/photocopies');
}

/**
 * Fetch Frames pricing (materials and sizes)
 */
export async function fetchFramesPricing(): Promise<{
    materials: FrameMaterial[];
    sizes: FrameSize[];
}> {
    return await fetchWithCache<{ materials: FrameMaterial[]; sizes: FrameSize[] }>('/pricing/frames');
}

/**
 * Fetch Album pricing (capacities)
 */
export async function fetchAlbumPricing(): Promise<AlbumCapacity[]> {
    const data = await fetchWithCache<{ capacities: AlbumCapacity[] }>('/pricing/albums');
    return data.capacities;
}

/**
 * Fetch Snap'n'Print pricing (categories and packages)
 */
export async function fetchSnapnPrintPricing(): Promise<SnapnPrintCategory[]> {
    const data = await fetchWithCache<{ categories: SnapnPrintCategory[] }>('/pricing/snapnprint');
    return data.categories;
}

/**
 * Fetch ALL pricing at once (convenience method for caching)
 */
export async function fetchAllPricing(): Promise<{
    passphoto: PassPhotoCategory[];
    photocopies: { single: PhotoCopySingle[]; set: PhotoCopySet[] };
    frames: { materials: FrameMaterial[]; sizes: FrameSize[] };
    albums: AlbumCapacity[];
    snapnprint: SnapnPrintCategory[];
}> {
    return await fetchWithCache<any>('/pricing/all');
}

/**
 * Update pricing for a specific product variant
 */
export async function updatePricing(type: string, id: string, price: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/pricing/update`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
        },
        body: JSON.stringify({ type, id, price })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update price');
    }
}

// ==========================================
// UPLOAD API
// ==========================================

export async function uploadFiles(files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            // Authorization header
            ...authHeaders()
        }
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(json?.message || `Failed to upload files (${response.status})`);
    }

    return json;
}

// ==========================================
// CHUNKED UPLOAD (H2 — large multi-image batches)
// ==========================================

export interface ChunkedUploadProgress {
    filesDone: number;
    filesTotal: number;
    /** 0-100 overall across all chunks. */
    percent: number;
}

interface UploadedFile {
    id: string;
    storage_url: string;
    original_filename: string;
}

// Multer is capped at 10 files per request (backend/src/api/upload/upload.routes.ts),
// so batches larger than that are split into sequential requests here.
const UPLOAD_CHUNK_SIZE = 10;

export async function uploadFilesChunked(
    files: File[],
    onProgress?: (p: ChunkedUploadProgress) => void
): Promise<UploadedFile[]> {
    const chunks: File[][] = [];
    for (let i = 0; i < files.length; i += UPLOAD_CHUNK_SIZE) {
        chunks.push(files.slice(i, i + UPLOAD_CHUNK_SIZE));
    }

    const allUploads: UploadedFile[] = [];
    let filesDone = 0;

    for (const chunk of chunks) {
        const uploads = await uploadChunkXhr(chunk, (chunkPercent) => {
            const chunkWeight = chunk.length / files.length;
            const percent = Math.round(((filesDone / files.length) + (chunkPercent / 100) * chunkWeight) * 100);
            onProgress?.({ filesDone, filesTotal: files.length, percent });
        });
        allUploads.push(...uploads);
        filesDone += chunk.length;
        onProgress?.({ filesDone, filesTotal: files.length, percent: Math.round((filesDone / files.length) * 100) });
    }

    return allUploads;
}

// XMLHttpRequest instead of fetch — fetch can't reliably report upload
// progress across browsers (no broad ReadableStream request-body support).
function uploadChunkXhr(files: File[], onChunkPercent: (pct: number) => void): Promise<UploadedFile[]> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/upload`);
        Object.entries(authHeaders()).forEach(([key, value]) => xhr.setRequestHeader(key, value));

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onChunkPercent((e.loaded / e.total) * 100);
        };

        xhr.onload = () => {
            let json: { success?: boolean; message?: string; data?: { uploads?: UploadedFile[] } } | null = null;
            try { json = JSON.parse(xhr.responseText); } catch { /* ignore */ }
            if (xhr.status >= 200 && xhr.status < 300 && json?.success) {
                resolve(json.data?.uploads || []);
            } else {
                reject(new Error(json?.message || `Failed to upload files (${xhr.status})`));
            }
        };
        xhr.onerror = () => reject(new Error('Network error while uploading'));
        xhr.send(formData);
    });
}

// ==========================================
// ORDERS API
// ==========================================

export interface Order {
    id: string;
    order_number: string;
    service_type: string;
    total_amount: number;
    payment_status: string;
    order_status: string;
    created_at: string;
    order_items?: {
        id: string;
        item_details: any;
        user_upload_id?: string;
        user_uploads?: {
            storage_url: string;
            original_filename: string;
        };
    }[];
}

export interface AdminStats {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    lifetime: number;
    customRange: {
        total: number;
        orderCount: number;
        active: boolean;
    };
    recentOrders: {
        id: string;
        service: string;
        amount: number;
        createdAt: string;
    }[];
}

export async function createOrder(orderData: any) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify(orderData)
    });

    if (!response.ok) {
        let errMsg = 'Failed to create order';
        try {
            const error = await response.json();
            errMsg = error.message || error.error || errMsg;
        } catch (e) {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    return await response.json();
}

export async function fetchUserOrders(): Promise<Order[]> {
    const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: authHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch orders');
    }

    const data = await response.json();
    return data.data; // Backend returns { success: true, data: [...] }
}

export async function fetchAllOrders(): Promise<Order[]> {
    const response = await fetch(`${API_BASE_URL}/orders/admin/all`, {
        headers: authHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch admin orders');
    }

    const data = await response.json();
    return data.data;
}

export async function submitOrderFeedback(orderNumber: string, rating: number, comment: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderNumber}/feedback`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment })
    });

    if (!response.ok) {
        throw new Error('Failed to submit feedback');
    }

    return await response.json();
}

export async function fetchAdminStats(from?: string, to?: string): Promise<AdminStats> {
    const url = new URL(`${API_BASE_URL}/orders/admin/stats`);
    if (from) url.searchParams.append('startDate', from);
    if (to) url.searchParams.append('endDate', to);

    const response = await fetch(url.toString(), {
        headers: authHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
    }

    const data = await response.json();
    return data.data;
}

export async function fetchOrderById(orderId: string): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: authHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to fetch order details');
    }

    const data = await response.json();
    return data.data;
}

export async function fetchOrderByNumber(orderNumber: string): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/track/${encodeURIComponent(orderNumber)}`, {
        headers: authHeaders()
    });

    if (!response.ok) {
        throw new Error('Order not found');
    }

    const data = await response.json();
    return data.data;
}

/**
 * Fetch all booked slots for Snap n' Print
 */
export async function fetchBookedSlots(month?: number, year?: number): Promise<Record<string, string[]>> {
    const url = new URL(`${API_BASE_URL}/orders/booked-slots`);
    if (month) url.searchParams.append('month', month.toString());
    if (year) url.searchParams.append('year', year.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to fetch booked slots');
    }

    const data = await response.json();
    return data.data;
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
        },
        body: JSON.stringify({ order_status: status })
    });

    if (!response.ok) {
        throw new Error('Failed to update order status');
    }
}

// ==========================================
// AUTH HELPERS
// ==========================================

function getStoredToken(): string | null {
    return localStorage.getItem('access_token');
}

function authHeaders(): Record<string, string> {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ==========================================
// AUTH API
// ==========================================

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone?: string;
    avatar_url?: string;
}

export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

export interface LoginResponse {
    user: AuthUser;
    session: AuthSession;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Login failed');
    return json.data;
}

export async function loginWithGoogle(redirectTo?: string): Promise<{ url: string }> {
    const url = new URL(`${API_BASE_URL}/auth/google`);
    if (redirectTo) url.searchParams.append('redirectTo', redirectTo);
    url.searchParams.append('t', Date.now().toString());

    const response = await fetch(url.toString());
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Google login failed');
    return json.data;
}

export async function exchangeCodeForGoogleSession(code: string, redirectUri?: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/google/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'OAuth exchange failed');
    return json.data;
}

export async function signup(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
}): Promise<{ user: { id: string; email: string; full_name: string } }> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Signup failed');
    return json.data;
}

export async function logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { ...authHeaders() },
    });
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { ...authHeaders() },
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Not authenticated');
    return json.data;
}

export async function refreshToken(refresh_token: string): Promise<{ session: AuthSession }> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Token refresh failed');
    return json.data;
}

// ==========================================
// PASSKEY API
// ==========================================

export interface PasskeyInfo {
    id: string;
    friendly_name: string;
    device_type: string;
    backed_up: boolean;
    transports: string[] | null;
    last_used_at: string | null;
    created_at: string;
}

export async function getPasskeyRegistrationOptions(friendlyName?: string) {
    const response = await fetch(`${API_BASE_URL}/auth/passkey/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ friendly_name: friendlyName }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to get registration options');
    return json.data.options;
}

export async function verifyPasskeyRegistration(credential: any) {
    const response = await fetch(`${API_BASE_URL}/auth/passkey/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ credential }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Passkey registration failed');
    return json.data;
}

export async function getPasskeyLoginOptions(email?: string) {
    const response = await fetch(`${API_BASE_URL}/auth/passkey/login/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to get login options');
    return json.data;
}

export async function verifyPasskeyLogin(challengeId: string, credential: any): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/passkey/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, credential }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Passkey login failed');
    return json.data;
}

export async function listPasskeys(): Promise<PasskeyInfo[]> {
    const response = await fetch(`${API_BASE_URL}/auth/passkey`, {
        headers: { ...authHeaders() },
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to fetch passkeys');
    return json.data.passkeys;
}

export async function deletePasskey(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/passkey/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to delete passkey');
}

// ==========================================
// PAYMENT API (Razorpay)
// ==========================================

export interface PaymentOrderResult {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
}

export async function createPaymentOrder(orderId: string): Promise<PaymentOrderResult> {
    const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ orderId }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Failed to create payment order');
    return json.data;
}

export async function verifyPayment(data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Payment verification failed');
}

// ==========================================
// GEO API
// ==========================================

export interface ReverseGeocodeResult {
    house: string;
    street: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
    formatted: string;
}

/**
 * Turn GPS coordinates into address fields for the checkout form.
 * Proxied through our backend so the geocoder's usage policy (identifying
 * User-Agent, 1 request/second) can actually be honoured.
 */
export async function reverseGeocode(
    lat: number,
    lon: number
): Promise<{ success: boolean; data: ReverseGeocodeResult }> {
    const response = await fetch(
        `${API_BASE_URL}/geo/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
        { headers: authHeaders() }
    );

    const json = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            json?.message || "Couldn't look up your location. Please type your address."
        );
    }

    return json;
}

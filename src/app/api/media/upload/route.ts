import { NextResponse } from 'next/server';
import { storageService } from '@/lib/storage/storageService';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LRUCache } from 'lru-cache';

// Simple rate limiter: max 20 uploads per minute per business
const uploadLimiter = new LRUCache<string, { count: number; reset: number }>({
  max: 5000,
  ttl: 60 * 1000, // 1 minute
});

export async function POST(req: Request) {
  // Authenticate admin user
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const businessId = (session!.user as any).businessId as string;

  // Rate limiting
  const now = Date.now();
  const entry = uploadLimiter.get(businessId) ?? { count: 0, reset: now + 60 * 1000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60 * 1000;
  }
  if (entry.count >= 20) {
    return NextResponse.json({ error: 'Rate limit exceeded: 20 uploads/min' }, { status: 429 });
  }
  entry.count++;
  uploadLimiter.set(businessId, entry);

  // Parse multipart/form-data
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const category = (form.get('category') as string) ?? 'misc';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate size (10 MB max)
  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File exceeds size limit (10 MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // storageService already validates mime type (jpeg, png, webp)
  try {
    const result = await storageService.handleUpload(buffer, businessId, category);
    // Optionally, you could store extra metadata here.
    return NextResponse.json({
      mediaId: result.id,
      url: result.url,
      mediumUrl: result.mediumUrl,
      thumbUrl: result.thumbUrl,
    });
  } catch (e: any) {
    console.error('Upload error', e);
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}

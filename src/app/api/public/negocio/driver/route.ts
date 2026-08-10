import { GET as driverGET, POST as driverPOST } from '../../[slug]/driver/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return driverGET(request, { params: Promise.resolve({ slug: 'parrilla-citiox-demo' }) });
}

export async function POST(request: Request) {
  return driverPOST(request, { params: Promise.resolve({ slug: 'parrilla-citiox-demo' }) });
}

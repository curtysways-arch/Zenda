import PublicNegocioPage, { generateMetadata as generateSlugMetadata } from '../../page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}): Promise<Metadata> {
  const { slug, productId } = await params;
  return generateSlugMetadata({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({ producto: productId })
  });
}

export default async function DirectProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  return (
    <PublicNegocioPage
      params={Promise.resolve({ slug })}
      searchParams={Promise.resolve({ producto: productId })}
    />
  );
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getCurrentSession } from '@/lib/auth/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await getCurrentSession();

    // Fetch approved reviews for this product
    const reviews = await db.review.findMany({
      where: {
        productId,
        status: 'APPROVED',
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let userEligible = false;
    let userOrderId: string | null = null;
    let userReview = null;

    if (session) {
      // Find a paid/completed order by this user that includes this product
      const paidOrder = await db.order.findFirst({
        where: {
          userId: session.userId,
          status: { in: ['PAID', 'COMPLETED'] },
          items: {
            some: {
              variant: {
                productId,
              },
            },
          },
        },
        select: { id: true },
      });

      if (paidOrder) {
        userEligible = true;
        userOrderId = paidOrder.id;

        // Check if user already submitted a review
        userReview = await db.review.findFirst({
          where: {
            productId,
            userId: session.userId,
          },
        });
      }
    }

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : '5.0';

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        avgRating: parseFloat(avgRating),
        totalReviews,
        userEligible,
        userOrderId,
        userReview,
      },
    });
  } catch (error: any) {
    console.error('GET /api/products/[id]/reviews error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Silakan login terlebih dahulu untuk memberikan ulasan.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, title, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating harus diisi 1 sampai 5 bintang.' },
        { status: 400 }
      );
    }

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Isi komentar ulasan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // Verify user has purchased this product in a paid or completed order
    const paidOrder = await db.order.findFirst({
      where: {
        userId: session.userId,
        status: { in: ['PAID', 'COMPLETED'] },
        items: {
          some: {
            variant: {
              productId,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!paidOrder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anda hanya dapat memberikan ulasan pada produk yang telah Anda beli.',
        },
        { status: 403 }
      );
    }

    // Check if an existing review exists for this user and product
    const existingReview = await db.review.findFirst({
      where: {
        productId,
        userId: session.userId,
      },
    });

    let review;
    if (existingReview) {
      review = await db.review.update({
        where: { id: existingReview.id },
        data: {
          rating: Number(rating),
          title: title || '',
          comment: comment.trim(),
          status: 'APPROVED',
        },
      });
    } else {
      review = await db.review.create({
        data: {
          productId,
          userId: session.userId,
          orderId: paidOrder.id,
          rating: Number(rating),
          title: title || '',
          comment: comment.trim(),
          status: 'APPROVED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ulasan Anda berhasil dikirim!',
      data: review,
    });
  } catch (error: any) {
    console.error('POST /api/products/[id]/reviews error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

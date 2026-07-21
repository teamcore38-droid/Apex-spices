import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Product from './Product';

const getItemsPerView = (width) => {
  if (width < 768) {
    return 1;
  }

  if (width < 1024) {
    return 2;
  }

  return 3;
};

const chunkProducts = (products, size) => {
  const pages = [];

  for (let index = 0; index < products.length; index += size) {
    pages.push(products.slice(index, index + size));
  }

  return pages;
};

const FeaturedProductCarousel = ({ products = [], revealCards = false }) => {
  const [itemsPerView, setItemsPerView] = useState(() => getItemsPerView(window.innerWidth));
  const [activePage, setActivePage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const carouselRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const suppressClickRef = useRef(false);
  const swipeRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    latestX: 0,
    isSwiping: false,
  });

  const curatedProducts = useMemo(() => products.slice(0, 8), [products]);
  const pages = useMemo(
    () => chunkProducts(curatedProducts, itemsPerView),
    [curatedProducts, itemsPerView]
  );
  const safeActivePage = pages.length > 0 ? activePage % pages.length : 0;

  useEffect(() => {
    const onResize = () => {
      setItemsPerView(getItemsPerView(window.innerWidth));
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (pages.length <= 1 || isPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActivePage((currentPage) => (currentPage + 1) % pages.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [activePage, isPaused, pages.length]);

  useEffect(
    () => () => {
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
      }
    },
    []
  );

  const pauseThenResume = (delay = 2600) => {
    setIsPaused(true);

    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = window.setTimeout(() => {
      setIsPaused(false);
    }, delay);
  };

  const pauseAutoSlide = () => {
    setIsPaused(true);

    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
    }
  };

  const goToPrev = () => {
    if (isMobileSwipeEnabled) {
      pauseThenResume();
    }

    setActivePage((currentPage) => (currentPage - 1 + pages.length) % pages.length);
  };

  const goToNext = () => {
    if (isMobileSwipeEnabled) {
      pauseThenResume();
    }

    setActivePage((currentPage) => (currentPage + 1) % pages.length);
  };

  const isMobileSwipeEnabled = itemsPerView === 1 && pages.length > 1;

  const handlePointerDown = (event) => {
    if (!isMobileSwipeEnabled || event.pointerType === 'mouse') {
      return;
    }

    pauseAutoSlide();
    setIsDragging(true);
    setDragOffset(0);
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      isSwiping: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const swipe = swipeRef.current;

    if (!isMobileSwipeEnabled || !isDragging || swipe.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY) + 8;

    if (!swipe.isSwiping && !isHorizontalGesture) {
      return;
    }

    swipe.isSwiping = true;
    swipe.latestX = event.clientX;
    setDragOffset(deltaX);
  };

  const finishPointerSwipe = (event) => {
    const swipe = swipeRef.current;

    if (!isMobileSwipeEnabled || swipe.pointerId !== event.pointerId) {
      return;
    }

    const carouselWidth = carouselRef.current?.offsetWidth || window.innerWidth;
    const deltaX = swipe.latestX - swipe.startX;
    const threshold = Math.min(90, carouselWidth * 0.18);

    if (swipe.isSwiping && Math.abs(deltaX) > 8) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    if (swipe.isSwiping && Math.abs(deltaX) > threshold) {
      setActivePage((currentPage) =>
        deltaX < 0
          ? (currentPage + 1) % pages.length
          : (currentPage - 1 + pages.length) % pages.length
      );
    }

    setIsDragging(false);
    setDragOffset(0);
    swipeRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      latestX: 0,
      isSwiping: false,
    };
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    pauseThenResume();
  };

  const onBlurCapture = (event) => {
    const relatedTarget = event.relatedTarget;

    if (carouselRef.current && relatedTarget && carouselRef.current.contains(relatedTarget)) {
      return;
    }

    setIsPaused(false);
  };

  if (pages.length === 0) {
    return null;
  }

  return (
    <div
      ref={carouselRef}
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={onBlurCapture}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div
        className="overflow-hidden rounded-[28px] md:touch-auto"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerSwipe}
        onPointerCancel={finishPointerSwipe}
        style={{ touchAction: isMobileSwipeEnabled ? 'pan-y' : 'auto' }}
      >
        <div
          className={`flex will-change-transform ${isDragging ? 'transition-none' : 'transition-transform duration-700 ease-out'}`}
          style={{
            transform: `translate3d(calc(-${safeActivePage * 100}% + ${dragOffset}px), 0, 0)`,
          }}
        >
          {pages.map((pageProducts, pageIndex) => (
            <div key={`featured-page-${pageIndex}`} className="w-full flex-shrink-0">
              <div
                className={`grid gap-6 ${
                  itemsPerView === 1
                    ? 'grid-cols-1'
                    : itemsPerView === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                }`}
              >
                {pageProducts.map((product, productIndex) => (
                  <div
                    key={product._id}
                    className="h-full"
                    {...(revealCards
                      ? {
                          'data-reveal-card': true,
                          style: { '--reveal-index': pageIndex * itemsPerView + productIndex },
                        }
                      : {})}
                  >
                    <Product product={product} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 md:flex">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous featured products"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-accent/40 bg-white/90 text-brand-dark shadow-lg transition hover:border-brand-primary hover:text-brand-primary"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next featured products"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-accent/40 bg-white/90 text-brand-dark shadow-lg transition hover:border-brand-primary hover:text-brand-primary"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2">
            {pages.map((_, index) => {
              const isCurrent = index === safeActivePage;
              return (
                <button
                  key={`featured-dot-${index}`}
                  type="button"
                  onClick={() => {
                    if (isMobileSwipeEnabled) {
                      pauseThenResume();
                    }

                    setActivePage(index);
                  }}
                  aria-label={`Go to featured slide ${index + 1} of ${pages.length}`}
                  aria-current={isCurrent ? 'true' : 'false'}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                    isCurrent
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-accent/30 bg-white text-brand-primary hover:border-brand-primary hover:text-brand-primary'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous featured products"
              className="inline-flex items-center rounded-full border border-brand-accent/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-dark transition hover:border-brand-primary hover:text-brand-primary"
            >
              <ChevronLeft size={16} className="mr-2" /> Prev
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next featured products"
              className="inline-flex items-center rounded-full border border-brand-accent/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-dark transition hover:border-brand-primary hover:text-brand-primary"
            >
              Next <ChevronRight size={16} className="ml-2" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedProductCarousel;

import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  getProductStatusBadge,
  getStockPresentation,
} from '../utils/productUi';

const preloadProductPage = () => import('../pages/ProductPage');

const Product = ({ product, compactOnMobile = false }) => {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const statusBadge = getProductStatusBadge(product);
  const stockBadge = getStockPresentation(product.countInStock);
  const showStockBadge = product.countInStock > 0;
  const handleAddToCart = (event) => {
    event.preventDefault();

    if (product.countInStock > 0) {
      addToCart(product, 1);
      navigate('/cart');
    }
  };

  return (
    <article className={`group flex h-full flex-col overflow-hidden border border-[#dce4ef] bg-white shadow-[0_20px_50px_rgba(11,31,58,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(11,31,58,0.14)] ${compactOnMobile ? 'rounded-[18px] sm:rounded-[28px]' : 'rounded-[28px]'}`}>
      <Link
        to={`/product/${product._id}`}
        className="relative block"
        onMouseEnter={preloadProductPage}
        onFocus={preloadProductPage}
        onTouchStart={preloadProductPage}
      >
        <div className={`relative overflow-hidden bg-[#ecf0f7] ${compactOnMobile ? 'h-36 sm:h-72' : 'h-72'}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071427]/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          {statusBadge && (
            <span
              className={`absolute inline-flex whitespace-nowrap rounded-full font-bold uppercase shadow-lg ${compactOnMobile ? 'left-2 top-2 px-2 py-0.5 text-[8px] leading-none tracking-[0.06em] sm:left-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[11px] sm:leading-normal sm:tracking-[0.18em]' : 'left-4 top-4 px-3 py-1 text-[11px] tracking-[0.18em]'} ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}

          {showStockBadge && (
            <span
              className={`absolute inline-flex whitespace-nowrap rounded-full border font-bold uppercase ${compactOnMobile ? 'right-2 top-2 px-2 py-0.5 text-[8px] leading-none tracking-[0.06em] sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[11px] sm:leading-normal sm:tracking-[0.18em]' : 'right-4 top-4 px-3 py-1 text-[11px] tracking-[0.18em]'} ${stockBadge.className}`}
            >
              {stockBadge.label}
            </span>
          )}
        </div>
      </Link>

      <div className={`flex flex-1 flex-col ${compactOnMobile ? 'p-3 sm:p-5' : 'p-5'}`}>
        <span className={`font-bold uppercase text-[#a07c16] ${compactOnMobile ? 'truncate text-[9px] tracking-[0.14em] sm:text-[11px] sm:tracking-[0.28em]' : 'text-[11px] tracking-[0.28em]'}`}>
          {product.category}
        </span>

        {product.weight && (
          <span className={`mt-2 inline-flex w-fit rounded-full bg-[#eef2f8] font-semibold text-[#2c4a73] ${compactOnMobile ? 'px-2 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-[11px]' : 'px-3 py-1 text-[11px]'}`}>
            {product.weight}
          </span>
        )}

        <Link
          to={`/product/${product._id}`}
          className={compactOnMobile ? 'mt-2 block sm:mt-3' : 'mt-3 block'}
          onMouseEnter={preloadProductPage}
          onFocus={preloadProductPage}
          onTouchStart={preloadProductPage}
        >
          <h3 className={`line-clamp-2 font-serif font-bold text-[#081729] transition-colors duration-200 group-hover:text-[#a07c16] ${compactOnMobile ? 'text-base leading-5 sm:text-2xl sm:leading-tight' : 'text-2xl leading-tight'}`}>
            {product.name}
          </h3>
        </Link>

        <div className={`${compactOnMobile ? 'mt-2 sm:mt-3' : 'mt-3'} flex items-center justify-between`}>
          <div className={`flex items-center text-[#c9a227] ${compactOnMobile ? 'min-w-0 flex-wrap' : ''}`}>
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                size={14}
                fill={index < Math.floor(product.rating || 0) ? 'currentColor' : 'none'}
                className={`${compactOnMobile ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : ''} ${
                  index < Math.floor(product.rating || 0) ? 'text-[#c9a227]' : 'text-[#dce4ef]'
                }`}
              />
            ))}
            <span className={`font-semibold text-gray-500 ${compactOnMobile ? 'ml-1 text-[10px] leading-4 sm:ml-2 sm:text-xs' : 'ml-2 text-xs'}`}>
              {product.numReviews || 0} reviews
            </span>
          </div>
        </div>

        <div className={`mt-auto flex flex-col border-t border-[#e6ebf4] ${compactOnMobile ? 'gap-3 pt-3 sm:gap-4 sm:pt-4' : 'gap-4 pt-4'}`}>
          <div>
            {product.compareAtPrice > product.price && (
              <p className={`${compactOnMobile ? 'text-xs sm:text-sm' : 'text-sm'} text-gray-400 line-through`}>
                {formatPrice(product.compareAtPrice)}
              </p>
            )}
            <p className={`break-words font-serif font-bold text-[#081729] ${compactOnMobile ? 'text-xl leading-tight sm:text-3xl sm:leading-tight' : 'text-3xl leading-tight'}`}>
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="flex w-full items-center gap-2">
            <Link
              to={`/product/${product._id}`}
              className={`inline-flex flex-1 items-center justify-center rounded-full border border-[#ccd8e8] font-bold uppercase text-[#2c4a73] transition-colors duration-200 hover:border-[#2c4a73] hover:bg-[#eef2f8] ${compactOnMobile ? 'px-2 py-2 text-[10px] tracking-[0.08em] sm:px-4 sm:text-xs sm:tracking-[0.16em]' : 'px-4 py-2 text-xs tracking-[0.16em]'}`}
            >
              View <ArrowRight size={13} className="ml-1.5 sm:ml-2" />
            </Link>

            {product.countInStock === 0 ? (
              <button
                type="button"
                disabled
                className={`inline-flex flex-1 items-center justify-center rounded-full bg-gray-200 font-bold uppercase text-gray-500 ${compactOnMobile ? 'px-2 py-2 text-[10px] tracking-[0.08em] sm:px-4 sm:text-xs sm:tracking-[0.16em]' : 'px-4 py-2 text-xs tracking-[0.16em]'}`}
              >
                <Lock size={13} className="mr-1.5 sm:mr-2" /> Sold Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`inline-flex flex-1 items-center justify-center rounded-full bg-[#22406b] font-bold uppercase text-white transition-colors duration-200 hover:bg-[#081729] ${compactOnMobile ? 'px-2 py-2 text-[10px] tracking-[0.08em] sm:px-4 sm:text-xs sm:tracking-[0.16em]' : 'px-4 py-2 text-xs tracking-[0.16em]'}`}
              >
                <ShoppingCart size={13} className="mr-1.5 sm:mr-2" /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default Product;

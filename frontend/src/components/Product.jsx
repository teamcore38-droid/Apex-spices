import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  getProductStatusBadge,
  getStockPresentation,
} from '../utils/productUi';

const Product = ({ product, compactOnMobile = false }) => {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const statusBadge = getProductStatusBadge(product);
  const stockBadge = getStockPresentation(product.countInStock);
  const showStockBadge = product.countInStock > 0;
  const stockBadgePosition = compactOnMobile && statusBadge ? 'top-8 sm:top-4' : 'top-2 sm:top-4';

  const handleAddToCart = (event) => {
    event.preventDefault();

    if (product.countInStock > 0) {
      addToCart(product, 1);
      navigate('/cart');
    }
  };

  return (
    <article className={`group flex h-full flex-col overflow-hidden border border-[#dce4ef] bg-white shadow-[0_20px_50px_rgba(11,31,58,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(11,31,58,0.14)] ${compactOnMobile ? 'rounded-[18px] sm:rounded-[28px]' : 'rounded-[28px]'}`}>
      <Link to={`/product/${product._id}`} className="relative block">
        <div className={`relative overflow-hidden bg-[#ecf0f7] ${compactOnMobile ? 'h-36 sm:h-72' : 'h-72'}`}>
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071427]/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          {statusBadge && (
            <span
              className={`absolute inline-flex rounded-full font-bold uppercase shadow-lg ${compactOnMobile ? 'left-2 top-2 max-w-[calc(100%-1rem)] px-2 py-0.5 text-[8px] tracking-[0.08em] sm:left-4 sm:top-4 sm:max-w-none sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.18em]' : 'left-4 top-4 px-3 py-1 text-[11px] tracking-[0.18em]'} ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}

          {showStockBadge && (
            <span
              className={`absolute inline-flex rounded-full border font-bold uppercase ${compactOnMobile ? `right-2 ${stockBadgePosition} max-w-[calc(100%-1rem)] px-2 py-0.5 text-[8px] tracking-[0.08em] sm:right-4 sm:max-w-none sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.18em]` : 'right-4 top-4 px-3 py-1 text-[11px] tracking-[0.18em]'} ${stockBadge.className}`}
            >
              {stockBadge.label}
            </span>
          )}
        </div>
      </Link>

      <div className={`flex flex-1 flex-col ${compactOnMobile ? 'p-3 sm:p-6' : 'p-6'}`}>
        <div className={`flex items-center justify-between ${compactOnMobile ? 'mb-2 flex-wrap gap-1.5 sm:mb-3 sm:gap-3' : 'mb-3 gap-3'}`}>
          <span className={`font-bold uppercase text-[#a07c16] ${compactOnMobile ? 'min-w-0 truncate text-[9px] tracking-[0.14em] sm:text-[11px] sm:tracking-[0.28em]' : 'text-[11px] tracking-[0.28em]'}`}>
            {product.category}
          </span>
          {product.weight && (
            <span className={`shrink-0 rounded-full bg-[#eef2f8] font-semibold text-[#2c4a73] ${compactOnMobile ? 'px-2 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-[11px]' : 'px-3 py-1 text-[11px]'}`}>
              {product.weight}
            </span>
          )}
        </div>

        <Link to={`/product/${product._id}`} className="block">
          <h3 className={`font-serif font-bold text-[#081729] transition-colors duration-200 group-hover:text-[#a07c16] ${compactOnMobile ? 'line-clamp-2 text-base leading-5 sm:line-clamp-none sm:text-2xl sm:leading-normal' : 'text-2xl'}`}>
            {product.name}
          </h3>
        </Link>

        <p className={`line-clamp-2 text-gray-600 ${compactOnMobile ? 'mt-2 text-xs leading-5 sm:mt-3 sm:text-sm sm:leading-7' : 'mt-3 text-sm leading-7'}`}>
          {product.shortDescription || product.description}
        </p>

        <div className={`${compactOnMobile ? 'mt-3 sm:mt-4' : 'mt-4'} flex items-center justify-between`}>
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

        <div className={`flex flex-col border-t border-[#e6ebf4] ${compactOnMobile ? 'mt-4 gap-3 pt-4 sm:mt-6 sm:gap-4 sm:pt-5' : 'mt-6 gap-4 pt-5'}`}>
          <div>
            {product.compareAtPrice > product.price && (
              <p className={`${compactOnMobile ? 'text-xs sm:text-sm' : 'text-sm'} text-gray-400 line-through`}>
                {formatPrice(product.compareAtPrice)}
              </p>
            )}
            <p className={`break-words font-serif font-bold text-[#081729] ${compactOnMobile ? 'text-xl leading-tight sm:text-3xl sm:leading-normal' : 'text-3xl'}`}>
              {formatPrice(product.price)}
            </p>
          </div>

          <div className={`flex w-full items-stretch gap-2 ${compactOnMobile ? 'flex-col sm:flex-row sm:items-center' : 'items-center'}`}>
            <Link
              to={`/product/${product._id}`}
              className={`inline-flex flex-1 items-center justify-center rounded-full border border-[#ccd8e8] font-bold uppercase text-[#2c4a73] transition-colors duration-200 hover:border-[#2c4a73] hover:bg-[#eef2f8] ${compactOnMobile ? 'px-3 py-2 text-[10px] tracking-[0.08em] sm:px-4 sm:text-xs sm:tracking-[0.16em]' : 'px-4 py-2 text-xs tracking-[0.16em]'}`}
            >
              View <ArrowRight size={13} className="ml-2" />
            </Link>

            {product.countInStock === 0 ? (
              <button
                type="button"
                disabled
                className={`inline-flex flex-1 items-center justify-center rounded-full bg-gray-200 font-bold uppercase text-gray-500 ${compactOnMobile ? 'px-3 py-2 text-[10px] tracking-[0.08em] sm:px-4 sm:text-xs sm:tracking-[0.16em]' : 'px-4 py-2 text-xs tracking-[0.16em]'}`}
              >
                <Lock size={13} className="mr-2" /> Sold Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`inline-flex flex-1 items-center justify-center rounded-full bg-[#22406b] font-bold uppercase text-white transition-colors duration-200 hover:bg-[#081729] ${compactOnMobile ? 'px-3 py-2 text-[10px] tracking-[0.08em] sm:px-4 sm:text-xs sm:tracking-[0.16em]' : 'px-4 py-2 text-xs tracking-[0.16em]'}`}
              >
                <ShoppingCart size={13} className="mr-2" /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default Product;

/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { getMarketingSessionId, trackEvent } from '../utils/analytics';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const localData = localStorage.getItem('cartItems');
    return localData ? JSON.parse(localData) : [];
  });
  
  const [shippingAddress, setShippingAddress] = useState(() => {
    const localData = localStorage.getItem('shippingAddress');
    return localData ? JSON.parse(localData) : {};
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));

    const timer = window.setTimeout(() => {
      const subtotal = cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0);

      axios
        .post(
          '/api/marketing/abandoned-cart',
          {
            sessionId: getMarketingSessionId(),
            items: cartItems,
            subtotal,
            currency: 'LKR',
            checkoutUrl: `${window.location.origin}/checkout`,
          },
          {
            headers: { 'x-session-id': getMarketingSessionId() },
          }
        )
        .catch((error) => {
          if (import.meta.env.DEV) console.error(error);
        });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
  }, [shippingAddress]);

  const addToCart = (product, qty) => {
    const productId = product._id || product.product;
    const isCustom = Boolean(product.isCustomQuantity);
    const variantId = isCustom
      ? `custom-${product.customQuantity}${product.customUnit}`
      : (product.variantId || '');

    trackEvent('add_to_cart', {
      productId,
      name: product.name,
      price: product.price,
      quantity: qty,
      variantId,
      value: Number(product.price || 0) * Number(qty || 0),
      currency: 'LKR',
    });

    setCartItems((prev) => {
      const existItem = prev.find(
        (x) => x.product === productId && (x.variantId || '') === variantId
      );
      if (existItem) {
        return prev.map((x) =>
          x.product === productId && (x.variantId || '') === variantId
            ? {
                ...x,
                price: product.price,
                qty,
                isCustomQuantity: isCustom,
                customQuantity: product.customQuantity,
                customUnit: product.customUnit,
                customQuantityFormatted: product.customQuantityFormatted,
                unitPrice: product.unitPrice,
                variantLabel: product.variantLabel || x.variantLabel,
              }
            : x
        );
      }
      return [
        ...prev,
        {
          product: productId,
          name: product.name,
          image: product.image,
          price: product.price,
          variantId,
          variantLabel: product.variantLabel || '',
          sku: product.sku || '',
          countInStock: product.countInStock,
          isCustomQuantity: isCustom,
          customQuantity: product.customQuantity,
          customUnit: product.customUnit,
          customQuantityFormatted: product.customQuantityFormatted,
          unitPrice: product.unitPrice,
          qty,
        },
      ];
    });
  };

  const removeFromCart = (id, variantId = '') => {
    const item = cartItems.find(
      (cartItem) => cartItem.product === id && (!variantId || cartItem.variantId === variantId)
    );
    if (item) {
      trackEvent('remove_from_cart', {
        productId: item.product,
        name: item.name,
        value: Number(item.price || 0) * Number(item.qty || 0),
        currency: 'LKR',
      });
    }

    setCartItems((prev) =>
      prev.filter(
        (x) => !(x.product === id && (!variantId || (x.variantId || '') === (variantId || '')))
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const saveShippingAddress = (data) => {
    setShippingAddress(data);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, shippingAddress, saveShippingAddress }}>
      {children}
    </CartContext.Provider>
  );
};

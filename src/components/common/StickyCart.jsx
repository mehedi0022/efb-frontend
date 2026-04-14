"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  FiShoppingCart,
  FiX,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiShoppingBag,
} from "react-icons/fi";
import { useCart } from "../../legacy/context/CartContext";
import {
  useDeleteCartItemMutation,
  useGetCartQuery,
  useUpdateCartItemMutation,
} from "../../legacy/store/publicApi";
import { resolveMediaUrl } from "../../legacy/utils/media";
import { showConfirmAlert } from "../../legacy/admin/utils/alerts";

const parseMoney = (value, fallback = 0) => {
  const parsed = Number(
    String(value ?? "")
      .replace(/[\s,]/g, "")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-BD").format(Math.round(amount));
};

const resolveCartItemImage = (item) => {
  const featureImage =
    typeof item?.product?.feature_image === "string"
      ? item.product.feature_image
      : item?.product?.feature_image?.image;

  const candidates = [
    item?.product_image,
    item?.options?.product_image,
    item?.product?.image?.image,
    featureImage,
    item?.product?.thumbnail,
    item?.product?.image,
  ];

  const image = candidates.find((value) => String(value || "").trim() !== "");
  return resolveMediaUrl(image, "https://placehold.co/80x80?text=Product");
};

const StickyCart = () => {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef(null);

  const { refreshCart } = useCart();
  const { data: cart, isLoading, isFetching } = useGetCartQuery();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [deleteCartItem] = useDeleteCartItemMutation();

  const items = cart?.items || [];
  const cartCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = items.reduce(
    (acc, item) => acc + parseMoney(item.price) * item.quantity,
    0,
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) return;
    try {
      await updateCartItem({ id: itemId, quantity: newQty }).unwrap();
      refreshCart();
    } catch {
      alert("Failed to update quantity");
    }
  };

  const removeItem = async (itemId) => {
    const confirmed = await showConfirmAlert({
      title: "Remove Item",
      content: "Are you sure you want to remove this product from your cart?",
      okText: "Yes, Remove",
      cancelText: "Keep Item",
      okType: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteCartItem(itemId).unwrap();
      refreshCart();
    } catch {
      alert("Failed to remove item");
    }
  };

  const goTo = (path) => {
    setIsOpen(false);
    window.location.href = path;
  };

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        aria-label="Open cart"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center text-white shadow-xl transition-all duration-200 min-w-[72px] rounded-l-lg cursor-pointer">
        <div className="bg-[var(--frontend-btn-primary-bg)] w-full items-center justify-center flex flex-col p-3 rounded-tl-lg">
          <FiShoppingCart size={26} />
          <span className="text-[13px] leading-tight">
            {cartCount} {cartCount === 1 ? " Item" : " Items"}
          </span>
        </div>

        <div className="w-full border-t border-orange-400" />

        <div className="w-full bg-white text-center rounded-bl-lg">
          <span className="text-[13px] font-bold leading-tight text-orange-500 text-center">
            ৳{formatMoney(subtotal)}
          </span>
        </div>
      </div>

      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
          isOpen
            ? "opacity-40 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiShoppingCart className="text-orange-500" size={20} />
            <h2 className="text-base font-bold text-gray-900">Your Cart</h2>
            {cartCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold">
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition">
            <FiX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center h-full py-20">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-20">
              <FiShoppingBag size={48} className="text-gray-200" />
              <p className="text-sm font-medium text-gray-500">
                Your cart is empty
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-2 px-4 py-2 rounded-lg bg-[var(--frontend-btn-primary-bg)] text-white text-sm font-semibold hover:bg-[var(--frontend-btn-primary-hover)] transition">
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => {
              const itemPrice = parseMoney(item.price);
              const lineTotal = itemPrice * item.quantity;
              const name = item.product_name || item.product?.name || "Product";
              const image = resolveCartItemImage(item);

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <img
                    src={image}
                    alt={name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
                      {name}
                    </p>
                    {(item.options?.size || item.options?.color) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.options?.size && `Size: ${item.options.size}`}
                        {item.options?.color &&
                          `, Color: ${item.options.color}`}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-bold text-orange-500">
                      ৳{formatMoney(lineTotal)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        <FiMinus size={12} />
                      </button>
                      <span className="text-sm font-semibold text-gray-800 w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-200 transition">
                        <FiPlus size={12} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0 mt-0.5">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-100 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">
                Subtotal
              </span>
              <span className="text-lg font-bold text-gray-900">
                ৳{formatMoney(subtotal)}
              </span>
            </div>

            <button
              onClick={() => goTo("/checkout")}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--frontend-btn-primary-bg)] text-white text-sm font-bold hover:bg-[var(--frontend-btn-primary-hover)] transition">
              <FiShoppingBag size={16} />
              Proceed to Checkout
            </button>

            <button
              onClick={() => goTo("/cart")}
              className="flex items-center justify-center w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition">
              View Full Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default StickyCart;

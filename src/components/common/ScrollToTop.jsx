"use client";

import React, { useState, useEffect } from "react";
import { FiArrowUp } from "react-icons/fi";

const ScrollToTop = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      setScrollProgress(progress);
      setIsVisible(scrollTop > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const strokeDashoffset =
    circumference - (scrollProgress / 100) * circumference;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="flex fixed bottom-20 md:bottom-6 right-4 z-50  items-center justify-center hover:scale-110 transition-transform duration-200"
      style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute top-0 left-0 -rotate-90"
        style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--frontend-btn-secondary-bg)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s ease" }}
        />
      </svg>

      <span className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-[var(--frontend-btn-primary-bg)] hover:bg-[var(--frontend-btn-primary-hover)] text-white shadow-md">
        <FiArrowUp size={16} />
      </span>
    </button>
  );
};

export default ScrollToTop;

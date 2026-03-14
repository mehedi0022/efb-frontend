import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RouteTransitionLoader from "@/components/common/RouteTransitionLoader";
import { trackFacebookPageView } from "../utils/facebookPixel";

const MainLayout = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const timeoutId = window.setTimeout(() => {
      trackFacebookPageView();
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.search]);

  return (
    <div className="flex flex-col min-h-screen">
      <RouteTransitionLoader />
      <Header />
      <main className="flex-grow pb-20 md:pb-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;

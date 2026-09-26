import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainScroll = document.querySelector(
      "[data-main-scroll]"
    );

    mainScroll?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;

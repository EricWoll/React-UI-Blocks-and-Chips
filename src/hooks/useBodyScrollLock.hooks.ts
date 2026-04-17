"use client";

import { useLayoutEffect } from "react";

export function useBodyScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [locked]);
};
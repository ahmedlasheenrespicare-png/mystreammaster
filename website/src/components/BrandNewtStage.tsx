import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./brand-newt35.css";

const EN_FIRST: ReadonlyArray<readonly [string, number, number, number, number]> = [
  ["S", -76, -38, -12, 0.1],
  ["T", -48, 42, 8, 0.16],
  ["R", -28, -50, -6, 0.21],
  ["E", 14, 46, 10, 0.26],
  ["A", -18, -34, -8, 0.31],
  ["M", 32, 38, 7, 0.36],
];

const EN_SECOND: ReadonlyArray<readonly [string, number, number, number, number]> = [
  ["M", -32, 40, -7, 0.41],
  ["A", 24, -44, 9, 0.46],
  ["S", -14, 48, -9, 0.51],
  ["T", 42, -36, 6, 0.56],
  ["E", 62, 40, -10, 0.61],
  ["R", 86, -40, 12, 0.66],
];

const vecStyle = (x: number, y: number, r: number, d: number): CSSProperties =>
  ({
    "--x": `${x}px`,
    "--y": `${y}px`,
    "--r": `${r}deg`,
    "--d": `${d}s`,
  }) as CSSProperties;

export interface BrandNewtStageProps {
  variant: "splash" | "player-banner" | "player-idle" | "cta";
  hold?: boolean;
  observeViewport?: boolean;
  showCaption?: boolean;
  className?: string;
}

export function BrandNewtStage({
  variant,
  hold = false,
  observeViewport = false,
  showCaption = true,
  className = "",
}: BrandNewtStageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(!observeViewport);

  useEffect(() => {
    if (!observeViewport) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [observeViewport]);

  return (
    <div
      ref={rootRef}
      data-newt35-stage={variant}
      aria-hidden="true"
      className={`sm-newt35 sm-newt35--${variant}${hold ? " sm-newt35--hold" : ""}${
        !inView ? " sm-newt35--paused" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <div className="sm-newt35__glow" />
      <div className="sm-newt35__noise" />
      <div className="sm-newt35__dust" />
      <div className="sm-newt35__doodles">
        <div className="sm-newt35__doodle sm-newt35__doodle--spark sm-newt35__d1" />
        <div className="sm-newt35__doodle sm-newt35__doodle--scratch sm-newt35__d2" />
        <div className="sm-newt35__doodle sm-newt35__doodle--dot sm-newt35__d3" />
        <div className="sm-newt35__doodle sm-newt35__doodle--spark sm-newt35__d4" />
        <div className="sm-newt35__doodle sm-newt35__doodle--dot sm-newt35__d5" />
        <div className="sm-newt35__doodle sm-newt35__doodle--scratch sm-newt35__d6" />
      </div>

      <div className="sm-newt35__stage">
        <div className="sm-newt35__line sm-newt35__line--top">
          <div className="sm-newt35__line-inner" />
        </div>

        <div className="sm-newt35__ar-row" dir="rtl">
          <div className="sm-newt35__ar-word">
            <span className="sm-newt35__piece" style={vecStyle(88, -50, 11, 0.05)}>
              <span className="sm-newt35__tile">
                <sup className="sm-newt35__sup">4K</sup>
                <span className="sm-newt35__sym">ست</span>
              </span>
            </span>
            <span
              className="sm-newt35__piece sm-newt35__rest"
              data-word="ريم"
              style={vecStyle(36, 52, -7, 0.16)}
            >
              ريم
            </span>
          </div>

          <div className="sm-newt35__ar-word">
            <span className="sm-newt35__piece" style={vecStyle(-42, -56, -10, 0.26)}>
              <span className="sm-newt35__tile">
                <sup className="sm-newt35__sup">99</sup>
                <span className="sm-newt35__sym">ما</span>
              </span>
            </span>
            <span
              className="sm-newt35__piece sm-newt35__rest"
              data-word="ستر"
              style={vecStyle(-88, 48, 9, 0.36)}
            >
              ستر
            </span>
          </div>
        </div>

        <div className="sm-newt35__en-row" dir="ltr">
          {EN_FIRST.map(([ch, x, y, r, d], idx) => (
            <span
              key={`f-${idx}`}
              className="sm-newt35__letter"
              data-char={ch}
              style={vecStyle(x, y, r, d)}
            >
              {ch}
            </span>
          ))}
          <span className="sm-newt35__en-gap" />
          {EN_SECOND.map(([ch, x, y, r, d], idx) => (
            <span
              key={`s-${idx}`}
              className="sm-newt35__letter"
              data-char={ch}
              style={vecStyle(x, y, r, d)}
            >
              {ch}
            </span>
          ))}
        </div>

        <div className="sm-newt35__line sm-newt35__line--bottom">
          <div className="sm-newt35__line-inner" />
        </div>

        {showCaption && (
          <div className="sm-newt35__caption" dir="rtl">
            ثبات <bdi>99.9%</bdi> &nbsp;•&nbsp; <bdi>4K ULTRA HD</bdi> &nbsp;•&nbsp;{" "}
            <bdi>PRO EDITION</bdi>
          </div>
        )}
      </div>
    </div>
  );
}

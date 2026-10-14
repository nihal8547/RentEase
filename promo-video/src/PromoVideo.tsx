import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import React from "react";

const MAROON = "#6d1b32";
const GOLD = "#d4af37";
const SAND = "#f8f5f0";

const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame,
    config: { damping: 12 },
  });
  
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity }}>
        <Img src={staticFile("logo.svg")} style={{ width: 400, height: 400 }} />
      </div>
    </AbsoluteFill>
  );
};

const BrandIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSlide = spring({
    fps,
    frame: frame - 10,
    config: { damping: 14 },
  });

  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", color: GOLD, fontFamily: "sans-serif" }}>
      <h1
        style={{
          fontSize: 140,
          fontWeight: "bold",
          margin: 0,
          transform: `translateY(${interpolate(titleSlide, [0, 1], [200, 0])}px)`,
          opacity: titleSlide,
        }}
      >
        RentEase
      </h1>
      <p style={{ fontSize: 60, marginTop: 20, color: SAND, opacity: subtitleOpacity }}>
        Qatar's Premier PropTech SaaS
      </p>
    </AbsoluteFill>
  );
};

const KeyFeatures: React.FC = () => {
  const frame = useCurrentFrame();

  const features = ["Enterprise RBAC", "Tawtheeq Integration", "PDC Vault", "Owner Payouts"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "sans-serif", color: SAND }}>
      <h2 style={{ fontSize: 80, marginBottom: 60, color: GOLD }}>Key Platform Features</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, alignItems: "center" }}>
        {features.map((feature, i) => {
          const delay = i * 15;
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
          const translateY = interpolate(frame, [delay, delay + 15], [50, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

          return (
            <div key={feature} style={{ fontSize: 50, fontWeight: "bold", opacity, transform: `translateY(${translateY}px)` }}>
              ✓ {feature}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: "sans-serif" }}>
      <div style={{ opacity, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img src={staticFile("logo.svg")} style={{ width: 250, height: 250, marginBottom: 40 }} />
        <h2 style={{ fontSize: 70, color: GOLD, margin: 0 }}>Modernize your real estate operations.</h2>
      </div>
    </AbsoluteFill>
  );
};

export const PromoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: MAROON }}>
      <Sequence from={0} durationInFrames={fps * 3}>
        <LogoReveal />
      </Sequence>
      
      <Sequence from={fps * 3} durationInFrames={fps * 3}>
        <BrandIntro />
      </Sequence>
      
      <Sequence from={fps * 6} durationInFrames={fps * 3}>
        <KeyFeatures />
      </Sequence>

      <Sequence from={fps * 9} durationInFrames={fps * 3}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
